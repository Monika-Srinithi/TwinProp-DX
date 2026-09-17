from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional

class MissionBase(BaseModel):
    mission_id: str = Field(..., description="Unique mission identifier, e.g. MSN-2026-001")
    engine_id: str = Field(..., description="Engine assigned to mission, e.g. ENG-ROTAX-914-01")
    mission_type: str = Field(..., description="Mission profile, e.g. Surveillance, Reconnaissance")
    start_time: datetime = Field(..., description="Mission commencement timestamp")
    end_time: Optional[datetime] = Field(default=None, description="Mission conclusion timestamp")
    altitude: float = Field(..., description="Mission cruise altitude in meters")
    payload: str = Field(..., description="UAV payload description")
    environment: str = Field(..., description="Environmental operating conditions")
    status: str = Field(default="PLANNED", description="Status: PLANNED, IN_PROGRESS, COMPLETED, ABORTED")

class MissionCreate(MissionBase):
    pass

class MissionResponse(MissionBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
