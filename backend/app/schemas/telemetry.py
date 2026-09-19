from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional

class TelemetryBase(BaseModel):
    engine_id: str = Field(..., description="Engine identifier, e.g. ENG-ROTAX-914-01")
    rpm: float = Field(..., ge=0, le=7000, description="Engine RPM (Revolutions Per Minute)")
    cht: float = Field(..., ge=-50, le=200, description="Cylinder Head Temperature in °C")
    egt: float = Field(..., ge=-50, le=1200, description="Exhaust Gas Temperature in °C")
    oil_pressure: float = Field(..., ge=0, le=10, description="Engine Oil Pressure in bar")
    oil_temperature: float = Field(..., ge=-50, le=150, description="Engine Oil Temperature in °C")
    fuel_flow: float = Field(..., ge=0, le=100, description="Fuel Flow rate in L/h")
    vibration: float = Field(..., ge=0, le=50, description="Engine vibration RMS in mm/s")
    throttle: float = Field(..., ge=0, le=100, description="Throttle lever position in %")
    ambient_temperature: float = Field(..., ge=-80, le=80, description="Ambient Air Temperature in °C")
    altitude: float = Field(..., ge=-500, le=20000, description="Barometric Altitude in meters")
    battery_voltage: float = Field(..., ge=0, le=40, description="Electrical Bus / Battery Voltage in V")

class TelemetryCreate(TelemetryBase):
    timestamp: Optional[datetime] = Field(default=None, description="Timestamp of telemetry reading; defaults to UTC now if omitted")

class TelemetryResponse(TelemetryBase):
    id: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

