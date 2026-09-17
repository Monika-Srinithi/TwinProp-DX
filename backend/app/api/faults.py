from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models.engine import Engine
from app.models.telemetry import Telemetry
from app.models.fault import FaultLog
from app.schemas.fault import (
    DiagnosisResult,
    FaultLogResponse,
    FaultAcknowledgeRequest,
    FaultSimulationRequest,
)
from app.services.fault_service import (
    evaluate_telemetry_diagnosis,
    generate_simulation_telemetry,
)

router = APIRouter(prefix="/faults", tags=["Fault Diagnosis (Phase 3)"])

@router.get("/{engine_id}/diagnosis", response_model=DiagnosisResult)
def get_engine_diagnosis(engine_id: str, db: Session = Depends(get_db)):
    """Run real-time prototype fault diagnosis and Explainable AI (XAI) attribution
    on the most recent telemetry packet for a specified engine.
    
    DISCLAIMER: Prototype system for research/demonstration purposes. Not certified for flight operations.
    """
    engine = db.query(Engine).filter(Engine.engine_id == engine_id).first()
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine '{engine_id}' not found."
        )

    # Fetch latest telemetry reading
    latest = (
        db.query(Telemetry)
        .filter(Telemetry.engine_id == engine_id)
        .order_by(Telemetry.timestamp.desc())
        .first()
    )

    if not latest:
        # Return offline baseline if no telemetry recorded yet
        return DiagnosisResult(
            engine_id=engine_id,
            timestamp=datetime.now(timezone.utc),
            is_operational=False,
            rpm=0.0,
            health_index=100.0,
            anomaly_score=0.0,
            severity="NORMAL",
            primary_fault=None,
            fault_code=None,
            confidence=1.0,
            description=f"No telemetry packets recorded yet for {engine_id}.",
            root_cause="Engine is registered in registry but has not transmitted sensor data.",
            recommended_action="Transmit initial telemetry reading to activate real-time diagnostics.",
            feature_attributions={},
            deviations=[],
            active_anomalies_count=0,
            is_simulated=False,
        )

    # Convert SQLAlchemy model to dictionary
    telemetry_dict = {
        "rpm": latest.rpm,
        "cht": latest.cht,
        "egt": latest.egt,
        "oil_pressure": latest.oil_pressure,
        "oil_temperature": latest.oil_temperature,
        "fuel_flow": latest.fuel_flow,
        "vibration": latest.vibration,
        "throttle": latest.throttle,
        "ambient_temperature": latest.ambient_temperature,
        "altitude": latest.altitude,
        "battery_voltage": latest.battery_voltage,
    }

    # Run diagnostic evaluation
    result = evaluate_telemetry_diagnosis(
        engine_id=engine_id,
        telemetry=telemetry_dict,
        timestamp=latest.timestamp,
        is_simulated=False
    )

    # If an anomaly is identified, persist to fault_logs if not already logged in last 20 seconds
    if result.severity in ("WARNING", "CRITICAL") and result.fault_code:
        recent_log = (
            db.query(FaultLog)
            .filter(
                FaultLog.engine_id == engine_id,
                FaultLog.fault_code == result.fault_code,
                FaultLog.timestamp >= latest.timestamp - timedelta(seconds=20)
            )
            .first()
        )
        if not recent_log:
            new_log = FaultLog(
                engine_id=engine_id,
                timestamp=latest.timestamp,
                severity=result.severity,
                fault_code=result.fault_code,
                fault_type=result.primary_fault or "ANOMALY",
                description=result.description,
                anomaly_score=result.anomaly_score,
                confidence=result.confidence,
                root_cause=result.root_cause,
                recommended_action=result.recommended_action,
                feature_attributions=result.feature_attributions,
                is_acknowledged=False,
                is_simulated=False,
            )
            db.add(new_log)
            db.commit()

    return result

@router.get("/{engine_id}", response_model=List[FaultLogResponse])
def get_fault_history(
    engine_id: str,
    limit: int = Query(50, ge=1, le=200),
    severity: Optional[str] = None,
    unacknowledged_only: bool = False,
    db: Session = Depends(get_db)
):
    """Retrieve logged fault alerts for an engine, ordered chronologically descending."""
    query = db.query(FaultLog).filter(FaultLog.engine_id == engine_id)

    if severity:
        query = query.filter(FaultLog.severity == severity.upper())

    if unacknowledged_only:
        query = query.filter(FaultLog.is_acknowledged == False)

    logs = query.order_by(FaultLog.timestamp.desc()).limit(limit).all()
    return logs

@router.post("/{fault_id}/acknowledge", response_model=FaultLogResponse)
def acknowledge_fault_alert(
    fault_id: int,
    req: FaultAcknowledgeRequest = FaultAcknowledgeRequest(),
    db: Session = Depends(get_db)
):
    """Acknowledge a fault alert by GCS flight operator."""
    fault = db.query(FaultLog).filter(FaultLog.id == fault_id).first()
    if not fault:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fault log with ID '{fault_id}' not found."
        )

    fault.is_acknowledged = req.is_acknowledged
    db.commit()
    db.refresh(fault)
    return fault

@router.post("/simulate", response_model=DiagnosisResult, status_code=status.HTTP_201_CREATED)
def simulate_fault_injection(
    sim_req: FaultSimulationRequest,
    db: Session = Depends(get_db)
):
    """SIMULATION ONLY: Ingest a simulated fault-mode telemetry packet to test
    and demonstrate real-time AI anomaly detection and fault classification.
    
    DISCLAIMER: All packets generated by this endpoint are marked `is_simulated = True`.
    """
    engine = db.query(Engine).filter(Engine.engine_id == sim_req.engine_id).first()
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine '{sim_req.engine_id}' not found."
        )

    # 1. Generate synthetic telemetry for the scenario
    packet = generate_simulation_telemetry(
        engine_id=sim_req.engine_id,
        scenario=sim_req.scenario,
        severity=sim_req.severity or "WARNING"
    )

    # 2. Ingest telemetry record into database
    telemetry_record = Telemetry(
        engine_id=packet["engine_id"],
        timestamp=packet["timestamp"],
        rpm=packet["rpm"],
        cht=packet["cht"],
        egt=packet["egt"],
        oil_pressure=packet["oil_pressure"],
        oil_temperature=packet["oil_temperature"],
        fuel_flow=packet["fuel_flow"],
        vibration=packet["vibration"],
        throttle=packet["throttle"],
        ambient_temperature=packet["ambient_temperature"],
        altitude=packet["altitude"],
        battery_voltage=packet["battery_voltage"],
    )
    db.add(telemetry_record)
    db.commit()
    db.refresh(telemetry_record)

    # 3. Evaluate diagnosis
    diag_result = evaluate_telemetry_diagnosis(
        engine_id=sim_req.engine_id,
        telemetry=packet,
        timestamp=packet["timestamp"],
        is_simulated=True
    )

    # 4. If an anomaly is detected, persist to fault_logs with is_simulated=True
    if diag_result.severity in ("WARNING", "CRITICAL") and diag_result.fault_code:
        sim_log = FaultLog(
            engine_id=sim_req.engine_id,
            timestamp=packet["timestamp"],
            severity=diag_result.severity,
            fault_code=diag_result.fault_code,
            fault_type=diag_result.primary_fault or "SIMULATED_ANOMALY",
            description=f"[SIMULATION] {diag_result.description}",
            anomaly_score=diag_result.anomaly_score,
            confidence=diag_result.confidence,
            root_cause=diag_result.root_cause,
            recommended_action=diag_result.recommended_action,
            feature_attributions=diag_result.feature_attributions,
            is_acknowledged=False,
            is_simulated=True,
        )
        db.add(sim_log)
        db.commit()

    return diag_result
