"""TwinProp-DX Phase 5 Mission Replay API Router.

PROTOTYPE / ACADEMIC DISCLAIMER:
Provides Flight Data Recorder (FDR) chronological mission replay and multi-subsystem
synchronization for the Rotax 914 F powertrain on MALE UAV airframes.
Replays only authentic telemetry and fault logs stored in the database.
Flags data provenance as RECORDED_TELEMETRY vs SIMULATED_INJECTION.
Advisory engineering prototype.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.replay import (
    ReplayMissionListItem,
    MissionReplayPackage,
)
from app.services.replay_service import (
    get_replay_missions_list,
    get_mission_replay_package,
)

router = APIRouter(prefix="/replay", tags=["Mission Replay (Phase 5)"])

@router.get("/missions", response_model=List[ReplayMissionListItem])
def list_replay_missions(db: Session = Depends(get_db)):
    """Retrieve list of all missions with telemetry counts and fault alert counts
    for Flight Data Recorder (FDR) replay selection.
    """
    return get_replay_missions_list(db=db)

@router.get("/missions/{mission_id}", response_model=MissionReplayPackage)
def get_mission_replay(mission_id: str, db: Session = Depends(get_db)):
    """Retrieve complete chronological Flight Data Recorder (FDR) package for a mission,
    including synchronized telemetry frames, Digital Twin baselines, RUL prognostics,
    and timeline fault event markers.
    """
    try:
        package = get_mission_replay_package(mission_id=mission_id, db=db)
        return package
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
