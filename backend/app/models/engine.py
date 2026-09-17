from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone
from app.database import Base

class Engine(Base):
    __tablename__ = "engines"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    engine_id = Column(String(64), unique=True, index=True, nullable=False)
    engine_type = Column(String(128), nullable=False)
    aircraft_id = Column(String(64), nullable=False)
    status = Column(String(32), nullable=False, default="OPERATIONAL")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
