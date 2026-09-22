"""TwinProp-DX Phase 5 Mission Replay & Historical Analysis Service.

PROTOTYPE / ACADEMIC DISCLAIMER:
Provides Flight Data Recorder (FDR) chronological mission replay and multi-subsystem
synchronization for the Rotax 914 F powertrain on MALE UAV airframes.
Replays only authentic telemetry and fault logs stored in the database.
Flags data provenance as RECORDED_TELEMETRY vs SIMULATED_INJECTION.
Advisory engineering prototype.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.mission import Mission
from app.models.telemetry import Telemetry
from app.models.fault import FaultLog
from app.schemas.replay import (
    ReplayTelemetry,
    ReplayFaultEvent,
    ReplayFaultMarker,
    ReplayDigitalTwinSummary,
    ReplayRULSummary,
    ReplayFrame,
    MissionSummary,
    MissionReplayPackage,
    ReplayMissionListItem,
)
from app.services.digital_twin_service import evaluate_digital_twin_model
from app.services.rul_service import estimate_remaining_useful_life

def _telemetry_to_dict(rec: Telemetry) -> Dict[str, Any]:
    return {
        "rpm": float(rec.rpm or 0.0),
        "cht": float(rec.cht or 0.0),
        "egt": float(rec.egt or 0.0),
        "oil_pressure": float(rec.oil_pressure or 0.0),
        "oil_temperature": float(rec.oil_temperature or 0.0),
        "fuel_flow": float(rec.fuel_flow or 0.0),
        "vibration": float(rec.vibration or 0.0),
        "throttle": float(rec.throttle or 0.0),
        "ambient_temperature": float(rec.ambient_temperature or 15.0),
        "altitude": float(rec.altitude or 0.0),
        "battery_voltage": float(rec.battery_voltage or 28.0),
    }

def _get_mission_telemetry_records(mission: Mission, db: Session) -> List[Telemetry]:
    """Retrieve telemetry records for a mission in chronological order, respecting start/end window."""
    query = db.query(Telemetry).filter(Telemetry.engine_id == mission.engine_id)
    if mission.start_time and mission.end_time:
        return query.filter(
            Telemetry.timestamp >= mission.start_time,
            Telemetry.timestamp <= mission.end_time
        ).order_by(Telemetry.timestamp.asc()).all()
    elif mission.start_time:
        return query.filter(
            Telemetry.timestamp >= mission.start_time
        ).order_by(Telemetry.timestamp.asc()).all()
    return query.order_by(Telemetry.timestamp.asc()).all()

def get_replay_missions_list(db: Session) -> List[ReplayMissionListItem]:
    """Retrieve all missions with their telemetry frame counts and fault markers for GCS selection."""
    missions = db.query(Mission).order_by(Mission.created_at.desc()).all()
    items: List[ReplayMissionListItem] = []

    for m in missions:
        records = _get_mission_telemetry_records(m, db)
        t_count = len(records)
        
        f_query = db.query(FaultLog).filter(FaultLog.engine_id == m.engine_id)
        if m.start_time and m.end_time:
            f_count = f_query.filter(
                FaultLog.timestamp >= m.start_time,
                FaultLog.timestamp <= m.end_time
            ).count()
        elif m.start_time:
            f_count = f_query.filter(
                FaultLog.timestamp >= m.start_time
            ).count()
        elif records:
            f_count = f_query.filter(
                FaultLog.timestamp >= records[0].timestamp,
                FaultLog.timestamp <= records[-1].timestamp
            ).count()
        else:
            f_count = 0

        items.append(
            ReplayMissionListItem(
                mission_id=m.mission_id,
                engine_id=m.engine_id,
                mission_type=m.mission_type,
                status=m.status,
                start_time=m.start_time,
                end_time=m.end_time,
                altitude=m.altitude,
                payload=m.payload,
                telemetry_count=t_count,
                fault_count=f_count,
            )
        )
    return items

def get_mission_replay_package(mission_id: str, db: Session) -> MissionReplayPackage:
    """Build a complete, chronological Flight Data Recorder replay package for a mission."""
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        # Fallback query by ID if provided as numeric string
        if mission_id.isdigit():
            mission = db.query(Mission).filter(Mission.id == int(mission_id)).first()
    if not mission:
        raise ValueError(f"Mission '{mission_id}' not found in registry.")

    engine_id = mission.engine_id

    # Retrieve telemetry records in chronological order using shared mission window logic
    records = _get_mission_telemetry_records(mission, db)

    # Retrieve all fault logs for this engine
    fault_logs = (
        db.query(FaultLog)
        .filter(FaultLog.engine_id == engine_id)
        .order_by(FaultLog.timestamp.asc())
        .all()
    )

    if not records:
        # Return empty shell if no telemetry has been recorded yet
        now = datetime.now(timezone.utc)
        return MissionReplayPackage(
            mission_id=mission.mission_id,
            engine_id=engine_id,
            mission_type=mission.mission_type,
            status=mission.status,
            start_time=mission.start_time or now,
            end_time=mission.end_time or now,
            altitude=mission.altitude or 0.0,
            payload=mission.payload or "Unspecified",
            environment=mission.environment or "Standard ISA",
            summary=MissionSummary(
                total_frames=0,
                flight_duration_seconds=0.0,
                recorded_frames_count=0,
                simulated_frames_count=0,
                total_fault_events=0,
                peak_rpm=0.0,
                peak_cht=0.0,
                peak_egt=0.0,
                min_oil_pressure=0.0,
                peak_altitude=0.0,
            ),
            fault_markers=[],
            frames=[],
        )

    t0 = records[0].timestamp
    frames: List[ReplayFrame] = []
    fault_markers: List[ReplayFaultMarker] = []

    # Sortie summary trackers
    peak_rpm = 0.0
    peak_cht = 0.0
    peak_egt = 0.0
    min_oil_p = 99.0
    peak_alt = 0.0
    recorded_cnt = 0
    simulated_cnt = 0

    for idx, rec in enumerate(records):
        t_dict = _telemetry_to_dict(rec)
        t_stamp = rec.timestamp
        elapsed = max(0.0, (t_stamp - t0).total_seconds())

        # Update summary statistics
        peak_rpm = max(peak_rpm, t_dict["rpm"])
        peak_cht = max(peak_cht, t_dict["cht"])
        peak_egt = max(peak_egt, t_dict["egt"])
        if t_dict["rpm"] > 500.0:
            min_oil_p = min(min_oil_p, t_dict["oil_pressure"])
        peak_alt = max(peak_alt, t_dict["altitude"])

        # Correlate fault logs within +/- 3.5 seconds
        matched_fault: Optional[FaultLog] = None
        for f in fault_logs:
            time_diff = abs((f.timestamp - t_stamp).total_seconds())
            if time_diff <= 3.5:
                matched_fault = f
                break

        # Provenance determination
        is_sim = False
        if matched_fault and matched_fault.is_simulated:
            is_sim = True
        elif t_dict["throttle"] > 85.0 and t_dict["rpm"] < 4750.0:
            # Matches simulated turbo boost leak pattern
            is_sim = True

        if is_sim:
            simulated_cnt += 1
            origin = "SIMULATED_INJECTION"
        else:
            recorded_cnt += 1
            origin = "RECORDED_TELEMETRY"

        # Frame Fault Event (if any)
        fault_event: Optional[ReplayFaultEvent] = None
        if matched_fault:
            fault_event = ReplayFaultEvent(
                id=matched_fault.id,
                fault_code=matched_fault.fault_code,
                fault_type=matched_fault.fault_type,
                severity=matched_fault.severity,
                description=matched_fault.description,
                anomaly_score=matched_fault.anomaly_score,
                confidence=matched_fault.confidence,
                root_cause=matched_fault.root_cause,
                recommended_action=matched_fault.recommended_action,
                is_acknowledged=matched_fault.is_acknowledged,
                is_simulated=matched_fault.is_simulated,
            )
            # Add to timeline markers list if not already pinned nearby
            if not any(abs(m.frame_index - idx) < 2 for m in fault_markers):
                fault_markers.append(
                    ReplayFaultMarker(
                        frame_index=idx,
                        timestamp=t_stamp,
                        elapsed_seconds=elapsed,
                        fault_code=matched_fault.fault_code,
                        fault_type=matched_fault.fault_type,
                        severity=matched_fault.severity,
                        is_simulated=matched_fault.is_simulated,
                    )
                )

        # Evaluate synchronized Phase 2 Digital Twin state
        twin_res = evaluate_digital_twin_model(engine_id, t_dict, t_stamp)
        twin_summary = ReplayDigitalTwinSummary(
            power_kw=twin_res.thermodynamics.power_kw,
            power_hp=twin_res.thermodynamics.power_hp,
            torque_nm=twin_res.thermodynamics.torque_nm,
            bsfc_g_kwh=twin_res.thermodynamics.bsfc_g_kwh,
            thermal_efficiency_pct=twin_res.thermodynamics.thermal_efficiency_pct,
            operating_regime=twin_res.operating_regime,
            map_bar=twin_res.turbocharger.map_bar,
            map_inhg=twin_res.turbocharger.map_inhg,
            wastegate_position_pct=twin_res.turbocharger.wastegate_position_pct,
            pressure_ratio=twin_res.turbocharger.pressure_ratio,
            tcu_state=twin_res.turbocharger.tcu_state,
            core_health=twin_res.subsystems.core_health,
            turbo_health=twin_res.subsystems.turbo_health,
            lubrication_health=twin_res.subsystems.lubrication_health,
            cooling_health=twin_res.subsystems.cooling_health,
            cht_thermal_headroom_c=twin_res.subsystems.cht_thermal_headroom_c,
            twin_fidelity_score=twin_res.twin_fidelity_score,
        )

        # Evaluate synchronized Phase 4 RUL prognostic state
        rul_res = estimate_remaining_useful_life(
            engine_id,
            t_dict,
            fault_logs[:10],
            telemetry_records_count=idx + 1,
            timestamp=t_stamp
        )
        rul_summary = ReplayRULSummary(
            prognostic_status=rul_res.prognostic_status,
            estimated_rul_hours=rul_res.estimated_rul_hours,
            confidence_interval_90_lower=rul_res.confidence_interval_90_lower,
            confidence_interval_90_upper=rul_res.confidence_interval_90_upper,
            prognostic_confidence=rul_res.prognostic_confidence,
            damage_rate_multiplier=rul_res.damage_rate_multiplier,
            cylinder_valves_wear_pct=rul_res.subsystem_wear.cylinder_valves_wear_pct,
            turbocharger_wear_pct=rul_res.subsystem_wear.turbocharger_actuator_wear_pct,
            dominant_degrading_subsystem=rul_res.subsystem_wear.dominant_degrading_subsystem,
        )

        frames.append(
            ReplayFrame(
                frame_index=idx,
                timestamp=t_stamp,
                elapsed_seconds=elapsed,
                origin=origin,
                is_simulated=is_sim,
                telemetry=ReplayTelemetry(
                    rpm=t_dict["rpm"],
                    cht=t_dict["cht"],
                    egt=t_dict["egt"],
                    oil_pressure=t_dict["oil_pressure"],
                    oil_temperature=t_dict["oil_temperature"],
                    fuel_flow=t_dict["fuel_flow"],
                    vibration=t_dict["vibration"],
                    throttle=t_dict["throttle"],
                    ambient_temperature=t_dict["ambient_temperature"],
                    altitude=t_dict["altitude"],
                    battery_voltage=t_dict["battery_voltage"],
                ),
                digital_twin=twin_summary,
                rul_state=rul_summary,
                fault=fault_event,
            )
        )

    flight_duration = max(0.0, (records[-1].timestamp - records[0].timestamp).total_seconds())

    summary = MissionSummary(
        total_frames=len(frames),
        flight_duration_seconds=round(flight_duration, 1),
        recorded_frames_count=recorded_cnt,
        simulated_frames_count=simulated_cnt,
        total_fault_events=len(fault_markers),
        peak_rpm=round(peak_rpm, 1),
        peak_cht=round(peak_cht, 1),
        peak_egt=round(peak_egt, 1),
        min_oil_pressure=round(min_oil_p if min_oil_p < 90.0 else 0.0, 2),
        peak_altitude=round(peak_alt, 1),
    )

    return MissionReplayPackage(
        mission_id=mission.mission_id,
        engine_id=engine_id,
        mission_type=mission.mission_type,
        status=mission.status,
        start_time=mission.start_time or records[0].timestamp,
        end_time=mission.end_time or records[-1].timestamp,
        altitude=mission.altitude or peak_alt,
        payload=mission.payload or "Standard Sensor Pod",
        environment=mission.environment or "Standard ISA Atmosphere",
        summary=summary,
        fault_markers=fault_markers,
        frames=frames,
    )
