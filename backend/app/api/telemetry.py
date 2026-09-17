from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from app.database import get_db
from app.models.telemetry import Telemetry
from app.models.engine import Engine
from app.schemas.telemetry import TelemetryCreate, TelemetryResponse

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])

@router.get("/{engine_id}", response_model=List[TelemetryResponse])
def get_telemetry_history(
    engine_id: str,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Retrieve historical telemetry records for a specified engine, ordered by timestamp descending."""
    records = (
        db.query(Telemetry)
        .filter(Telemetry.engine_id == engine_id)
        .order_by(Telemetry.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return records

@router.get("/{engine_id}/latest", response_model=TelemetryResponse)
def get_latest_telemetry(engine_id: str, db: Session = Depends(get_db)):
    """Retrieve the most recent telemetry packet for a specified engine."""
    record = (
        db.query(Telemetry)
        .filter(Telemetry.engine_id == engine_id)
        .order_by(Telemetry.timestamp.desc())
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No telemetry packets found for engine '{engine_id}'."
        )
    return record

@router.post("", response_model=TelemetryResponse, status_code=status.HTTP_201_CREATED)
def ingest_telemetry(data: TelemetryCreate, db: Session = Depends(get_db)):
    """Ingest a new real-time or simulated telemetry packet."""
    record_timestamp = data.timestamp or datetime.now(timezone.utc)

    telemetry_record = Telemetry(
        engine_id=data.engine_id,
        timestamp=record_timestamp,
        rpm=data.rpm,
        cht=data.cht,
        egt=data.egt,
        oil_pressure=data.oil_pressure,
        oil_temperature=data.oil_temperature,
        fuel_flow=data.fuel_flow,
        vibration=data.vibration,
        throttle=data.throttle,
        ambient_temperature=data.ambient_temperature,
        altitude=data.altitude,
        battery_voltage=data.battery_voltage,
    )
    db.add(telemetry_record)
    db.commit()
    db.refresh(telemetry_record)
    return telemetry_record
