from fastapi import APIRouter
from app.api.engine import router as engine_router
from app.api.telemetry import router as telemetry_router
from app.api.missions import router as missions_router
from app.api.faults import router as faults_router
from app.api.digital_twin import router as digital_twin_router
from app.api.rul import router as rul_router
from app.api.replay import router as replay_router

api_router = APIRouter()
api_router.include_router(engine_router)
api_router.include_router(telemetry_router)
api_router.include_router(missions_router)
api_router.include_router(faults_router)
api_router.include_router(digital_twin_router)
api_router.include_router(rul_router)
api_router.include_router(replay_router)

__all__ = ["api_router"]

