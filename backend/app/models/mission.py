from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime, timezone
from app.database import Base

class Mission(Base):
    __tablename__ = "missions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    mission_id = Column(String(64), unique=True, index=True, nullable=False)
    engine_id = Column(String(64), index=True, nullable=False)
    mission_type = Column(String(64), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    end_time = Column(DateTime(timezone=True), nullable=True)
    altitude = Column(Float, nullable=False)  # Target altitude (m)
    payload = Column(String(128), nullable=False)  # e.g., 'EO/IR Sensor Pod'
    environment = Column(String(128), nullable=False)  # e.g., 'High-Altitude Cold'
    status = Column(String(32), nullable=False, default="PLANNED")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
