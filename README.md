# TwinProp-DX: Digital Twin-based Real-Time Health Monitoring of MALE UAV Aero Piston Engines

**Smart India Hackathon (SIH 2026) Problem Statement**: SIH26054  
**Project Name**: TwinProp-DX  
**Current Status**: Phase 1 Foundation Architecture (Completed)

---

## 1. Executive Summary & Project Objective

**TwinProp-DX** is an end-to-end aero-propulsion health monitoring and prognostic digital twin platform engineered specifically for Medium-Altitude Long-Endurance (MALE) Unmanned Aerial Vehicles (UAVs) equipped with turbocharged aero-piston powerplants (such as the Rotax 914 F series).

In future phases, TwinProp-DX will deliver:
- High-fidelity physics-based engine thermodynamic simulation.
- Hybrid Digital Twin synchronization (coupling physical telemetry with virtual engine physics).
- AI-driven real-time anomaly detection and fault classification.
- Remaining Useful Life (RUL) estimation with probabilistic confidence intervals.
- Real-time Engine Health Index calculation.
- Explainable Artificial Intelligence (XAI) for fault root-cause attribution.
- Mission environment perturbation simulation ("What-if" analysis).
- Synchronized mission replay and post-flight debriefing.
- Predictive maintenance advisory generator.
- Ground Control Station (GCS) telemetry dashboard.

---

## 2. Phase 1 Scope & Boundary

### What IS Implemented in Phase 1 (Foundation):
- **Decoupled Backend Engine**: Built with Python 3.11+, FastAPI, Uvicorn, and SQLAlchemy.
- **Relational Data Architecture**: PostgreSQL schema definitions and SQLAlchemy ORM models for `Engine`, `Telemetry`, and `Mission`.
- **Relational Indexing**: Optimized multi-column and single-column indexes on `engine_id`, `timestamp DESC`, and `mission_id` for fast time-series retrieval.
- **Strict Pydantic Validation**: Robust input and output schemas guaranteeing type-safety and contract enforcement.
- **RESTful Endpoints**:
  - Root identity (`GET /`) and live system/database health checks (`GET /health`).
  - Engine registry endpoints (`GET /api/engines`, `GET /api/engines/{id}`, `POST /api/engines`).
  - High-frequency telemetry endpoints (`GET /api/telemetry/{id}`, `GET /api/telemetry/{id}/latest`, `POST /api/telemetry`).
  - Mission profile endpoints (`GET /api/missions`, `GET /api/missions/{id}`, `POST /api/missions`).
- **Health Service Interface**: Foundation `services/health_service.py` with explicit `NOT_CALCULATED` contracts.
- **Aerospace Ground Station Frontend**: Built with React, Vite, Axios, Recharts, and React Router, styled with an aerospace dark theme.
  - Live Dashboard with 6 summary telemetry cards (`Engine Status`, `RPM`, `CHT`, `EGT`, `Oil Pressure`, `Vibration`).
  - Engine Monitoring page with complete historical telemetry table, interactive telemetry packet injection, and engine registration modal.
  - Missions page with mission schedule table and mission creation modal.
  - Clear, roadmapped placeholder views for Phase 2–5 modules.
- **Containerization & Deployment**: `docker-compose.yml`, multi-stage frontend Dockerfile, backend Dockerfile, and `init.sql`.

### What is NOT Implemented Yet in Phase 1:
> [!IMPORTANT]  
> To maintain absolute engineering integrity and avoid fabricated intelligence or deceptive mockups, Phase 1 explicitly does **NOT** implement:
> - Physics engine simulation
> - Digital Twin synchronization
> - AI anomaly detection
> - Fault classification
> - Remaining Useful Life (RUL) prediction
> - Mission simulation
> - Mission replay playback
> - Explainable AI (XAI)
> - Edge AI runtime deployment
> 
> These capabilities will be introduced in subsequent phases according to the project roadmap.

---

## 3. Technology Stack

- **Backend**:
  - Python 3.11+
  - FastAPI
  - Uvicorn (ASGI server)
  - SQLAlchemy 2.0 (ORM & connection pooling)
  - Pydantic v2 (Data validation)
  - PostgreSQL 17 (Relational time-series persistence)
  - python-dotenv / Pydantic Settings (Environment management)
- **Frontend**:
  - React 18
  - Vite 5
  - JavaScript (ESNext)
  - Axios (Centralized API HTTP client)
  - Recharts (Telemetry plotting)
  - React Router DOM v6 (SPA routing)
  - Lucide React (Aerospace icons)
- **DevOps & Infrastructure**:
  - Docker & Docker Compose
  - PostgreSQL container initialization scripts
  - Git version control

---

## 4. Project Directory Structure

```text
TwinProp-DX/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                # FastAPI app, CORS, routes & health checks
│   │   ├── config.py              # Environment configuration & settings
│   │   ├── database.py            # SQLAlchemy engine, session maker & get_db
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── engine.py          # Engine SQLAlchemy model
│   │   │   ├── telemetry.py       # Telemetry SQLAlchemy model & composite indexes
│   │   │   └── mission.py         # Mission SQLAlchemy model & indexes
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── engine.py          # Pydantic schemas: EngineCreate, EngineResponse
│   │   │   ├── telemetry.py       # Pydantic schemas: TelemetryCreate, TelemetryResponse
│   │   │   └── mission.py         # Pydantic schemas: MissionCreate, MissionResponse
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── engine.py          # GET /api/engines, POST /api/engines
│   │   │   ├── telemetry.py       # GET /api/telemetry/{id}, POST /api/telemetry
│   │   │   └── missions.py        # GET /api/missions, POST /api/missions
│   │   │
│   │   └── services/
│   │       ├── __init__.py
│   │       └── health_service.py  # Phase 1 health evaluation contract stub
│   │
│   ├── requirements.txt           # Python dependency specifications
│   ├── .env.example               # Template environment configuration
│   ├── .env                       # Local development environment file
│   └── Dockerfile                 # Backend container definition
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx         # Aerospace nav header with live sys/db badge
│   │   │   ├── MetricCard.jsx     # Summary card with live or empty-state readout
│   │   │   └── TelemetryChart.jsx # Recharts time-series telemetry visualizer
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        # GCS Overview & live telemetry cards
│   │   │   ├── EngineMonitoring.jsx # High-res sensor matrix & ingestion modal
│   │   │   ├── Missions.jsx         # Mission registry & creation modal
│   │   │   └── PlaceholderModule.jsx# Clear roadmap placeholder for Phases 2-5
│   │   │
│   │   ├── services/
│   │   │   └── api.js             # Centralized Axios client & API methods
│   │   ├── App.jsx                # Router definition
│   │   ├── main.jsx               # React DOM entry point
│   │   └── index.css              # Aerospace dark palette design tokens
│   │
│   ├── package.json               # Node dependencies & build scripts
│   ├── vite.config.js             # Vite configuration & dev proxy
│   ├── index.html                 # Main HTML template
│   ├── nginx.conf                 # Production Nginx reverse proxy config
│   └── Dockerfile                 # Multi-stage production frontend Dockerfile
│
├── database/
│   └── init.sql                   # Standalone SQL schema and indexing script
│
├── docker-compose.yml             # Container orchestration (Postgres, Backend, Frontend)
├── .gitignore                     # Git exclusion rules
└── README.md                      # Comprehensive system documentation
```

---

## 5. API Endpoint Specifications

| Method | Endpoint | Description | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/` | Root service identifier | None | `{"project": "TwinProp-DX", "status": "online"}` |
| `GET` | `/health` | Health & DB verification | None | `{"status": "healthy", "database": "connected"}` |
| `GET` | `/api/engines` | List all engines | None | `Array<EngineResponse>` |
| `GET` | `/api/engines/{engine_id}` | Get engine by ID | None | `EngineResponse` (404 if not found) |
| `POST` | `/api/engines` | Register engine | `EngineCreate` JSON | `EngineResponse` (201 Created) |
| `GET` | `/api/telemetry/{engine_id}` | Historical telemetry | `?limit=100` | `Array<TelemetryResponse>` |
| `GET` | `/api/telemetry/{engine_id}/latest` | Latest sensor packet | None | `TelemetryResponse` (404 if no data) |
| `POST` | `/api/telemetry` | Ingest sensor packet | `TelemetryCreate` JSON | `TelemetryResponse` (201 Created) |
| `GET` | `/api/missions` | List flight missions | None | `Array<MissionResponse>` |
| `GET` | `/api/missions/{mission_id}` | Get mission by ID | None | `MissionResponse` (404 if not found) |
| `POST` | `/api/missions` | Create flight mission | `MissionCreate` JSON | `MissionResponse` (201 Created) |

---

## 6. How to Run Locally

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- PostgreSQL 14+ (or run via Docker)

### Step 1: Backend Setup
```bash
cd TwinProp-DX/backend

# Create and activate virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Start FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API docs will be available at: `http://localhost:8000/docs`

### Step 2: Frontend Setup
```bash
cd TwinProp-DX/frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The GCS Dashboard will open at: `http://localhost:5173`

---

## 7. How to Run with Docker Compose

To build and run all 3 services (PostgreSQL, FastAPI Backend, React Frontend) in isolated containers:

```bash
cd TwinProp-DX
docker compose up --build
```

- Frontend GCS: `http://localhost:3000`
- FastAPI Backend: `http://localhost:8000`
- Interactive API Docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

---

## 8. Database Schema & Indexing

### `engines` Table
- `id` (INTEGER, Primary Key, Auto-increment)
- `engine_id` (VARCHAR(64), UNIQUE, INDEXED)
- `engine_type` (VARCHAR(128))
- `aircraft_id` (VARCHAR(64))
- `status` (VARCHAR(32))
- `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE)

### `telemetry` Table
- `id` (INTEGER, Primary Key, Auto-increment)
- `engine_id` (VARCHAR(64), INDEXED)
- `timestamp` (TIMESTAMP WITH TIME ZONE, INDEXED)
- `rpm` (FLOAT)
- `cht` (FLOAT) - Cylinder Head Temperature (°C)
- `egt` (FLOAT) - Exhaust Gas Temperature (°C)
- `oil_pressure` (FLOAT) - Oil Pressure (bar)
- `oil_temperature` (FLOAT) - Oil Temperature (°C)
- `fuel_flow` (FLOAT) - Fuel Flow (L/h)
- `vibration` (FLOAT) - Vibration RMS (mm/s)
- `throttle` (FLOAT) - Throttle Position (%)
- `ambient_temperature` (FLOAT) - Ambient Temperature (°C)
- `altitude` (FLOAT) - Flight Altitude (m)
- `battery_voltage` (FLOAT) - Battery Voltage (V)
- **Composite Index**: `(engine_id, timestamp DESC)` for fast latest-reading queries.

### `missions` Table
- `id` (INTEGER, Primary Key, Auto-increment)
- `mission_id` (VARCHAR(64), UNIQUE, INDEXED)
- `engine_id` (VARCHAR(64), INDEXED)
- `mission_type` (VARCHAR(64))
- `start_time`, `end_time` (TIMESTAMP WITH TIME ZONE)
- `altitude` (FLOAT)
- `payload` (VARCHAR(128))
- `environment` (VARCHAR(128))
- `status` (VARCHAR(32))
- `created_at` (TIMESTAMP WITH TIME ZONE)

---

## 9. Next Steps: Phase 2 Architecture Roadmap

1. **Physics-Based Aero-Piston Digital Twin**:
   - Zero-dimensional thermodynamic engine cycle simulation.
   - Mean Value Engine Modeling (MVEM) for intake manifold, cylinder combustion, and exhaust expansion.
   - Turbocharger compressor and turbine map interpolation for high-altitude density compensation.
2. **Telemetry Synchronization**:
   - High-throughput ingestion stream via WebSockets and MQTT.
   - Real-time physics state estimation and Kalman filtering.
3. **AI Anomaly Detection & RUL**:
   - Deep Autoencoder reconstruction error analysis on residual telemetry.
   - Multiclass fault classification (bearing wear, ring sticking, spark degradation).
   - Weibull-based Remaining Useful Life (RUL) prognostic tracking.
