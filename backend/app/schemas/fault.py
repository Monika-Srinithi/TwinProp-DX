from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, Dict, List, Any

class SensorDeviation(BaseModel):
    sensor: str = Field(..., description="Sensor parameter key, e.g., 'egt', 'oil_pressure'")
    label: str = Field(..., description="Human-readable sensor label, e.g., 'Exhaust Gas Temp (EGT)'")
    actual: float = Field(..., description="Observed sensor reading from telemetry")
    expected_nominal: float = Field(..., description="Estimated nominal baseline based on operating point")
    residual: float = Field(..., description="Difference: actual - expected_nominal")
    residual_pct: float = Field(..., description="Percentage deviation from nominal baseline")
    status: str = Field(..., description="NORMAL, WARNING, or CRITICAL")
    unit: str = Field(..., description="Physical engineering unit, e.g. '°C', 'bar', 'mm/s'")

class DiagnosisResult(BaseModel):
    """Phase 3 Prototype Diagnostic & Explainable AI Result.
    
    Disclaimer: Prototype physics-informed & statistical rule-based diagnostic evaluation.
    Not a certified aviation maintenance system.
    """
    engine_id: str
    timestamp: datetime
    is_operational: bool
    rpm: float
    health_index: float = Field(..., description="Computed engine health index from 0 to 100")
    anomaly_score: float = Field(..., description="Composite anomaly index from 0.00 (nominal) to 1.00 (critical anomaly)")
    severity: str = Field(..., description="Severity classification: NORMAL, ADVISORY, WARNING, CRITICAL")
    primary_fault: Optional[str] = Field(None, description="Classified failure mode name")
    fault_code: Optional[str] = Field(None, description="Diagnostic fault code, e.g., FLT-IGN-001")
    confidence: float = Field(..., description="Deterministic diagnostic confidence from 0.0 to 1.0")
    description: str = Field(..., description="Human-readable diagnosis summary")
    root_cause: str = Field(..., description="Identified root cause hypothesis")
    recommended_action: str = Field(..., description="Ground Control Station (GCS) pilot / operator advisory action")
    feature_attributions: Dict[str, float] = Field(default_factory=dict, description="Explainable AI (XAI) feature attribution percentages (sum to 100%)")
    deviations: List[SensorDeviation] = Field(default_factory=list, description="Sensor baseline residual deviations")
    active_anomalies_count: int = 0
    is_simulated: bool = False

class FaultLogResponse(BaseModel):
    id: int
    engine_id: str
    timestamp: datetime
    severity: str
    fault_code: str
    fault_type: str
    description: str
    anomaly_score: float
    confidence: float
    root_cause: str
    recommended_action: str
    feature_attributions: Optional[Dict[str, Any]] = None
    is_acknowledged: bool
    is_simulated: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FaultAcknowledgeRequest(BaseModel):
    is_acknowledged: bool = True

class FaultSimulationRequest(BaseModel):
    engine_id: str = Field(..., description="Engine identifier to target")
    scenario: str = Field(..., description="Simulation scenario: IGNITION_MISFIRE, TURBO_BOOST_LEAK, OIL_SYSTEM_DEGRADATION, COOLING_DEGRADATION, FUEL_STARVATION, or NOMINAL")
    severity: Optional[str] = Field("WARNING", description="Simulation severity: ADVISORY, WARNING, or CRITICAL")
