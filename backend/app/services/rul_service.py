"""TwinProp-DX Phase 4 Remaining Useful Life (RUL) & Prognostic Service.

PROTOTYPE / ACADEMIC DISCLAIMER:
This module provides a prototype physics-informed and condition-based prognostic
health management (PHM) estimation framework for the Rotax 914 F aero-piston engine.
All equations, damage rate multipliers, and estimated RUL values represent academic
engineering approximations and reference assumptions.
MANDATORY AIRWORTHINESS NOTICE:
This system is an advisory tool for tactical mission planning and predictive maintenance.
It does NOT override, replace, or determine certified Rotax OEM, FAA, or EASA airworthiness
limitations, mandatory scheduled inspections (e.g. 100-hour / 500-hour), or official
Time Between Overhaul (TBO = 2,000 hours) airworthiness directives.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
import math

from app.schemas.rul import (
    SubsystemWear,
    MaintenanceMilestones,
    RULStateResponse,
    RULTrajectoryPoint,
    RULTrajectoryResponse,
    StressMultipliers,
)
from app.services.digital_twin_service import evaluate_digital_twin_model

# Documented Rotax 914 F reference maintenance baseline intervals
TBO_REFERENCE_HOURS = 2000.0          # OEM Reference Time Between Overhaul
INSPECTION_MINOR_HOURS = 100.0        # Minor line inspection interval
INSPECTION_INTERMEDIATE_HOURS = 500.0  # Intermediate borescope / valve interval
ASSUMED_INITIAL_HOURS = 142.5         # Assumed prototype baseline; replace with verified accumulated engine hours when available

def calculate_stress_multipliers(
    telemetry: Dict[str, Any],
    twin_state: Any,
    active_faults_count: int,
    has_critical_fault: bool
) -> StressMultipliers:
    """Calculate physics-informed damage acceleration stress factors across engine subsystems."""
    rpm = float(telemetry.get("rpm") or 0.0)
    cht = float(telemetry.get("cht") or 0.0)
    egt = float(telemetry.get("egt") or 0.0)
    oil_p = float(telemetry.get("oil_pressure") or 0.0)
    oil_t = float(telemetry.get("oil_temperature") or 0.0)
    vib = float(telemetry.get("vibration") or 0.0)
    thr = float(telemetry.get("throttle") or 0.0)

    if rpm <= 500.0:
        return StressMultipliers(
            thermal=0.1,
            mechanical=0.0,
            turbo_boost=0.0,
            lubrication=0.1,
            active_faults=1.0,
            composite_damage_rate=0.0,
        )

    # 1. Thermal Stress Factor (Arrhenius-style acceleration when CHT > 115°C or EGT > 830°C)
    if cht <= 115.0:
        k_thermal = 1.0
    elif cht <= 135.0:
        # Accelerated aging curve
        k_thermal = 1.0 + 1.6 * math.pow((cht - 115.0) / 20.0, 2)
    else:
        # Over-temperature excursion
        k_thermal = 2.6 + 2.0 * ((cht - 135.0) / 10.0)
    if egt > 835.0:
        k_thermal += 0.4 * ((egt - 835.0) / 35.0)
    k_thermal = round(min(5.0, max(0.8, k_thermal)), 2)

    # 2. Mechanical Fatigue Factor (Cyclic RPM and torsional vibration RMS)
    rpm_factor = math.pow(rpm / 5500.0, 3)
    vib_penalty = 1.0 + max(0.0, (vib - 8.0) / 6.0)
    k_mech = round(min(4.0, max(0.7, rpm_factor * vib_penalty)), 2)

    # 3. Turbocharger Boost Stress Factor (Sustained overboost above 1.15 bar)
    map_bar = twin_state.turbocharger.map_bar if twin_state else 1.0
    if map_bar <= 1.15:
        k_boost = 1.0
    else:
        # Operating in max continuous or takeoff overboost
        k_boost = 1.0 + 2.2 * ((map_bar - 1.15) / 0.20)
    if thr > 95.0:
        k_boost += 0.5
    k_boost = round(min(4.5, max(0.8, k_boost)), 2)

    # 4. Lubrication Breakdown & Hydrodynamic Friction
    film_stability = twin_state.subsystems.oil_film_stability_index if twin_state else 1.0
    k_lube = 1.0
    if film_stability < 0.85:
        k_lube += (0.85 - film_stability) * 3.5
    if oil_t > 102.0:
        k_lube += ((oil_t - 102.0) / 10.0) * 0.8
    if oil_p < 2.5:
        k_lube += (2.5 - oil_p) * 1.2
    k_lube = round(min(4.0, max(0.8, k_lube)), 2)

    # 5. Active Fault Multiplier
    if has_critical_fault:
        k_fault = 2.8
    elif active_faults_count > 0:
        k_fault = 1.45
    else:
        k_fault = 1.0

    # Composite Damage Accumulation Rate (relative to nominal 1.0x cruise)
    composite = round(
        min(6.0, max(0.2, (0.30 * k_thermal + 0.25 * k_mech + 0.25 * k_boost + 0.20 * k_lube) * k_fault)),
        2
    )

    return StressMultipliers(
        thermal=k_thermal,
        mechanical=k_mech,
        turbo_boost=k_boost,
        lubrication=k_lube,
        active_faults=k_fault,
        composite_damage_rate=composite,
    )

def estimate_remaining_useful_life(
    engine_id: str,
    latest_telemetry: Dict[str, Any],
    recent_faults: List[Any],
    telemetry_records_count: int = 1,
    timestamp: Optional[datetime] = None,
) -> RULStateResponse:
    """Core physics-informed Remaining Useful Life estimation pipeline."""
    eval_time = timestamp or datetime.now(timezone.utc)

    # 1. Run Phase 2 Digital Twin model for baseline subsystem metrics
    twin = evaluate_digital_twin_model(engine_id, latest_telemetry, eval_time)

    # 2. Check active faults from fault logs
    active_fault_window = timedelta(seconds=20)
    unacknowledged = [
        f for f in recent_faults
        if not getattr(f, "is_acknowledged", False)
        and getattr(f, "timestamp", eval_time) >= eval_time - active_fault_window
    ]
    has_critical = any(getattr(f, "severity", "") == "CRITICAL" for f in unacknowledged)
    active_count = len(unacknowledged)

    # 3. Calculate stress multipliers
    stress = calculate_stress_multipliers(
        latest_telemetry,
        twin,
        active_faults_count=active_count,
        has_critical_fault=has_critical
    )

    # 4. Determine cumulative operating hours and wear accumulation
    # Telemetry duration plus initial assumed logged airframe hours
    accumulated_hours = ASSUMED_INITIAL_HOURS + min(50.0, telemetry_records_count * 0.05)
    accumulated_hours = round(accumulated_hours, 1)

    # Equivalent Operating Hours (EOH) reflects accelerated wear
    eoh = round(accumulated_hours * max(1.0, stress.composite_damage_rate), 1)

    # Base TBO consumed percentage
    tbo_consumed_pct = round(min(100.0, (eoh / TBO_REFERENCE_HOURS) * 100.0), 1)

    # Subsystem specific wear percentages (0 to 100%)
    cyl_wear = round(min(99.0, tbo_consumed_pct * (0.85 + 0.35 * (stress.thermal - 1.0))), 1)
    piston_wear = round(min(99.0, tbo_consumed_pct * (0.90 + 0.30 * (stress.mechanical - 1.0))), 1)
    turbo_wear = round(min(99.0, tbo_consumed_pct * (0.80 + 0.40 * (stress.turbo_boost - 1.0))), 1)
    bearing_wear = round(min(99.0, tbo_consumed_pct * (0.90 + 0.35 * (stress.lubrication - 1.0))), 1)

    subsystems = SubsystemWear(
        cylinder_valves_wear_pct=max(1.0, cyl_wear),
        piston_rings_wear_pct=max(1.0, piston_wear),
        turbocharger_actuator_wear_pct=max(1.0, turbo_wear),
        journal_bearings_wear_pct=max(1.0, bearing_wear),
        dominant_degrading_subsystem="Cylinder Head & Valve Train" if cyl_wear >= max(piston_wear, turbo_wear, bearing_wear)
        else "Turbocharger & Wastegate Actuator" if turbo_wear >= max(piston_wear, bearing_wear)
        else "Piston Rings & Liner" if piston_wear >= bearing_wear
        else "Journal Bearings & Lubrication"
    )

    # 5. Nominal Point Estimate RUL in Operating Hours
    if not twin.is_operational:
        # Cold standby baseline
        rul_nominal = round(max(0.0, TBO_REFERENCE_HOURS - eoh), 1)
        rul_lower = round(max(0.0, rul_nominal * 0.90), 1)
        rul_upper = round(min(TBO_REFERENCE_HOURS, rul_nominal * 1.08), 1)
        confidence = 0.95
        status = "OPTIMAL"
    else:
        # Active engine: project remaining hours adjusted by current damage rate
        burn_rate = max(0.85, stress.composite_damage_rate)
        remaining_eoh = max(0.0, TBO_REFERENCE_HOURS - eoh)
        rul_nominal = round(remaining_eoh / burn_rate, 1)

        # Dynamic uncertainty width expands with active faults or extreme stress
        uncertainty_factor = 0.08 + (0.05 if active_count > 0 else 0.0) + (0.08 if has_critical else 0.0)
        sigma = rul_nominal * uncertainty_factor
        rul_lower = round(max(0.0, rul_nominal - 1.645 * sigma), 1)
        rul_upper = round(min(TBO_REFERENCE_HOURS, rul_nominal + 1.645 * sigma), 1)

        # Prognostic Confidence Score (0 to 100%)
        conf_penalty = (0.15 if has_critical else 0.0) + (0.08 if active_count > 0 else 0.0)
        confidence = round(max(0.40, min(0.96, (twin.twin_fidelity_score / 100.0) * 0.92 - conf_penalty)), 2)

        # Health status category
        if has_critical or rul_nominal < 50.0:
            status = "CRITICAL_INSPECTION_MANDATORY"
        elif rul_nominal < 300.0 or tbo_consumed_pct > 85.0:
            status = "OVERHAUL_REQUIRED"
        elif rul_nominal < 800.0 or stress.composite_damage_rate > 1.8:
            status = "MAINTENANCE_ADVISORY"
        elif rul_nominal < 1400.0:
            status = "NOMINAL"
        else:
            status = "OPTIMAL"

    # 6. Scheduled Inspection Milestones (countdown in flight hours)
    hours_to_100 = round(max(0.0, INSPECTION_MINOR_HOURS - (accumulated_hours % INSPECTION_MINOR_HOURS)), 1)
    hours_to_500 = round(max(0.0, INSPECTION_INTERMEDIATE_HOURS - (accumulated_hours % INSPECTION_INTERMEDIATE_HOURS)), 1)
    hours_to_tbo = round(max(0.0, TBO_REFERENCE_HOURS - accumulated_hours), 1)

    milestones = MaintenanceMilestones(
        reference_tbo_hours=TBO_REFERENCE_HOURS,
        accumulated_service_hours=accumulated_hours,
        equivalent_operating_hours=eoh,
        hours_to_100h_inspection=hours_to_100,
        hours_to_500h_inspection=hours_to_500,
        hours_to_tbo_overhaul=hours_to_tbo,
    )

    # 7. Actionable Prognostic Maintenance Advisories
    if status == "CRITICAL_INSPECTION_MANDATORY":
        advisory = "CRITICAL ADVISORY: Active severe fault condition or acute component stress detected. Ground airframe immediately for borescope examination and oil filter particulate check."
    elif status == "OVERHAUL_REQUIRED":
        advisory = "MAINTENANCE NOTICE: Engine wear envelope approaching reference TBO limit. Schedule major depot-level engine overhaul. Restrict sorties to visual recovery radius."
    elif stress.thermal > 2.0:
        advisory = "THERMAL PRECAUTION: Elevated cylinder head temperatures are accelerating exhaust valve guide wear by 2.0x+. Inspect cowling baffles and radiator ducting before next flight."
    elif stress.turbo_boost > 2.0:
        advisory = "BOOST ADVISORY: Sustained high manifold pressure operation detected. Check wastegate spindle play and compressor wheel clearance during upcoming 100-hour inspection."
    elif stress.lubrication > 1.8:
        advisory = "LUBRICATION NOTICE: Oil pressure-temperature ratio indicates reduced hydrodynamic film margin. Draw oil sample for Spectrometric Oil Analysis (SOAP)."
    else:
        advisory = "NOMINAL FLEET STATE: Powertrain degradation rate is tracking within nominal reference TBO consumption curves. Proceed with standard scheduled inspection intervals."

    return RULStateResponse(
        engine_id=engine_id,
        timestamp=eval_time,
        is_operational=twin.is_operational,
        prognostic_status=status,
        estimated_rul_hours=rul_nominal,
        confidence_interval_90_lower=rul_lower,
        confidence_interval_90_upper=rul_upper,
        prognostic_confidence=confidence,
        damage_rate_multiplier=stress.composite_damage_rate,
        stress_multipliers=stress,
        subsystem_wear=subsystems,
        milestones=milestones,
        maintenance_advisory=advisory,
    )

def generate_degradation_trajectory(
    engine_id: str,
    current_rul: RULStateResponse
) -> RULTrajectoryResponse:
    """Generate a 50-point projected lifecycle degradation curve from current hours to TBO."""
    current_hours = current_rul.milestones.accumulated_service_hours
    current_wear = (current_rul.milestones.equivalent_operating_hours / TBO_REFERENCE_HOURS) * 100.0
    damage_rate = max(0.85, current_rul.damage_rate_multiplier)

    points: List[RULTrajectoryPoint] = []
    step_hours = 35.0  # ~35 hours per point across remaining horizon
    total_steps = 45

    for i in range(total_steps):
        flight_hour = round(current_hours + i * step_hours, 1)
        if flight_hour > 2200.0:
            break

        # Projected equivalent hours progression
        delta_hrs = i * step_hours
        projected_eoh = current_rul.milestones.equivalent_operating_hours + delta_hrs * damage_rate
        nominal_wear = round(min(125.0, (projected_eoh / TBO_REFERENCE_HOURS) * 100.0), 1)

        # Expanding uncertainty cone over time
        uncertainty = 1.5 + (i * 0.45)
        lower_wear = round(max(0.0, nominal_wear - uncertainty), 1)
        upper_wear = round(min(130.0, nominal_wear + uncertainty), 1)

        points.append(
            RULTrajectoryPoint(
                flight_hours=flight_hour,
                projected_wear_pct=nominal_wear,
                lower_bound_pct=lower_wear,
                upper_bound_pct=upper_wear,
                tbo_threshold_pct=100.0,
            )
        )

    return RULTrajectoryResponse(
        engine_id=engine_id,
        current_hours=current_hours,
        projected_points_count=len(points),
        trajectory=points,
    )
