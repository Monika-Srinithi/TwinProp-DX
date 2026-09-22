"""TwinProp-DX Phase 2 Digital Twin API Router.

PROTOTYPE / ACADEMIC DISCLAIMER:
Provides real-time Digital Twin state estimation for the Rotax 914 F powertrain.
Evaluates physics-informed thermodynamic and turbocharger states derived from
active telemetry streams. Not certified for flight operations or maintenance signing.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.engine import Engine
from app.models.telemetry import Telemetry
from app.schemas.digital_twin import (
    DigitalTwinStateResponse,
    DigitalTwinHistoryResponse,
    DigitalTwinThermodynamics,
    DigitalTwinTurbocharger,
    DigitalTwinSubsystems,
)
from app.services.digital_twin_service import evaluate_digital_twin_model

router = APIRouter(prefix="/digital-twin", tags=["Digital Twin (Phase 2)"])

def _telemetry_to_dict(record: Telemetry) -> dict:
    """Helper to convert SQLAlchemy Telemetry model to pure dictionary."""
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

@router.get("/{engine_id}", response_model=DigitalTwinStateResponse)
def get_digital_twin_state(engine_id: str, db: Session = Depends(get_db)):
    """Evaluate and return the real-time Digital Twin state for a specified engine
    derived from its latest telemetry reading.
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

    if not latest:
        # Default cold standstill twin state when no telemetry has been recorded
        now = datetime.now(timezone.utc)
        return DigitalTwinStateResponse(
            engine_id=engine_id,
            timestamp=now,
            is_operational=False,
            operating_regime="STANDSTILL",
            twin_fidelity_score=None,
            thermodynamics=DigitalTwinThermodynamics(
                power_kw=0.0,
                power_hp=0.0,
                torque_nm=0.0,
                bsfc_g_kwh=0.0,
                thermal_efficiency_pct=0.0,
                operating_regime="STANDSTILL",
            ),
            turbocharger=DigitalTwinTurbocharger(
                map_bar=1.01,
                map_inhg=29.92,
                ambient_pressure_bar=1.01,
                wastegate_position_pct=100.0,
                pressure_ratio=1.0,
                tcu_state="STANDSTILL",
            ),
            subsystems=DigitalTwinSubsystems(
                core_health=None,
                turbo_health=None,
                lubrication_health=None,
                cooling_health=None,
                electrical_health=None,
                cht_thermal_headroom_c=115.0,
                cooling_effectiveness_ratio=1.0,
                oil_film_stability_index=1.0,
            ),
            residuals=[],
        )

    telemetry_data = _telemetry_to_dict(latest)
    return evaluate_digital_twin_model(
        engine_id=engine_id,
        telemetry=telemetry_data,
        timestamp=latest.timestamp,
    )

@router.get("/{engine_id}/history", response_model=DigitalTwinHistoryResponse)
def get_digital_twin_history(
    engine_id: str,
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Retrieve time-series Digital Twin states across recent telemetry frames
    for dynamic trajectory synchronization and trend tracking.
    """
    engine = db.query(Engine).filter(Engine.engine_id == engine_id).first()
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine '{engine_id}' not found in registry."
        )

    records = (
        db.query(Telemetry)
        .filter(Telemetry.engine_id == engine_id)
        .order_by(Telemetry.timestamp.desc())
        .limit(limit)
        .all()
    )

    # Reverse to chronological order (oldest -> newest) for charting
    chronological = list(reversed(records))
    states = [
        evaluate_digital_twin_model(
            engine_id=engine_id,
            telemetry=_telemetry_to_dict(rec),
            timestamp=rec.timestamp,
        )
        for rec in chronological
    ]

    return DigitalTwinHistoryResponse(
        engine_id=engine_id,
        count=len(states),
        states=states,
    )
