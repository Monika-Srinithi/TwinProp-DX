"""TwinProp-DX Phase 5 Mission Replay Pydantic Schemas.

PROTOTYPE / ACADEMIC DISCLAIMER:
Schemas support academic Flight Data Recorder (FDR) chronological replay and
multi-subsystem state synchronization for the Rotax 914 F powertrain.
Advisory engineering prototype.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class ReplayTelemetry(BaseModel):
    rpm: float
    cht: float
    egt: float
    oil_pressure: float
    oil_temperature: float
    fuel_flow: float
    vibration: float
    throttle: float
    ambient_temperature: float
    altitude: float
    battery_voltage: float

class ReplayFaultEvent(BaseModel):
    id: int
    fault_code: str
    fault_type: str
    severity: str
    description: str
    anomaly_score: float
    confidence: float
    root_cause: str
    recommended_action: str
    is_acknowledged: bool
    is_simulated: bool

class ReplayFaultMarker(BaseModel):
    frame_index: int
    timestamp: datetime
    elapsed_seconds: float
    fault_code: str
    fault_type: str
    severity: str
    is_simulated: bool

class ReplayDigitalTwinSummary(BaseModel):
    power_kw: float
    power_hp: float
    torque_nm: float
    bsfc_g_kwh: float
    thermal_efficiency_pct: float
    operating_regime: str
    map_bar: float
    map_inhg: float
    wastegate_position_pct: float
    pressure_ratio: float
    tcu_state: str
    core_health: float
    turbo_health: float
    lubrication_health: float
    cooling_health: float
    cht_thermal_headroom_c: float
    twin_fidelity_score: float

class ReplayRULSummary(BaseModel):
    prognostic_status: str
    estimated_rul_hours: float
    confidence_interval_90_lower: float
    confidence_interval_90_upper: float
    prognostic_confidence: float
    damage_rate_multiplier: float
    cylinder_valves_wear_pct: float
    turbocharger_wear_pct: float
    dominant_degrading_subsystem: str

class ReplayFrame(BaseModel):
    frame_index: int
    timestamp: datetime
    elapsed_seconds: float
    origin: str = Field(..., description="'RECORDED_TELEMETRY' or 'SIMULATED_INJECTION'")
    is_simulated: bool
    telemetry: ReplayTelemetry
    digital_twin: ReplayDigitalTwinSummary
    rul_state: ReplayRULSummary
    fault: Optional[ReplayFaultEvent] = None

class MissionSummary(BaseModel):
    total_frames: int
    flight_duration_seconds: float
    recorded_frames_count: int
    simulated_frames_count: int
    total_fault_events: int
    peak_rpm: float
    peak_cht: float
    peak_egt: float
    min_oil_pressure: float
    peak_altitude: float

class MissionReplayPackage(BaseModel):
    mission_id: str
    engine_id: str
    mission_type: str
    status: str
    start_time: datetime
    end_time: datetime
    altitude: float
    payload: str
    environment: str
    summary: MissionSummary
    fault_markers: List[ReplayFaultMarker]
    frames: List[ReplayFrame]

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ReplayMissionListItem(BaseModel):
    mission_id: str
    engine_id: str
    mission_type: str
    status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    altitude: Optional[float] = None
    payload: Optional[str] = None
    telemetry_count: int
    fault_count: int
