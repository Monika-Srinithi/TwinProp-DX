"""TwinProp-DX Phase 2 Digital Twin Pydantic Schemas.

PROTOTYPE / ACADEMIC DISCLAIMER:
Schemas support academic physics-informed modeling of the Rotax 914 F powertrain.
Not certified aviation maintenance or flight operations limits.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime


class DigitalTwinThermodynamics(BaseModel):
    power_kw: float = Field(..., description="Estimated shaft brake power in kilowatts")
    power_hp: float = Field(..., description="Estimated brake horsepower")
    torque_nm: float = Field(..., description="Estimated brake torque in Newton-meters")
    bsfc_g_kwh: float = Field(..., description="Brake Specific Fuel Consumption in g/kWh")
    thermal_efficiency_pct: float = Field(..., description="Estimated thermodynamic thermal efficiency percentage")
    operating_regime: str = Field(..., description="Operating regime (e.g. CRUISE, MAX_CONTINUOUS, TAKEOFF_RATING)")


class DigitalTwinTurbocharger(BaseModel):
    map_bar: Optional[float] = Field(
        None,
        description="Target / Estimated Manifold Absolute Pressure in bar; unavailable when valid telemetry is not available"
    )
    map_inhg: Optional[float] = Field(
        None,
        description="Manifold Absolute Pressure in inches of mercury (inHg); unavailable when valid telemetry is not available"
    )
    ambient_pressure_bar: float = Field(..., description="Estimated ambient barometric pressure at flight altitude (bar)")
    wastegate_position_pct: float = Field(..., description="Estimated wastegate valve position (0% fully closed, 100% bypass)")
    pressure_ratio: float = Field(..., description="Compressor pressure ratio (MAP / P_amb)")
    tcu_state: str = Field(..., description="TCU turbocharger control state")
    is_map_estimated: bool = Field(
        True,
        description="True if MAP is derived from physics model calculations; False if directly measured by a physical sensor"
    )


class DigitalTwinSubsystems(BaseModel):
    core_health: Optional[float] = Field(..., description="Engine core / combustion mechanical health percentage (0-100%)")
    turbo_health: Optional[float] = Field(..., description="Turbocharger and TCU boost regulation health percentage (0-100%)")
    lubrication_health: Optional[float] = Field(..., description="Lubrication hydrodynamic health percentage (0-100%)")
    cooling_health: Optional[float] = Field(..., description="Cylinder head heat rejection health percentage (0-100%)")
    electrical_health: Optional[float] = Field(..., description="Avionics DC bus health percentage (0-100%)")
    cht_thermal_headroom_c: float = Field(..., description="Temperature margin in °C below nominal 135°C limit")
    cooling_effectiveness_ratio: float = Field(..., description="Cooling dissipation index relative to nominal cruise")
    oil_film_stability_index: float = Field(..., description="Hydrodynamic oil pressure film stability ratio")


class DigitalTwinChannelResidual(BaseModel):
    channel: str = Field(..., description="Telemetry sensor channel key")
    label: str = Field(..., description="Human-readable channel title")
    observed: float = Field(..., description="Actual observed telemetry sensor value")
    twin_expected: float = Field(..., description="Physics-informed digital twin expected baseline value")
    residual: float = Field(..., description="Absolute difference (observed - twin_expected)")
    residual_pct: float = Field(..., description="Percentage deviation relative to twin expected baseline")
    status: str = Field(..., description="Channel alignment status (NOMINAL, DEVIATION, EXCURSION)")
    unit: str = Field(..., description="Measurement engineering unit")


class DigitalTwinStateResponse(BaseModel):
    engine_id: str = Field(..., description="Identifier of the monitored UAV engine")
    timestamp: datetime = Field(..., description="UTC timestamp of the evaluated telemetry frame")
    is_operational: bool = Field(..., description="True if engine speed exceeds idle threshold (>500 RPM)")
    operating_regime: str = Field(..., description="Current thermodynamic flight operational regime")
    twin_fidelity_score: Optional[float] = Field(
        None,
        description="Overall model-telemetry alignment score (0.0 to 100.0%); unavailable when valid telemetry is not available"
    )
    thermodynamics: DigitalTwinThermodynamics
    turbocharger: DigitalTwinTurbocharger
    subsystems: DigitalTwinSubsystems
    residuals: List[DigitalTwinChannelResidual]

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class DigitalTwinHistoryResponse(BaseModel):
    engine_id: str
    count: int
    states: List[DigitalTwinStateResponse]