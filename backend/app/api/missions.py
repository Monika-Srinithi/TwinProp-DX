from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.mission import Mission
from app.schemas.mission import MissionCreate, MissionResponse

router = APIRouter(prefix="/missions", tags=["Missions"])

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
    """Create a new mission profile."""
    existing = db.query(Mission).filter(Mission.mission_id == mission_in.mission_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mission '{mission_in.mission_id}' already exists."
        )

    new_mission = Mission(
        mission_id=mission_in.mission_id,
        engine_id=mission_in.engine_id,
        mission_type=mission_in.mission_type,
        start_time=mission_in.start_time,
        end_time=mission_in.end_time,
        altitude=mission_in.altitude,
        payload=mission_in.payload,
        environment=mission_in.environment,
        status=mission_in.status
    )
    db.add(new_mission)
    db.commit()
    db.refresh(new_mission)
    return new_mission
