from sqlalchemy import Column, Integer, String, Float, DateTime, Index
from datetime import datetime, timezone
from app.database import Base

class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    engine_id = Column(String(64), index=True, nullable=False)
    timestamp = Column(DateTime(timezone=True), index=True, default=lambda: datetime.now(timezone.utc), nullable=False)
    rpm = Column(Float, nullable=False)
    cht = Column(Float, nullable=False)  # Cylinder Head Temperature (°C)
    egt = Column(Float, nullable=False)  # Exhaust Gas Temperature (°C)
    oil_pressure = Column(Float, nullable=False)  # Oil Pressure (bar)
    oil_temperature = Column(Float, nullable=False)  # Oil Temperature (°C)
    fuel_flow = Column(Float, nullable=False)  # Fuel Flow (L/h)
    vibration = Column(Float, nullable=False)  # Engine Vibration RMS (mm/s)
    throttle = Column(Float, nullable=False)  # Throttle position (%)
    ambient_temperature = Column(Float, nullable=False)  # Ambient Air Temp (°C)
    altitude = Column(Float, nullable=False)  # Flight Altitude (m)
    battery_voltage = Column(Float, nullable=False)  # Bus / Battery Voltage (V)

    __table_args__ = (
        Index("ix_telemetry_engine_timestamp", "engine_id", "timestamp"),
    )
