"""TwinProp-DX Phase 2 Digital Twin Service.

PROTOTYPE / ACADEMIC DISCLAIMER:
This module implements a physics-informed mathematical Digital Twin for the
Rotax 914 F turbocharged aero-piston engine (MALE UAV application).
All equations, thermodynamic cycle estimations, turbocharger TCU boost curves,
and baseline thresholds represent academic engineering approximations and
aerospace modeling conventions. They are NOT certified FAA, EASA, or Rotax OEM
operational limits or flight manual procedures.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import math

from app.schemas.digital_twin import (
    DigitalTwinThermodynamics,
    DigitalTwinTurbocharger,
    DigitalTwinSubsystems,
    DigitalTwinChannelResidual,
    DigitalTwinStateResponse,
)

# Standard ISA Sea-Level Constants
ISA_P0_BAR = 1.01325          # Sea level standard atmospheric pressure (bar)
ISA_T0_K = 288.15             # Sea level standard temperature (Kelvin)
ISA_LAPSE_RATE = 0.0065       # Standard tropospheric temperature lapse rate (K/m)
ISA_EXPONENT = 5.25588        # (g * M) / (R * L) for standard air
AVGAS_DENSITY_KG_L = 0.72     # Density of 100LL Avgas / Super Unleaded (kg/L)
FUEL_LHV_KJ_KG = 44000.0      # Lower heating value of aviation fuel (kJ/kg)

# Sensor channel metadata and standard tolerances for residual tracking
CHANNEL_DEFINITIONS = {
    "rpm": {"label": "Engine Speed", "unit": "RPM", "nominal_tol": 200.0},
    "cht": {"label": "Cylinder Head Temp", "unit": "°C", "nominal_tol": 12.0},
    "egt": {"label": "Exhaust Gas Temp", "unit": "°C", "nominal_tol": 35.0},
    "oil_pressure": {"label": "Oil Pressure", "unit": "bar", "nominal_tol": 0.45},
    "oil_temperature": {"label": "Oil Temperature", "unit": "°C", "nominal_tol": 10.0},
    "fuel_flow": {"label": "Fuel Flow Rate", "unit": "L/h", "nominal_tol": 3.0},
    "vibration": {"label": "Engine Vibration RMS", "unit": "mm/s", "nominal_tol": 2.5},
    "throttle": {"label": "Throttle Position", "unit": "%", "nominal_tol": 5.0},
    "battery_voltage": {"label": "Bus Battery Voltage", "unit": "V", "nominal_tol": 0.8},
}

def calculate_isa_ambient_pressure(altitude_m: float) -> float:
    """Compute standard ambient barometric pressure in bar at a given geometric altitude (meters)."""
    alt = max(0.0, min(12000.0, altitude_m))
    temp_ratio = 1.0 - (ISA_LAPSE_RATE * alt) / ISA_T0_K
    if temp_ratio <= 0.0:
        return 0.20
    p_bar = ISA_P0_BAR * math.pow(temp_ratio, ISA_EXPONENT)
    return round(p_bar, 3)

def bar_to_inhg(bar: float) -> float:
    """Convert bar to inches of mercury (inHg)."""
    return round(bar * 29.529983, 2)

def evaluate_digital_twin_model(
    engine_id: str,
    telemetry: Dict[str, Any],
    timestamp: Optional[datetime] = None
) -> DigitalTwinStateResponse:
    """Core physics-informed digital twin evaluation pipeline for the Rotax 914 F powertrain."""
    eval_time = timestamp or datetime.now(timezone.utc)

    # Extract observed telemetry parameters
    rpm = float(telemetry.get("rpm") or 0.0)
    cht = float(telemetry.get("cht") or 0.0)
    egt = float(telemetry.get("egt") or 0.0)
    oil_pressure = float(telemetry.get("oil_pressure") or 0.0)
    oil_temperature = float(telemetry.get("oil_temperature") or 0.0)
    fuel_flow = float(telemetry.get("fuel_flow") or 0.0)
    vibration = float(telemetry.get("vibration") or 0.0)
    throttle = float(telemetry.get("throttle") or 0.0)
    ambient_temp = float(telemetry.get("ambient_temperature") or 15.0)
    altitude = float(telemetry.get("altitude") or 0.0)
    voltage = float(telemetry.get("battery_voltage") or 28.0)

    is_operational = rpm > 500.0
    t_ratio = min(1.0, max(0.0, throttle / 100.0))
    p_amb = calculate_isa_ambient_pressure(altitude)

    # ---------------------------------------------------------
    # 1. Turbocharger & TCU (Turbo Control Unit) Dynamic Model
    # ---------------------------------------------------------
    # Check if a real measured MAP value is present in the telemetry dictionary
    measured_map_raw = (
        telemetry.get("map")
        if telemetry.get("map") is not None
        else (telemetry.get("map_bar") if telemetry.get("map_bar") is not None else telemetry.get("manifold_pressure"))
    )
    measured_map: Optional[float] = None
    if measured_map_raw is not None:
        try:
            val = float(measured_map_raw)
            if val > 0.0:
                measured_map = val
        except (ValueError, TypeError):
            measured_map = None

    if measured_map is not None:
        is_map_estimated = False
        map_bar = round(measured_map, 2)
        pressure_ratio = round(map_bar / p_amb, 2) if p_amb > 0.0 else 1.0
        wastegate_pct = 100.0 if not is_operational else max(5.0, min(100.0, 100.0 - (throttle * 0.95)))
        tcu_state = "MEASURED_TELEMETRY"
    elif not is_operational or throttle <= 5.0:
        # MAP is model-estimated from ISA ambient pressure when no boost is active.
        is_map_estimated = True
        map_bar = round(p_amb, 2)
        wastegate_pct = 100.0  # Fully open / bypass
        pressure_ratio = 1.0
        tcu_state = "STANDSTILL" if rpm <= 0.0 else "IDLE_UNBOOSTED"
    else:
        is_map_estimated = True
        # Rotax 914 F TCU boost regulation schedule:
        # - Part throttle (<65%): intake manifold is sub-atmospheric or equal to ambient
        # - Cruise (65-85%): wastegate closes to reach 1.00 - 1.15 bar (29.5 - 34.0 inHg)
        # - Max Continuous (85-95%): target 1.15 - 1.20 bar (34.0 - 35.4 inHg)
        # - Takeoff Rating (>95%): 5-minute boost limit of 1.30 - 1.35 bar (38.4 - 39.9 inHg)
        if throttle <= 50.0:
            map_bar = p_amb * (0.60 + 0.40 * (throttle / 50.0))
            wastegate_pct = 80.0 + 20.0 * (1.0 - throttle / 50.0)
            tcu_state = "PART_THROTTLE_UNBOOSTED"
        elif throttle <= 85.0:
            boost_factor = (throttle - 50.0) / 35.0
            map_bar = max(p_amb, 1.00 + boost_factor * 0.18)
            wastegate_pct = max(20.0, 75.0 - boost_factor * 45.0)
            tcu_state = "BOOST_REGULATING_CRUISE"
        elif throttle <= 95.0:
            boost_factor = (throttle - 85.0) / 10.0
            map_bar = 1.18 + boost_factor * 0.07  # Up to 1.25 bar
            wastegate_pct = max(10.0, 30.0 - boost_factor * 15.0)
            tcu_state = "MAX_CONTINUOUS_BOOST"
        else:
            # Full throttle takeoff / emergency climb
            map_bar = 1.32  # Nominal 5-min takeoff limit
            wastegate_pct = 5.0  # Nearly closed to force maximum turbine drive
            tcu_state = "TAKEOFF_OVERBOOST_5MIN"

        map_bar = round(map_bar, 2)
        pressure_ratio = round(map_bar / p_amb, 2) if p_amb > 0.0 else 1.0

    map_inhg = bar_to_inhg(map_bar)

    # ---------------------------------------------------------
    # 2. Thermodynamic Power & Combustion Cycle Model
    # ---------------------------------------------------------
    if not is_operational:
        power_kw = 0.0
        power_hp = 0.0
        torque_nm = 0.0
        bsfc = 0.0
        thermal_efficiency = 0.0
        operating_regime = "STANDSTILL"
    else:
        # Rotax 914 F rated power: 84.5 kW (115 HP) at 5800 RPM (takeoff), 73.5 kW (100 HP) at 5500 RPM
        rpm_ratio = min(1.05, rpm / 5800.0)
        boost_multiplier = min(1.25, max(0.85, map_bar / 1.0))
        power_kw = round(84.5 * rpm_ratio * t_ratio * boost_multiplier, 1)
        power_kw = max(2.0, power_kw)
        power_hp = round(power_kw * 1.34102, 1)

        # Brake Torque: T = (P * 1000) / (2 * pi * (RPM / 60))
        omega = 2.0 * math.pi * (rpm / 60.0)
        torque_nm = round((power_kw * 1000.0) / omega, 1) if omega > 0.0 else 0.0

        # BSFC estimation: fuel mass flow (g/h) divided by power (kW)
        fuel_mass_flow_g_h = fuel_flow * AVGAS_DENSITY_KG_L * 1000.0
        if power_kw > 5.0 and fuel_mass_flow_g_h > 100.0:
            bsfc = round(fuel_mass_flow_g_h / power_kw, 1)
            # BSFC typical range: 240 - 340 g/kWh
            bsfc = max(210.0, min(500.0, bsfc))
            # Thermal Efficiency: 3600 / (BSFC_kg_kWh * LHV_MJ_kg)
            bsfc_kg_kwh = bsfc / 1000.0
            thermal_efficiency = round((3600.0 / (bsfc_kg_kwh * (FUEL_LHV_KJ_KG / 1000.0))) * 100.0, 1)
            thermal_efficiency = max(15.0, min(38.0, thermal_efficiency))
        else:
            bsfc = 0.0
            thermal_efficiency = 0.0

        if throttle > 95.0 and rpm > 5600.0:
            operating_regime = "TAKEOFF_RATING"
        elif throttle > 85.0:
            operating_regime = "MAX_CONTINUOUS"
        elif throttle > 55.0:
            operating_regime = "CRUISE"
        elif throttle > 20.0:
            operating_regime = "DESCENT_LOITER"
        else:
            operating_regime = "IDLE_TAXI"

    # ---------------------------------------------------------
    # 3. Subsystem Thermal & Lubrication States
    # ---------------------------------------------------------
    # Cylinder thermal headroom to nominal 135°C limit
    cht_headroom = round(max(0.0, 135.0 - cht), 1) if is_operational else 0.0
    # Cooling airflow ratio relative to cruise expectation
    cooling_effectiveness = round(min(1.2, max(0.5, 1.0 - (cht - 105.0) / 80.0)), 2) if is_operational else 1.0

    # Expected Oil Pressure nominal baseline
    expected_oil_p = round(2.6 + 1.4 * min(1.0, rpm / 5800.0), 2) if is_operational else 0.0
    oil_film_stability = round(min(1.2, max(0.2, oil_pressure / expected_oil_p)), 2) if expected_oil_p > 0.5 else 1.0

    # ---------------------------------------------------------
    # 4. Digital Twin Expected Baselines & Channel Residuals
    # ---------------------------------------------------------
    # Expected physics-informed nominal values across channels
    if not is_operational:
        twin_baselines = {
            "rpm": 0.0,
            "cht": max(ambient_temp, 20.0),
            "egt": max(ambient_temp, 20.0),
            "oil_pressure": 0.0,
            "oil_temperature": max(ambient_temp, 20.0),
            "fuel_flow": 0.0,
            "vibration": 0.5,
            "throttle": throttle,
            "battery_voltage": 28.0,
        }
    else:
        twin_baselines = {
            "rpm": round(2000.0 + t_ratio * 3500.0, 1),
            "cht": round(95.0 + t_ratio * 25.0 + (ambient_temp - 15.0) * 0.25, 1),
            "egt": round(760.0 + t_ratio * 75.0, 1),
            "oil_pressure": expected_oil_p,
            "oil_temperature": round(85.0 + t_ratio * 16.0 + (ambient_temp - 15.0) * 0.2, 1),
            "fuel_flow": round(7.0 + t_ratio * 21.0, 1),
            "vibration": round(4.5 + t_ratio * 4.0, 1),
            "throttle": round(throttle, 1),
            "battery_voltage": 28.0,
        }

    residuals: List[DigitalTwinChannelResidual] = []
    normalized_errors: List[float] = []

    for key, meta in CHANNEL_DEFINITIONS.items():
        obs = float(telemetry.get(key) or 0.0)
        exp = twin_baselines.get(key, obs)
        res = obs - exp
        ref = abs(exp) if abs(exp) > 1.0 else 1.0
        res_pct = round((res / ref) * 100.0, 1)

        z = abs(res) / meta["nominal_tol"]
        normalized_errors.append(min(1.0, z / 3.0))

        if z > 2.5:
            res_status = "EXCURSION"
        elif z > 1.2:
            res_status = "DEVIATION"
        else:
            res_status = "NOMINAL"

        residuals.append(
            DigitalTwinChannelResidual(
                channel=key,
                label=meta["label"],
                observed=round(obs, 2),
                twin_expected=round(exp, 2),
                residual=round(res, 2),
                residual_pct=res_pct,
                status=res_status,
                unit=meta["unit"],
            )
        )

    # ---------------------------------------------------------
    # 5. Subsystem Health Scores & Twin Fidelity Alignment
    # ---------------------------------------------------------
    # Subsystem scores (0 - 100%)
    if not is_operational:
        core_health = None
        turbo_health = None
        lub_health = None
        cool_health = None
        elec_health = None
        fidelity_score = None
    else:
        # Core: based on RPM deficit, vibration, fuel flow alignment
        rpm_err = abs(telemetry.get("rpm", 0) - twin_baselines["rpm"]) / 200.0
        vib_err = max(0.0, (vibration - 8.0) / 4.0)
        core_health = round(max(20.0, 100.0 - (rpm_err * 15.0 + vib_err * 20.0)), 1)

        # Turbo: based on boost development vs expected MAP
        map_delta = abs(map_bar - p_amb) if throttle > 70.0 else 0.0
        turbo_health = round(max(25.0, min(100.0, 95.0 - (abs(rpm - twin_baselines['rpm']) / 350.0) * 20.0)), 1)

        # Lubrication: based on oil pressure and oil temp
        p_err = abs(oil_pressure - expected_oil_p) / 0.45
        t_err = max(0.0, (oil_temperature - 105.0) / 10.0)
        lub_health = round(max(15.0, 100.0 - (p_err * 25.0 + t_err * 20.0)), 1)

        # Cooling: based on CHT margin
        cht_pen = max(0.0, (cht - 120.0) / 15.0) * 30.0
        cool_health = round(max(20.0, 100.0 - cht_pen), 1)

        # Electrical: based on bus voltage
        volt_pen = abs(voltage - 28.0) / 0.8 * 25.0
        elec_health = round(max(20.0, 100.0 - volt_pen), 1)

        # Overall Twin Alignment Fidelity: Mean normalized error inverted
        mean_err = sum(normalized_errors) / len(normalized_errors) if normalized_errors else 0.0
        fidelity_score = round(max(10.0, 100.0 * (1.0 - mean_err)), 1)

    return DigitalTwinStateResponse(
        engine_id=engine_id,
        timestamp=eval_time,
        is_operational=is_operational,
        operating_regime=operating_regime,
        twin_fidelity_score=fidelity_score,
        thermodynamics=DigitalTwinThermodynamics(
            power_kw=power_kw,
            power_hp=power_hp,
            torque_nm=torque_nm,
            bsfc_g_kwh=bsfc,
            thermal_efficiency_pct=thermal_efficiency,
            operating_regime=operating_regime,
        ),
        turbocharger=DigitalTwinTurbocharger(
            map_bar=map_bar,
            map_inhg=map_inhg,
            ambient_pressure_bar=p_amb,
            wastegate_position_pct=round(wastegate_pct, 1),
            pressure_ratio=pressure_ratio,
            tcu_state=tcu_state,
            is_map_estimated=is_map_estimated,
        ),
        subsystems=DigitalTwinSubsystems(
            core_health=core_health,
            turbo_health=turbo_health,
            lubrication_health=lub_health,
            cooling_health=cool_health,
            electrical_health=elec_health,
            cht_thermal_headroom_c=cht_headroom,
            cooling_effectiveness_ratio=cooling_effectiveness,
            oil_film_stability_index=oil_film_stability,
        ),
        residuals=residuals,
    )
