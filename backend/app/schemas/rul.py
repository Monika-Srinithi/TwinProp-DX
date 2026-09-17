"""TwinProp-DX Phase 4 Remaining Useful Life (RUL) Pydantic Schemas.

PROTOTYPE / ACADEMIC DISCLAIMER:
Schemas support academic physics-informed prognostic health management (PHM)
modeling of the Rotax 914 F powertrain.
MANDATORY AIRWORTHINESS NOTICE:
Values represent advisory condition-based PHM estimates only.
They do NOT override, replace, or determine certified Rotax OEM, FAA, or EASA
mandatory maintenance limits, scheduled airworthiness inspections, or TBO directives.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class StressMultipliers(BaseModel):
    thermal: float = Field(..., description="Thermal stress acceleration factor (CHT/EGT)")
    mechanical: float = Field(..., description="Mechanical and vibrational cyclic fatigue factor")
    turbo_boost: float = Field(..., description="Turbocharger overboost and MAP stress factor")
    lubrication: float = Field(..., description="Hydrodynamic lubrication film degradation factor")
    active_faults: float = Field(..., description="Active unacknowledged fault penalty multiplier")
    composite_damage_rate: float = Field(..., description="Composite instantaneous damage rate relative to nominal 1.0x cruise")

class SubsystemWear(BaseModel):
    cylinder_valves_wear_pct: float = Field(..., description="Cylinder head, exhaust valve guides, and seats wear percentage (0-100%)")
    piston_rings_wear_pct: float = Field(..., description="Piston rings and cylinder bore wear percentage (0-100%)")
    turbocharger_actuator_wear_pct: float = Field(..., description="Turbocharger bearings and wastegate actuator wear percentage (0-100%)")
    journal_bearings_wear_pct: float = Field(..., description="Crankshaft and connecting rod journal bearing wear percentage (0-100%)")
    dominant_degrading_subsystem: str = Field(..., description="Subsystem currently driving the highest damage rate")

class MaintenanceMilestones(BaseModel):
    reference_tbo_hours: float = Field(..., description="Reference OEM Time Between Overhaul assumption (2,000 hrs)")
    accumulated_service_hours: float = Field(..., description="Estimated logged airframe flight hours")
    equivalent_operating_hours: float = Field(..., description="Stress-adjusted equivalent operating hours (EOH)")
    hours_to_100h_inspection: float = Field(..., description="Remaining flight hours to next minor 100-hr line inspection")
    hours_to_500h_inspection: float = Field(..., description="Remaining flight hours to next 500-hr borescope/valve check")
    hours_to_tbo_overhaul: float = Field(..., description="Nominal calendar flight hours to reference 2,000-hr TBO")

class RULStateResponse(BaseModel):
    engine_id: str = Field(..., description="Monitored UAV engine identifier")
    timestamp: datetime = Field(..., description="Evaluation timestamp (UTC)")
    is_operational: bool = Field(..., description="Operational status of powerplant")
    prognostic_status: str = Field(..., description="Prognostic health state (OPTIMAL, NOMINAL, MAINTENANCE_ADVISORY, OVERHAUL_REQUIRED, CRITICAL_INSPECTION_MANDATORY)")
    estimated_rul_hours: float = Field(..., description="Point estimate of Remaining Useful Life in operating flight hours")
    confidence_interval_90_lower: float = Field(..., description="Lower bound of 90% confidence interval for RUL hours")
    confidence_interval_90_upper: float = Field(..., description="Upper bound of 90% confidence interval for RUL hours")
    prognostic_confidence: float = Field(..., description="Prognostic model confidence score (0.0 to 1.0)")
    damage_rate_multiplier: float = Field(..., description="Current instantaneous damage rate multiplier (nominal = 1.0x)")
    stress_multipliers: StressMultipliers
    subsystem_wear: SubsystemWear
    milestones: MaintenanceMilestones
    maintenance_advisory: str = Field(..., description="Actionable maintenance guidance for GCS operators")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class RULTrajectoryPoint(BaseModel):
    flight_hours: float = Field(..., description="Flight operating hours point")
    projected_wear_pct: float = Field(..., description="Projected cumulative wearout percentage")
    lower_bound_pct: float = Field(..., description="Lower 90% confidence envelope wear percentage")
    upper_bound_pct: float = Field(..., description="Upper 90% confidence envelope wear percentage")
    tbo_threshold_pct: float = Field(default=100.0, description="Reference 100% TBO limit line")

class RULTrajectoryResponse(BaseModel):
    engine_id: str
    current_hours: float
    projected_points_count: int
    trajectory: List[RULTrajectoryPoint]
