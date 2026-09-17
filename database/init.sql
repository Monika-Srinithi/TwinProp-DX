-- TwinProp-DX Database Initialization Schema
-- SIH26054: Digital Twin-based Real-Time Health Monitoring of MALE UAV Aero Piston Engines

-- 1. ENGINES TABLE
CREATE TABLE IF NOT EXISTS engines (
    id SERIAL PRIMARY KEY,
    engine_id VARCHAR(64) UNIQUE NOT NULL,
    engine_type VARCHAR(128) NOT NULL,
    aircraft_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPERATIONAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_engines_engine_id ON engines (engine_id);

-- 2. TELEMETRY TABLE
CREATE TABLE IF NOT EXISTS telemetry (
    id SERIAL PRIMARY KEY,
    engine_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    rpm DOUBLE PRECISION NOT NULL,
    cht DOUBLE PRECISION NOT NULL,              -- Cylinder Head Temp (°C)
    egt DOUBLE PRECISION NOT NULL,              -- Exhaust Gas Temp (°C)
    oil_pressure DOUBLE PRECISION NOT NULL,     -- Oil Pressure (bar)
    oil_temperature DOUBLE PRECISION NOT NULL,  -- Oil Temp (°C)
    fuel_flow DOUBLE PRECISION NOT NULL,        -- Fuel Flow (L/h)
    vibration DOUBLE PRECISION NOT NULL,        -- Vibration RMS (mm/s)
    throttle DOUBLE PRECISION NOT NULL,         -- Throttle (%)
    ambient_temperature DOUBLE PRECISION NOT NULL, -- Ambient Temp (°C)
    altitude DOUBLE PRECISION NOT NULL,         -- Altitude (m)
    battery_voltage DOUBLE PRECISION NOT NULL   -- Battery Voltage (V)
);

CREATE INDEX IF NOT EXISTS ix_telemetry_engine_id ON telemetry (engine_id);
CREATE INDEX IF NOT EXISTS ix_telemetry_timestamp ON telemetry (timestamp DESC);
CREATE INDEX IF NOT EXISTS ix_telemetry_engine_timestamp ON telemetry (engine_id, timestamp DESC);

-- 3. MISSIONS TABLE
CREATE TABLE IF NOT EXISTS missions (
    id SERIAL PRIMARY KEY,
    mission_id VARCHAR(64) UNIQUE NOT NULL,
    engine_id VARCHAR(64) NOT NULL,
    mission_type VARCHAR(64) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    altitude DOUBLE PRECISION NOT NULL,
    payload VARCHAR(128) NOT NULL,
    environment VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PLANNED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_missions_mission_id ON missions (mission_id);
CREATE INDEX IF NOT EXISTS ix_missions_engine_id ON missions (engine_id);

-- 4. FAULT LOGS TABLE (Phase 3 Prototype Diagnostic Architecture)
CREATE TABLE IF NOT EXISTS fault_logs (
    id SERIAL PRIMARY KEY,
    engine_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'ADVISORY',
    fault_code VARCHAR(32) NOT NULL,
    fault_type VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    anomaly_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    root_cause TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    feature_attributions JSONB DEFAULT '{}'::jsonb,
    is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_fault_logs_engine_id ON fault_logs (engine_id);
CREATE INDEX IF NOT EXISTS ix_fault_logs_timestamp ON fault_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS ix_fault_logs_engine_timestamp ON fault_logs (engine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS ix_fault_logs_severity ON fault_logs (severity);

