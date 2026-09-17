from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional

class EngineBase(BaseModel):
    engine_id: str = Field(..., description="Unique engine identifier, e.g. ENG-ROTAX-914-01")
    engine_type: str = Field(..., description="Type/model of engine, e.g. Rotax 914 F Turbocharged")
    aircraft_id: str = Field(..., description="MALE UAV tail/airframe ID, e.g. UAV-MALE-TAPAS-01")
    status: str = Field(default="OPERATIONAL", description="Engine operating status")

class EngineCreate(EngineBase):
    pass

class EngineUpdate(BaseModel):
    engine_type: Optional[str] = None
    aircraft_id: Optional[str] = None
    status: Optional[str] = None

class EngineResponse(EngineBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
