from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional

class TelemetryBase(BaseModel):
    engine_id: str = Field(..., description="Engine identifier, e.g. ENG-ROTAX-914-01")
    rpm: float = Field(..., description="Engine RPM (Revolutions Per Minute)")
    cht: float = Field(..., description="Cylinder Head Temperature in °C")
    egt: float = Field(..., description="Exhaust Gas Temperature in °C")
    oil_pressure: float = Field(..., description="Engine Oil Pressure in bar")
    oil_temperature: float = Field(..., description="Engine Oil Temperature in °C")
    fuel_flow: float = Field(..., description="Fuel Flow rate in L/h")
    vibration: float = Field(..., description="Engine vibration RMS in mm/s")
    throttle: float = Field(..., description="Throttle lever position in %")
    ambient_temperature: float = Field(..., description="Ambient Air Temperature in °C")
    altitude: float = Field(..., description="Barometric Altitude in meters")
    battery_voltage: float = Field(..., description="Electrical Bus / Battery Voltage in V")

class TelemetryCreate(TelemetryBase):
    timestamp: Optional[datetime] = Field(default=None, description="Timestamp of telemetry reading; defaults to UTC now if omitted")

class TelemetryResponse(TelemetryBase):
    id: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
