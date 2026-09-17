"""TwinProp-DX Phase 4 Remaining Useful Life (RUL) API Router.

PROTOTYPE / ACADEMIC DISCLAIMER:
Provides physics-informed Remaining Useful Life (RUL) estimation and degradation
trajectory modeling for the Rotax 914 F powertrain.
MANDATORY AIRWORTHINESS NOTICE:
Values represent advisory condition-based PHM estimates only.
They do NOT override, replace, or determine certified Rotax OEM, FAA, or EASA
mandatory maintenance limits, scheduled airworthiness inspections, or TBO directives.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.models.engine import Engine
from app.models.telemetry import Telemetry
from app.models.fault import FaultLog
from app.schemas.rul import (
    RULStateResponse,
    RULTrajectoryResponse,
    StressMultipliers,
    SubsystemWear,
    MaintenanceMilestones,
)
from app.services.rul_service import (
    estimate_remaining_useful_life,
    generate_degradation_trajectory,
    TBO_REFERENCE_HOURS,
    ASSUMED_INITIAL_HOURS,
)

router = APIRouter(prefix="/rul", tags=["Remaining Useful Life (Phase 4)"])

def _telemetry_to_dict(record: Telemetry) -> dict:
    """Helper to convert SQLAlchemy Telemetry model to dictionary."""
    return {
        "engine_id": record.engine_id,
        "rpm": record.rpm,
        "cht": record.cht,
        "egt": record.egt,
        "oil_pressure": record.oil_pressure,
        "oil_temperature": record.oil_temperature,
        "fuel_flow": record.fuel_flow,
        "vibration": record.vibration,
        "throttle": record.throttle,
        "ambient_temperature": record.ambient_temperature,
        "altitude": record.altitude,
        "battery_voltage": record.battery_voltage,
    }

@router.get("/{engine_id}", response_model=RULStateResponse)
def get_engine_rul(engine_id: str, db: Session = Depends(get_db)):
    """Evaluate and return real-time Remaining Useful Life (RUL), 90% confidence
    intervals, subsystem wear indices, and maintenance horizons.
    """
    engine = db.query(Engine).filter(Engine.engine_id == engine_id).first()
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine '{engine_id}' not found in registry."
        )

    # Fetch latest telemetry reading
    latest = (
        db.query(Telemetry)
        .filter(Telemetry.engine_id == engine_id)
        .order_by(Telemetry.timestamp.desc())
        .first()
    )

    # Fetch recent active fault logs
    faults = (
        db.query(FaultLog)
        .filter(FaultLog.engine_id == engine_id)
        .order_by(FaultLog.timestamp.desc())
        .limit(20)
        .all()
    )

    # Count total telemetry packets for cumulative hour estimation
    telemetry_count = (
        db.query(Telemetry)
        .filter(Telemetry.engine_id == engine_id)
        .count()
    )

    if not latest:
        # Default cold standby response when no telemetry exists
        now = datetime.now(timezone.utc)
        return RULStateResponse(
            engine_id=engine_id,
            timestamp=now,
            is_operational=False,
            prognostic_status="OPTIMAL",
            estimated_rul_hours=TBO_REFERENCE_HOURS - ASSUMED_INITIAL_HOURS,
            confidence_interval_90_lower=TBO_REFERENCE_HOURS - ASSUMED_INITIAL_HOURS - 50.0,
            confidence_interval_90_upper=TBO_REFERENCE_HOURS - ASSUMED_INITIAL_HOURS + 50.0,
            prognostic_confidence=0.95,
            damage_rate_multiplier=1.0,
            stress_multipliers=StressMultipliers(
                thermal=1.0,
                mechanical=1.0,
                turbo_boost=1.0,
                lubrication=1.0,
                active_faults=1.0,
                composite_damage_rate=1.0,
            ),
            subsystem_wear=SubsystemWear(
                cylinder_valves_wear_pct=7.1,
                piston_rings_wear_pct=7.1,
                turbocharger_actuator_wear_pct=7.1,
                journal_bearings_wear_pct=7.1,
                dominant_degrading_subsystem="Nominal Baseline",
            ),
            milestones=MaintenanceMilestones(
                reference_tbo_hours=TBO_REFERENCE_HOURS,
                accumulated_service_hours=ASSUMED_INITIAL_HOURS,
                equivalent_operating_hours=ASSUMED_INITIAL_HOURS,
                hours_to_100h_inspection=57.5,
                hours_to_500h_inspection=357.5,
                hours_to_tbo_overhaul=TBO_REFERENCE_HOURS - ASSUMED_INITIAL_HOURS,
            ),
            maintenance_advisory="Engine registered in cold standby. Maintain standard calendar storage protocol.",
        )

    telemetry_data = _telemetry_to_dict(latest)
    return estimate_remaining_useful_life(
        engine_id=engine_id,
        latest_telemetry=telemetry_data,
        recent_faults=faults,
        telemetry_records_count=telemetry_count,
        timestamp=latest.timestamp,
    )

@router.get("/{engine_id}/trajectory", response_model=RULTrajectoryResponse)
def get_engine_rul_trajectory(engine_id: str, db: Session = Depends(get_db)):
    """Retrieve projected 50-point lifecycle degradation curve and 90% confidence
    envelope from current flight hours to reference TBO.
    """
    current_rul = get_engine_rul(engine_id=engine_id, db=db)
    return generate_degradation_trajectory(engine_id, current_rul)
