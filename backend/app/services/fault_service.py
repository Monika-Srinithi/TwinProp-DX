"""TwinProp-DX Phase 3 Fault Diagnosis & Explainable AI (XAI) Service.

PROTOTYPE DISCLAIMER:
This module provides a prototype physics-informed and statistical rule-based
diagnostic framework for MALE UAV aero-piston powerplants (modeled on the
Rotax 914 F series). It uses deterministic statistical deviation metrics and
SHAP-like attribution vectors. It is a research and prototyping platform and
is NOT a certified aviation maintenance or flight-critical diagnostic system.
Thresholds and failure signatures reflect typical academic/engineering modeling
and should not be used as certified OEM maintenance limits.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
import math

from app.schemas.fault import DiagnosisResult, SensorDeviation

# Sensor nominal baseline standard deviation tolerances for normalized residual calculation
SENSOR_TOLERANCES: Dict[str, float] = {
    "rpm": 220.0,               # RPM tolerance
    "cht": 12.0,                # °C tolerance
    "egt": 35.0,                # °C tolerance
    "oil_pressure": 0.45,       # bar tolerance
    "oil_temperature": 10.0,    # °C tolerance
    "fuel_flow": 3.0,           # L/h tolerance
    "vibration": 2.5,           # mm/s tolerance
    "throttle": 5.0,            # % tolerance
    "battery_voltage": 0.8,     # V tolerance
}

# Display labels and units
SENSOR_METADATA: Dict[str, Dict[str, str]] = {
    "rpm": {"label": "Engine Speed (RPM)", "unit": "RPM"},
    "cht": {"label": "Cylinder Head Temp (CHT)", "unit": "°C"},
    "egt": {"label": "Exhaust Gas Temp (EGT)", "unit": "°C"},
    "oil_pressure": {"label": "Oil Pressure", "unit": "bar"},
    "oil_temperature": {"label": "Oil Temperature", "unit": "°C"},
    "fuel_flow": {"label": "Fuel Flow Rate", "unit": "L/h"},
    "vibration": {"label": "Engine Vibration RMS", "unit": "mm/s"},
    "throttle": {"label": "Throttle Position", "unit": "%"},
    "battery_voltage": {"label": "Bus Battery Voltage", "unit": "V"},
}

def estimate_nominal_baselines(telemetry: Dict[str, Any]) -> Dict[str, float]:
    """Estimate physics-informed nominal baseline values for a given operating point.
    
    Uses throttle, altitude, and ambient temperature to establish expected nominal targets.
    """
    throttle = float(telemetry.get("throttle") or 0.0)
    altitude = float(telemetry.get("altitude") or 0.0)
    ambient = float(telemetry.get("ambient_temperature") or 15.0)

    # When engine is offline or at zero throttle/RPM
    observed_rpm = float(telemetry.get("rpm") or 0.0)
    if observed_rpm <= 500.0 or throttle <= 5.0:
        return {
            "rpm": 0.0,
            "cht": max(ambient, 20.0),
            "egt": max(ambient, 20.0),
            "oil_pressure": 0.0,
            "oil_temperature": max(ambient, 20.0),
            "fuel_flow": 0.0,
            "vibration": 0.5,
            "throttle": throttle,
            "battery_voltage": 27.8,
        }

    # Operating engine: baseline polynomial approximations
    t_ratio = min(1.0, max(0.0, throttle / 100.0))

    # Expected RPM at given throttle (idle ~2000 RPM up to ~5500 RPM cruise)
    expected_rpm = 2000.0 + t_ratio * 3500.0

    # CHT nominal curve: ~95°C cruise up to ~125°C high power, slightly affected by ambient
    expected_cht = 95.0 + t_ratio * 25.0 + (ambient - 15.0) * 0.25

    # EGT nominal curve: ~760°C up to ~835°C
    expected_egt = 760.0 + t_ratio * 75.0

    # Oil pressure nominal: ~2.8 to 4.2 bar depending on RPM
    rpm_ratio = min(1.0, max(0.0, observed_rpm / 5800.0))
    expected_oil_pressure = 2.6 + rpm_ratio * 1.4

    # Oil temperature: ~85°C to 102°C
    expected_oil_temp = 85.0 + t_ratio * 16.0 + (ambient - 15.0) * 0.2

    # Fuel flow: ~7 L/h idle up to ~28 L/h high continuous
    expected_fuel_flow = 7.0 + t_ratio * 21.0

    # Vibration nominal: ~4.5 to ~8.5 mm/s
    expected_vibration = 4.5 + t_ratio * 4.0

    # Battery voltage: ~28.0 V on standard 28V military bus
    expected_voltage = 28.0

    return {
        "rpm": round(expected_rpm, 1),
        "cht": round(expected_cht, 1),
        "egt": round(expected_egt, 1),
        "oil_pressure": round(expected_oil_pressure, 2),
        "oil_temperature": round(expected_oil_temp, 1),
        "fuel_flow": round(expected_fuel_flow, 1),
        "vibration": round(expected_vibration, 1),
        "throttle": round(throttle, 1),
        "battery_voltage": round(expected_voltage, 1),
    }

def calculate_sensor_deviations(
    telemetry: Dict[str, Any],
    baselines: Dict[str, float]
) -> Tuple[List[SensorDeviation], Dict[str, float]]:
    """Compute residuals and normalized deviation scores for each sensor."""
    deviations: List[SensorDeviation] = []
    normalized_scores: Dict[str, float] = {}

    for key, tol in SENSOR_TOLERANCES.items():
        actual = float(telemetry.get(key) or 0.0)
        expected = baselines.get(key, actual)
        residual = actual - expected

        # Residual percentage relative to expected (guarded against divide by zero)
        ref = abs(expected) if abs(expected) > 1.0 else 1.0
        residual_pct = (residual / ref) * 100.0

        # Normalized Z-score equivalent
        z = abs(residual) / tol
        # Bound score between 0.0 and 1.0 (z >= 3.0 represents 100% anomaly saturation)
        score = min(1.0, z / 3.0)
        normalized_scores[key] = score

        # Status tag
        if z > 2.5:
            dev_status = "CRITICAL"
        elif z > 1.4:
            dev_status = "WARNING"
        else:
            dev_status = "NORMAL"

        meta = SENSOR_METADATA.get(key, {"label": key, "unit": ""})
        deviations.append(
            SensorDeviation(
                sensor=key,
                label=meta["label"],
                actual=round(actual, 2),
                expected_nominal=round(expected, 2),
                residual=round(residual, 2),
                residual_pct=round(residual_pct, 1),
                status=dev_status,
                unit=meta["unit"],
            )
        )

    return deviations, normalized_scores

def compute_xai_attributions(normalized_scores: Dict[str, float]) -> Dict[str, float]:
    """Calculate Explainable AI (XAI) feature attribution percentages (sum to 100%).
    
    Uses squared normalized deviation weights to reflect relative importance of each
    sensor's deviation in driving the anomaly decision.
    """
    squared_sum = sum(s ** 2 for s in normalized_scores.values())
    if squared_sum <= 1e-6:
        # Uniform baseline when all nominal
        n = len(normalized_scores)
        return {k: round(100.0 / n, 1) for k in normalized_scores.keys()}

    attributions: Dict[str, float] = {}
    for key, score in normalized_scores.items():
        pct = (score ** 2 / squared_sum) * 100.0
        attributions[key] = round(pct, 1)

    return attributions

def classify_fault(
    telemetry: Dict[str, Any],
    baselines: Dict[str, float],
    deviations_dict: Dict[str, float]
) -> Tuple[Optional[str], Optional[str], str, float, str, str, str]:
    """Classify failure mode based on multi-sensor signature rules.
    
    Returns:
        (fault_name, fault_code, severity, confidence, description, root_cause, recommended_action)
    """
    rpm = float(telemetry.get("rpm") or 0.0)
    cht = float(telemetry.get("cht") or 0.0)
    egt = float(telemetry.get("egt") or 0.0)
    oil_pressure = float(telemetry.get("oil_pressure") or 0.0)
    oil_temp = float(telemetry.get("oil_temperature") or 0.0)
    vibration = float(telemetry.get("vibration") or 0.0)
    throttle = float(telemetry.get("throttle") or 0.0)
    fuel_flow = float(telemetry.get("fuel_flow") or 0.0)
    voltage = float(telemetry.get("battery_voltage") or 28.0)

    # Engine offline / standstill
    if rpm <= 500.0:
        return (
            None,
            None,
            "NORMAL",
            0.95,
            "Powertrain is in cold standstill or shut down. No active anomalies detected.",
            "Engine speed is zero or sub-idle. All thermal and mechanical parameters reflect ambient state.",
            "Prior to next sortie, conduct standard pre-flight run-up and magneto check sequence."
        )

    # 1. Oil System Degradation / Bearing Thermal Runaway
    if oil_pressure < 2.0 or (oil_pressure < 2.5 and oil_temp > 108.0):
        is_crit = oil_pressure < 1.7 or oil_temp > 118.0
        sev = "CRITICAL" if is_crit else "WARNING"
        conf = 0.94 if is_crit else 0.88
        return (
            "OIL_SYSTEM_DEGRADATION",
            "FLT-OIL-003",
            sev,
            conf,
            f"Active lubrication degradation: Oil pressure collapsed to {oil_pressure:.2f} bar with oil temperature at {oil_temp:.1f}°C.",
            "Oil pump relief valve failure, lubrication line fracture, or thermal oil breakdown causing hydrodynamic bearing friction runaway.",
            "IMMEDIATE PILOT ACTION: Reduce throttle to minimum sustaining level to limit bearing load. Plan immediate divert or emergency forced landing."
        )

    # 2. Spark Plug Fouling / Ignition Misfire
    if vibration > 12.5 and (egt < 720.0 or abs(egt - baselines["egt"]) > 60.0) and throttle > 40.0:
        is_crit = vibration > 16.0
        sev = "CRITICAL" if is_crit else "WARNING"
        conf = 0.91 if is_crit else 0.85
        return (
            "IGNITION_MISFIRE",
            "FLT-IGN-001",
            sev,
            conf,
            f"Combustion irregularity detected: High vibration RMS ({vibration:.1f} mm/s) accompanied by EGT divergence ({egt:.1f}°C).",
            "Lead or carbon fouling across cylinder spark plug electrodes, cracked ignition lead, or CDI magneto timing desynchronization.",
            "Switch ignition channel selection if dual-CDI switchable. Reduce throttle to reduce torsional oscillation across prop shaft. Abort high-load maneuvers."
        )

    # 3. Turbocharger Boost Leak / Wastegate Stiction
    if throttle > 70.0 and (baselines["rpm"] - rpm >= 400.0) and fuel_flow > 20.0:
        return (
            "TURBO_BOOST_LEAK",
            "FLT-TRB-002",
            "WARNING",
            0.87,
            f"Turbocharger power deficit: Commanded throttle is {throttle:.0f}% but engine speed lags at {rpm:.0f} RPM despite high fuel flow ({fuel_flow:.1f} L/h).",
            "Intercooler hose clamp rupture, compressor charge leak, or wastegate flap stiction preventing nominal manifold boost pressure development.",
            "Maintain level flight attitude. Do not initiate climb. Account for reduced climb gradient and transition to visual descent corridor."
        )

    # 4. Cylinder Overheat / Heat Rejection Deficit
    if cht > 135.0:
        is_crit = cht > 142.0
        sev = "CRITICAL" if is_crit else "WARNING"
        conf = 0.92 if is_crit else 0.86
        return (
            "COOLING_DEGRADATION",
            "FLT-COOL-004",
            sev,
            conf,
            f"Cylinder head thermal barrier excursion: CHT reached {cht:.1f}°C (exceeds 135°C nominal threshold).",
            "Cooling jacket air-ducting blockage, coolant pump cavitation, or extreme lean cylinder mixture thermal load.",
            "Increase UAV forward airspeed to augment ram-air cooling. Lower flight climb rate. Retract cowl flaps if equipped."
        )

    # 5. Fuel Starvation / Lean Burn Anomaly
    if throttle > 60.0 and fuel_flow < 14.0 and egt > 870.0:
        return (
            "FUEL_STARVATION",
            "FLT-FUEL-005",
            "CRITICAL",
            0.93,
            f"Critical lean burn anomaly: Fuel flow is restricted to {fuel_flow:.1f} L/h at {throttle:.0f}% throttle, driving EGT to {egt:.1f}°C.",
            "In-line fuel filter restriction, vapor lock in high-altitude fuel rail, or mechanical fuel pump suction cavitation.",
            "Activate auxiliary electric booster pump immediately. Transition to lower altitude to elevate fuel vapor pressure. Avoid throttle transients."
        )

    # 6. Electrical Bus Sag / Alternator Dropout
    if voltage < 25.0:
        is_crit = voltage < 22.5
        sev = "CRITICAL" if is_crit else "WARNING"
        conf = 0.95
        return (
            "ELECTRICAL_UNDERVOLTAGE",
            "FLT-ELEC-006",
            sev,
            conf,
            f"Tactical bus undervoltage: Bus voltage dropped to {voltage:.1f} V (nominal: 28.0 V).",
            "Engine-driven alternator stator short, regulator-rectifier burnout, or excessive flight avionics load shedding failure.",
            "Shed auxiliary optical payloads (EO/IR) and secondary RF relays immediately to conserve primary battery reserve for ECU and flight control servos."
        )

    # 7. Isolated High Vibration Advisory
    if vibration > 12.0:
        return (
            "MECHANICAL_VIBRATION",
            "FLT-VIB-007",
            "ADVISORY",
            0.80,
            f"Elevated airframe vibration: Measured RMS is {vibration:.1f} mm/s (nominal < 12.0 mm/s).",
            "Propeller blade dynamic imbalance, loose engine rubber mount dampeners, or gearbox planetary backlash.",
            "Avoid harmonic resonant RPM range. Inspect engine mount isolators during next post-flight turnaround."
        )

    # 8. Nominal State
    return (
        None,
        None,
        "NORMAL",
        0.96,
        "All monitored powerplant sensors are operating within nominal thermodynamic and operational baselines.",
        "No mechanical, combustion, or lubrication anomalies detected.",
        "Continue planned UAV mission profile. Maintain routine instrument scan."
    )

def evaluate_telemetry_diagnosis(
    engine_id: str,
    telemetry: Dict[str, Any],
    timestamp: Optional[datetime] = None,
    is_simulated: bool = False
) -> DiagnosisResult:
    """Core entry point for real-time fault diagnosis and Explainable AI analysis."""
    eval_time = timestamp or datetime.now(timezone.utc)
    rpm = float(telemetry.get("rpm") or 0.0)
    is_operational = rpm > 500.0

    # 1. Estimate physics-informed baselines
    baselines = estimate_nominal_baselines(telemetry)

    # 2. Calculate residuals & normalized deviation scores
    deviations, normalized_scores = calculate_sensor_deviations(telemetry, baselines)

    # 3. Calculate Explainable AI (XAI) feature attributions
    feature_attributions = compute_xai_attributions(normalized_scores)

    # 4. Deterministic multi-class fault classification
    (
        fault_name,
        fault_code,
        severity,
        confidence,
        description,
        root_cause,
        recommended_action
    ) = classify_fault(telemetry, baselines, normalized_scores)

    # 5. Composite Anomaly Score (0.00 to 1.00)
    max_dev = max(normalized_scores.values()) if normalized_scores else 0.0
    mean_dev = sum(normalized_scores.values()) / len(normalized_scores) if normalized_scores else 0.0

    if not is_operational:
        anomaly_score = 0.0
        health_index = 100.0
    elif severity == "CRITICAL":
        anomaly_score = round(min(1.0, 0.70 + 0.30 * max_dev), 2)
        health_index = round(max(5.0, 100.0 * (1.0 - anomaly_score)), 1)
    elif severity == "WARNING":
        anomaly_score = round(min(0.85, 0.40 + 0.45 * max_dev), 2)
        health_index = round(max(25.0, 100.0 * (1.0 - anomaly_score)), 1)
    elif severity == "ADVISORY":
        anomaly_score = round(min(0.50, 0.20 + 0.30 * max_dev), 2)
        health_index = round(max(60.0, 100.0 * (1.0 - anomaly_score)), 1)
    else:
        anomaly_score = round(min(0.20, 0.5 * max_dev + 0.5 * mean_dev), 2)
        health_index = round(max(85.0, 100.0 * (1.0 - anomaly_score)), 1)

    active_count = sum(1 for d in deviations if d.status in ("WARNING", "CRITICAL"))

    return DiagnosisResult(
        engine_id=engine_id,
        timestamp=eval_time,
        is_operational=is_operational,
        rpm=round(rpm, 1),
        health_index=health_index,
        anomaly_score=anomaly_score,
        severity=severity,
        primary_fault=fault_name,
        fault_code=fault_code,
        confidence=round(confidence, 2),
        description=description,
        root_cause=root_cause,
        recommended_action=recommended_action,
        feature_attributions=feature_attributions,
        deviations=deviations,
        active_anomalies_count=active_count,
        is_simulated=is_simulated,
    )

def generate_simulation_telemetry(
    engine_id: str,
    scenario: str,
    severity: str = "WARNING"
) -> Dict[str, Any]:
    """Generate a realistic synthetic telemetry packet reflecting a specific fault mode for GCS simulation testing."""
    now = datetime.now(timezone.utc)
    base_rpm = 5150.0
    base_cht = 110.0
    base_egt = 810.0
    base_op = 3.5
    base_ot = 92.0
    base_ff = 23.5
    base_vib = 6.2
    base_thr = 82.0
    base_alt = 2800.0
    base_amb = 12.0
    base_volt = 28.1

    is_crit = severity == "CRITICAL"

    if scenario == "IGNITION_MISFIRE":
        # Vibration spikes, EGT drops on fouled plug side, slight RPM sag
        return {
            "engine_id": engine_id,
            "timestamp": now,
            "rpm": base_rpm - (300.0 if is_crit else 180.0),
            "cht": base_cht + (14.0 if is_crit else 8.0),
            "egt": base_egt - (110.0 if is_crit else 75.0),
            "oil_pressure": base_op,
            "oil_temperature": base_ot + 4.0,
            "fuel_flow": base_ff + 1.5,
            "vibration": 18.2 if is_crit else 14.5,
            "throttle": base_thr,
            "altitude": base_alt,
            "ambient_temperature": base_amb,
            "battery_voltage": base_volt,
        }

    elif scenario == "OIL_SYSTEM_DEGRADATION":
        # Oil pressure collapses, oil temp increases, vibration rises
        return {
            "engine_id": engine_id,
            "timestamp": now,
            "rpm": base_rpm - 150.0,
            "cht": base_cht + 12.0,
            "egt": base_egt + 10.0,
            "oil_pressure": 1.45 if is_crit else 1.85,
            "oil_temperature": 124.0 if is_crit else 114.0,
            "fuel_flow": base_ff,
            "vibration": 14.8 if is_crit else 10.5,
            "throttle": base_thr,
            "altitude": base_alt,
            "ambient_temperature": base_amb,
            "battery_voltage": base_volt,
        }

    elif scenario == "TURBO_BOOST_LEAK":
        # High throttle, but RPM lags significantly, fuel flow high, thermal disparity
        return {
            "engine_id": engine_id,
            "timestamp": now,
            "rpm": 4450.0 if is_crit else 4680.0,
            "cht": base_cht + 16.0,
            "egt": base_egt - 40.0,
            "oil_pressure": 3.1,
            "oil_temperature": base_ot + 6.0,
            "fuel_flow": 26.5,
            "vibration": 7.4,
            "throttle": 88.0,
            "altitude": 3200.0,
            "ambient_temperature": 8.0,
            "battery_voltage": base_volt,
        }

    elif scenario == "COOLING_DEGRADATION":
        # CHT dangerously high
        return {
            "engine_id": engine_id,
            "timestamp": now,
            "rpm": base_rpm,
            "cht": 146.5 if is_crit else 138.2,
            "egt": base_egt + 25.0,
            "oil_pressure": base_op - 0.3,
            "oil_temperature": base_ot + 15.0,
            "fuel_flow": base_ff,
            "vibration": base_vib,
            "throttle": base_thr,
            "altitude": base_alt,
            "ambient_temperature": base_amb + 10.0,
            "battery_voltage": base_volt,
        }

    elif scenario == "FUEL_STARVATION":
        # Fuel flow choked, EGT spikes from severe lean burn
        return {
            "engine_id": engine_id,
            "timestamp": now,
            "rpm": base_rpm - 250.0,
            "cht": base_cht + 18.0,
            "egt": 898.0 if is_crit else 878.0,
            "oil_pressure": base_op,
            "oil_temperature": base_ot + 8.0,
            "fuel_flow": 11.2 if is_crit else 13.4,
            "vibration": 9.5,
            "throttle": 78.0,
            "altitude": base_alt,
            "ambient_temperature": base_amb,
            "battery_voltage": base_volt,
        }

    elif scenario == "ELECTRICAL_UNDERVOLTAGE":
        # Bus voltage drops
        return {
            "engine_id": engine_id,
            "timestamp": now,
            "rpm": base_rpm,
            "cht": base_cht,
            "egt": base_egt,
            "oil_pressure": base_op,
            "oil_temperature": base_ot,
            "fuel_flow": base_ff,
            "vibration": base_vib,
            "throttle": base_thr,
            "altitude": base_alt,
            "ambient_temperature": base_amb,
            "battery_voltage": 21.8 if is_crit else 24.2,
        }

    else:
        # NOMINAL standard operating point
        return {
            "engine_id": engine_id,
            "timestamp": now,
            "rpm": 5200.0,
            "cht": 108.5,
            "egt": 810.0,
            "oil_pressure": 3.5,
            "oil_temperature": 90.0,
            "fuel_flow": 23.0,
            "vibration": 6.0,
            "throttle": 80.0,
            "altitude": 2500.0,
            "ambient_temperature": 15.0,
            "battery_voltage": 28.1,
        }
