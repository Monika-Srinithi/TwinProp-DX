"""TwinProp-DX Engine Health Evaluation Service.

Phase 3 Integration:
Evaluates powertrain health based on real-time sensor residual deviations
and deterministic diagnostic classifications from the fault_service.

PROTOTYPE DISCLAIMER:
Prototype physics-informed & statistical rule-based diagnostic evaluation.
Not a certified aviation maintenance system.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel
from app.services.fault_service import evaluate_telemetry_diagnosis

class HealthAssessmentResult(BaseModel):
    health_index: Optional[float] = None
    status: str = "NOT_CALCULATED"
    confidence: Optional[float] = None
    message: str = "Phase 3 Prototype Diagnostic Evaluation"

def evaluate_engine_health(telemetry_data: Dict[str, Any]) -> HealthAssessmentResult:
    """Accept raw or streamed engine telemetry and return the health assessment."""
    if not telemetry_data:
        return HealthAssessmentResult(
            health_index=None,
            status="NOT_CALCULATED",
            confidence=None,
            message="No telemetry provided for health evaluation."
        )

    engine_id = str(telemetry_data.get("engine_id") or "UNKNOWN")
    diagnosis = evaluate_telemetry_diagnosis(engine_id, telemetry_data)

    return HealthAssessmentResult(
        health_index=diagnosis.health_index,
        status=diagnosis.severity,
        confidence=diagnosis.confidence,
        message=f"Phase 3 Prototype: {diagnosis.description}"
    )

