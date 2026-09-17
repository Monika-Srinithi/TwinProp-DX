from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.engine import Engine
from app.schemas.engine import EngineCreate, EngineResponse

router = APIRouter(prefix="/engines", tags=["Engines"])

@router.get("", response_model=List[EngineResponse])
def get_engines(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Retrieve all registered aero-piston engines."""
    engines = db.query(Engine).offset(skip).limit(limit).all()
    return engines

@router.get("/{engine_id}", response_model=EngineResponse)
def get_engine(engine_id: str, db: Session = Depends(get_db)):
    """Retrieve specific engine details by engine_id."""
    engine = db.query(Engine).filter(Engine.engine_id == engine_id).first()
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with identifier '{engine_id}' not found."
        )
    return engine

@router.post("", response_model=EngineResponse, status_code=status.HTTP_201_CREATED)
def create_engine(engine_in: EngineCreate, db: Session = Depends(get_db)):
    """Register a new engine in the fleet registry."""
    existing = db.query(Engine).filter(Engine.engine_id == engine_in.engine_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Engine '{engine_in.engine_id}' is already registered."
        )
    
    new_engine = Engine(
        engine_id=engine_in.engine_id,
        engine_type=engine_in.engine_type,
        aircraft_id=engine_in.aircraft_id,
        status=engine_in.status
    )
    db.add(new_engine)
    db.commit()
    db.refresh(new_engine)
    return new_engine
