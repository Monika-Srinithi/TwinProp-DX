from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON, Index
from datetime import datetime, timezone
from app.database import Base

class FaultLog(Base):
    """Phase 3 Prototype Diagnostic Registry.
    
    Stores anomaly detection findings, deterministic rule-based fault classifications,
    and Explainable AI (XAI) feature attribution vectors.
    
    DISCLAIMER: This is a research and prototyping platform for MALE UAV aero-piston
    engines and is not a certified aviation diagnostic or maintenance system.
    """
    __tablename__ = "fault_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    engine_id = Column(String(64), index=True, nullable=False)
    timestamp = Column(DateTime(timezone=True), index=True, default=lambda: datetime.now(timezone.utc), nullable=False)
    severity = Column(String(32), index=True, nullable=False, default="ADVISORY")  # NORMAL, ADVISORY, WARNING, CRITICAL
    fault_code = Column(String(32), nullable=False)  # e.g., FLT-IGN-001, FLT-TRB-002, FLT-OIL-003
    fault_type = Column(String(64), nullable=False)  # e.g., IGNITION_MISFIRE, TURBO_BOOST_LEAK, etc.
    description = Column(Text, nullable=False)
    anomaly_score = Column(Float, nullable=False, default=0.0)  # 0.0 to 1.0 composite anomaly index
    confidence = Column(Float, nullable=False, default=0.0)  # 0.0 to 1.0
    root_cause = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    feature_attributions = Column(JSON, nullable=True, default=dict)  # XAI attribution weights (e.g., {"oil_pressure": 0.42})
    is_acknowledged = Column(Boolean, nullable=False, default=False)
    is_simulated = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_fault_logs_engine_timestamp", "engine_id", "timestamp"),
    )
