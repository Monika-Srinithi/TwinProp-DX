from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime, timezone
import re
from app.database import get_db
from app.models.mission import Mission
from app.models.engine import Engine
from app.schemas.mission import MissionCreate, MissionResponse

router = APIRouter(prefix="/missions", tags=["Missions"])

def generate_unique_mission_id(db: Session, prefix: str = "MSN") -> str:
    """Generate a unique sequential mission ID in the format MSN-{YEAR}-{SEQ:03d}."""
    current_year = datetime.now(timezone.utc).year
    year_prefix = f"{prefix}-{current_year}-"

    existing_ids = db.query(Mission.mission_id).filter(Mission.mission_id.like(f"{year_prefix}%")).all()

    max_seq = 0
    pattern = re.compile(rf"^{re.escape(prefix)}-{current_year}-(\d+)$")
    for (m_id,) in existing_ids:
        match = pattern.match(m_id)
        if match:
            try:
                seq = int(match.group(1))
                if seq > max_seq:
                    max_seq = seq
            except ValueError:
                pass

    next_seq = max_seq + 1
    candidate_id = f"{year_prefix}{next_seq:03d}"

    # Extra safety check against collisions with any existing mission
    while db.query(Mission).filter(Mission.mission_id == candidate_id).first():
        next_seq += 1
        candidate_id = f"{year_prefix}{next_seq:03d}"

    return candidate_id

@router.get("", response_model=List[MissionResponse])
def get_missions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Retrieve all UAV flight missions."""
    missions = db.query(Mission).order_by(Mission.start_time.desc()).offset(skip).limit(limit).all()
    return missions

@router.get("/{mission_id}", response_model=MissionResponse)
def get_mission(mission_id: str, db: Session = Depends(get_db)):
    """Retrieve mission profile details by mission_id."""
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mission with identifier '{mission_id}' not found."
        )
    return mission

@router.post("", response_model=MissionResponse, status_code=status.HTTP_201_CREATED)
def create_mission(mission_in: MissionCreate, db: Session = Depends(get_db)):
    """Create a new mission profile with input validation and backend uniqueness protection."""

    # Validate assigned engine exists
    engine = db.query(Engine).filter(Engine.engine_id == mission_in.engine_id).first()
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine '{mission_in.engine_id}' not found in registry."
        )

    # Validate and resolve mission_id
    raw_id = (mission_in.mission_id or "").strip()
    if raw_id:
        mission_id = raw_id
        # Authoritative backend uniqueness check
        existing = db.query(Mission).filter(Mission.mission_id == mission_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mission '{mission_id}' already exists."
            )
    else:
        # Backend-controlled unique ID generation
        mission_id = generate_unique_mission_id(db)

    # Validate mission time range
    if mission_in.end_time is not None and mission_in.end_time < mission_in.start_time:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Mission end_time must be greater than or equal to start_time."
        )

    # Validate altitude against the project's telemetry operating range
    if not -500.0 <= mission_in.altitude <= 20000.0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Mission altitude must be between -500 and 20000 meters."
        )

    # Validate controlled mission status
    allowed_statuses = {"PLANNED", "IN_PROGRESS", "COMPLETED", "ABORTED"}
    mission_status = mission_in.status.upper()
    if mission_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Mission status must be one of: {', '.join(sorted(allowed_statuses))}."
        )

    new_mission = Mission(
        mission_id=mission_id,
        engine_id=mission_in.engine_id,
        mission_type=mission_in.mission_type,
        start_time=mission_in.start_time,
        end_time=mission_in.end_time,
        altitude=mission_in.altitude,
        payload=mission_in.payload,
        environment=mission_in.environment,
        status=mission_status,
    )
    try:
        db.add(new_mission)
        db.commit()
        db.refresh(new_mission)
    except IntegrityError:
        db.rollback()
        # In case of concurrent creation collision on auto-generation, retry once
        if not raw_id:
            mission_id = generate_unique_mission_id(db)
            new_mission.mission_id = mission_id
            try:
                db.add(new_mission)
                db.commit()
                db.refresh(new_mission)
                return new_mission
            except IntegrityError:
                db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mission '{mission_id}' already exists."
        )
    return new_mission
