# TwinProp-DX: Physics-Informed Digital Twin & Real-Time Prognostic Health Management for MALE UAV Aero Piston Engines

[![Smart India Hackathon 2026](https://img.shields.io/badge/SIH-2026-orange.svg?style=flat-square)](https://www.sih.gov.in/)
[![Problem Statement](https://img.shields.io/badge/Problem%20Statement-SIH26054-blue.svg?style=flat-square)](https://www.sih.gov.in/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11+-009688.svg?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%205-61DAFB.svg?style=flat-square&logo=react)](https://react.dev/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2017%20%2F%20Supabase-336791.svg?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Deployment Frontend](https://img.shields.io/badge/Frontend%20Deploy-Vercel-black.svg?style=flat-square&logo=vercel)](https://twinprop-dx.vercel.app/)
[![Deployment Backend](https://img.shields.io/badge/Backend%20Deploy-Render-46E3B7.svg?style=flat-square&logo=render)](https://twinprop-dx.onrender.com/)

**TwinProp-DX** is an aerospace-grade, production-deployed prognostic digital twin and health monitoring platform engineered specifically for Medium-Altitude Long-Endurance (MALE) Unmanned Aerial Vehicles (UAVs) powered by turbocharged aero piston engines (Rotax 914 F series). The platform combines zero-dimensional (0D) thermodynamic Mean Value Engine Modeling (MVEM), high-frequency sensor telemetry ingestion, Explainable AI (XAI) multi-class fault classification, physics-informed Remaining Useful Life (RUL) prognostics, and Flight Data Recorder (FDR) mission replay into an integrated Ground Control Station (GCS) operations console.

---

## Live Production Deployments

| Component | Provider / Platform | Production URL |
| :--- | :--- | :--- |
| **GCS Frontend Console** | Vercel (Edge CDN) | [https://twinprop-dx.vercel.app/](https://twinprop-dx.vercel.app/) |
| **Telemetry & Twin API** | Render (Uvicorn / FastAPI) | [https://twinprop-dx.onrender.com/](https://twinprop-dx.onrender.com/) |
| **Interactive API Docs** | Swagger UI / OpenAPI | [https://twinprop-dx.onrender.com/docs](https://twinprop-dx.onrender.com/docs) |
| **System Health Check** | Render Live Health Probe | [https://twinprop-dx.onrender.com/health](https://twinprop-dx.onrender.com/health) |

---

## 1. Problem Statement & SIH Context

### SIH 2026 Problem Statement: `SIH26054`
**Category:** Aerospace / Defense / Unmanned Systems
**Domain:** Digital Twin-based Real-Time Health Monitoring of MALE UAV Aero Piston Engines

MALE UAV platforms (such as the Tapas-BH-201, Archer-NG, and similar defense/surveillance aircraft) execute persistent, multi-hour tactical intelligence, surveillance, and reconnaissance (ISR) sorties at altitudes reaching 20,000 feet. The vast majority of these tactical UAVs rely on four-cylinder, four-stroke turbocharged aero-piston powerplants—predominantly the **Rotax 914 F series**—due to their high power-to-weight ratio and fuel efficiency.

However, operating turbocharged piston engines in extreme flight envelopes introduces severe reliability risks:
1. **Hostile Operating Envelopes:** Rapid throttle transients, severe ambient cooling gradients (-20°C to +45°C), and thin air at high density altitudes severely strain turbocharger wastegate actuators and cylinder thermal management.
2. **Limitations of Conventional Threshold Alerting:** Standard UAV ground stations rely on static single-sensor thresholds (e.g., CHT > 135°C), which fail to catch insidious multi-sensor divergence, incipient bearing breakdown, or wastegate stiction until critical failure occurs in-flight.
3. **Black-Box Maintenance Schedules:** Maintenance remains predominantly reactive or strictly calendar/flight-hour bound (100-hour line inspections, 2,000-hour Time Between Overhaul / TBO), completely blind to the actual cumulative mechanical, thermal, and combustion stresses endured during high-load sorties.

### The TwinProp-DX Solution
TwinProp-DX bridges this operational gap by maintaining a **hybrid digital twin** that executes side-by-side with physical UAV telemetry:
- Synchronizes physical telemetry with a physics-derived 0D thermodynamic engine model.
- Evaluates real-time sensor residuals against expected nominal baselines.
- Performs deterministic multi-class anomaly classification with Explainable AI (XAI) feature attribution.
- Computes stress-accelerated Remaining Useful Life (RUL) with 90% confidence intervals.
- Packages sortie telemetry into a synchronized Flight Data Recorder (FDR) replay deck for comprehensive post-mission debriefing.

---

## 2. Target Propulsion System: Rotax 914 F Specification

TwinProp-DX is calibrated to the certified operational parameters of the **Rotax 914 F series** turbocharged four-stroke aircraft piston engine:

| Specification Parameter | Technical Value / Envelope |
| :--- | :--- |
| **Configuration** | 4-cylinder, 4-stroke horizontally opposed boxer with central camshaft |
| **Displacement** | 1,211.2 cc (73.9 cu in) |
| **Cooling Architecture** | Liquid-cooled cylinder heads / Air-cooled cylinder barrels (Ram-air) |
| **Induction & Boost** | Turbocharged with automatic wastegate and electronic TCU |
| **Continuous Power Rating** | 73.5 kW (100 HP) @ 5,500 RPM / 35.4 inHg (1.20 bar) MAP |
| **Takeoff Power (5 min max)** | 84.5 kW (115 HP) @ 5,800 RPM / 39.9 inHg (1.35 bar) MAP |
| **Critical Altitude** | ~16,000 ft (maintains boost pressure up to critical altitude) |
| **Cylinder Head Temp (CHT)** | 90°C to 135°C (Nominal: ~115°C; Max limit: 135°C) |
| **Exhaust Gas Temp (EGT)** | 750°C to 880°C (Nominal: ~820°C; Max limit: 880°C) |
| **Oil Pressure** | 2.0 to 5.0 bar (Nominal: ~3.8 bar; Minimum operational: 1.5 bar) |
| **Oil Temperature** | 90°C to 110°C (Nominal: ~95°C; Max limit: 130°C) |
| **Fuel Flow Rate** | 18.0 to 28.0 L/h (Typical cruise: ~22–24 L/h) |
| **Baseline Reference TBO** | 2,000 operating hours (OEM reference inspection threshold) |

---

## 3. Key Capabilities & Platform Modules

The TwinProp-DX frontend interface is structured into seven specialized Ground Control Station (GCS) modules:

### 1. Operations Console & Dashboard (`/`)
- **Dynamic Powertrain Health Gauge:** Visual circular indicator driven by real-time diagnostic health scoring (`health_index`). Renders explicit `'N/A'` when diagnostic data is unavailable, avoiding deceptive default values.
- **Real-Time Key Metric Cards:** High-visibility digital readouts for Engine RPM, Cylinder Head Temp (CHT), Exhaust Gas Temp (EGT), Oil Pressure, Vibration RMS, and Fuel Flow.
- **Dynamic Threshold Validation:** Fuel Flow and sensor status are dynamically evaluated against the operational envelope (`normal`, `warning`, `critical`, or `inactive`).
- **Telemetry Performance Chart:** High-frequency Recharts visualizer charting CHT, EGT, RPM, and Oil Pressure trends over recent telemetry frames.
- **Active Sortie Dossier:** Summarizes the active flight mission strictly associated with the selected engine.

### 2. High-Resolution Engine Monitoring (`/monitoring`)
- **11-Channel Sensor Telemetry Matrix:** Comprehensive live metrics covering Engine Speed, CHT, EGT, Oil Pressure, Oil Temp, Fuel Flow, Vibration, Throttle Position, Battery Voltage, Manifold Absolute Pressure (MAP, model-estimated), and Flight Altitude.
- **Chronological Telemetry Stream:** Paginated time-series data table reporting raw sensor values, timestamps, and operating status.
- **Interactive Telemetry Injection Modal:** Allows flight operators to simulate real-time sensor packets and inject flight conditions directly into the engine telemetry database.
- **Powerplant Registration:** Airframe and engine onboarding dialog with unique engine ID and airframe allocation.

### 3. Mission Sortie Registry (`/missions`)
- **Sortie Lifecycle Management:** Tracks mission status across controlled states: `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `ABORTED`.
- **Dynamic Fleet Readiness Calculation:** Evaluates `operational_engines / total_registered_engines` dynamically, displaying percentage readiness and handling empty-fleet states cleanly without dividing by zero.
- **Operational Flight Ceiling Tracker:** Identifies maximum sortie altitude across scheduled and historical flights.
- **Input Validation:** Enforces positive altitude (-500m to 20,000m), verified engine existence, temporal sanity (`end_time >= start_time`), and unique mission IDs (`MSN-YYYY-NNN`).

### 4. Physics-Informed Digital Twin (`/digital-twin`)
- **Zero-Dimensional (0D) Thermodynamic Model:** Simulates internal engine state via Mean Value Engine Modeling (MVEM), estimating indicated mean effective pressure (IMEP), intake manifold density, and combustion cycle efficiency.
- **Turbocharger TCU & Pressure Ratio Analysis:** Models compressor pressure ratios ($PR = P_{boost} / P_{amb}$) and turbocharger boost across variable flight altitudes.
- **Honest Estimation Labeling:** Clearly distinguishes model-derived values (`Estimated MAP / Ratio`, `Model-estimated`) from direct sensor readings (`is_map_estimated`), maintaining data integrity.
- **Subsystem Thermal & Mechanical Balance:** Visualizes component temperature distribution, oil film dissipation, and residual deviation between theoretical model baselines and received telemetry.

### 5. Fault Diagnosis & Explainable AI (XAI) (`/fault-diagnosis`)
- **Deterministic Multi-Class Fault Classification:** Real-time expert rule engine recognizing seven distinct aero-engine failure signatures:
  1. `OIL_SYSTEM_DEGRADATION` (FLT-OIL-003): Lubrication pressure collapse / bearing friction runaway.
  2. `IGNITION_MISFIRE` (FLT-IGN-001): Spark plug electrode fouling / CDI magneto timing desync.
  3. `TURBO_BOOST_LEAK` (FLT-TRB-002): Intercooler hose leak / wastegate actuator stiction.
  4. `COOLING_DEGRADATION` (FLT-COOL-004): Cylinder head thermal barrier excursion (CHT > 135°C).
  5. `FUEL_STARVATION` (FLT-FUEL-005): Lean burn anomaly / fuel pump cavitation at high throttle.
  6. `ELECTRICAL_UNDERVOLTAGE` (FLT-ELEC-006): Alternator stator dropout / tactical 28V bus sag.
  7. `MECHANICAL_VIBRATION` (FLT-VIB-007): Propeller dynamic imbalance / engine mount isolator wear.
- **Residual-to-Severity Consistency:** If sensor residuals exceed tolerance limits, system status automatically escalates from `NORMAL` to `WARNING`.
- **Concurrent Fault Prioritization:** Multiple simultaneous anomalies are ranked deterministically by severity (`CRITICAL` > `WARNING` > `ADVISORY`), confidence, and rule order, reporting the primary fault alongside active concurrent failure modes.
- **Explainable AI (XAI) Attributions:** Normalized feature attribution percentages (summing to 100%) highlighting which sensor channels contributed most to the anomaly detection.

### 6. Remaining Useful Life (RUL) Prognostics (`/rul`)
- **Physics-Informed Stress Accumulation:** Arrhenius-style thermal degradation acceleration, mechanical stress factors, high-boost multipliers, and lubrication penalties.
- **Probabilistic 90% Confidence Intervals:** Outputs $[RUL_{lower}, RUL_{upper}]$ bounds dynamically calibrated to active fault severity and digital twin model fidelity.
- **Subsystem Wear Breakdown:** Individual wear percentages for Cylinder Valves, Piston Rings, Turbocharger Actuator, and Journal Bearings.
- **Inspection Countdown Milestones:** Flight-hour countdowns toward 100-Hour Minor Line Service, 500-Hour Borescope/Valve Inspection, and 2,000-Hour Reference Major Overhaul (TBO).
- **Academic / Advisory Notice:** Explicitly labels RUL estimates as condition-based engineering approximations derived from a 142.5-hour prototype baseline assumption, noting that software estimates do not replace certified OEM or aviation authority airworthiness directives.

### 7. Flight Data Recorder (FDR) Mission Replay (`/mission-replay`)
- **Chronological Sortie Debriefing:** Replays recorded flight telemetry frame-by-frame with synchronized digital twin thermodynamic states.
- **Timeline Scrubber & Variable Playback:** Interactive playback controls with speeds from 0.5x to 10.0x, pause, and step-through capabilities.
- **Correlated Fault Markers:** Synchronizes logged diagnostic events with telemetry frames using a tight temporal correlation window ($\pm 3.5\text{ s}$).
- **Temporal Boundary Isolation:** Sortie replay queries are strictly bounded to the mission's active flight window, preventing future post-flight faults from contaminating historical sortie replays.

---

## 4. System Architecture & Data Flow

```
                      +---------------------------------------+
                      |   UAV Physical Sensors / Sim Source   |
                      |   (RPM, CHT, EGT, Oil, MAP, Altitude) |
                      +-------------------+-------------------+
                                          |
                                          v  HTTP POST /api/telemetry
+-----------------------------------------------------------------------------------+
|                           TwinProp-DX Backend Engine                              |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  | Input Validation   |-->| SQLAlchemy 2.0 ORM    |-->| Database Persistence   |  |
|  | - Engine ID verify |   | - Engine / Telemetry  |   | - PostgreSQL (Supabase)|  |
|  | - Sensor envelope  |   | - Mission / FaultLog  |   | - SQLite Local Fallback|  |
|  +--------------------+   +-----------------------+   +------------------------+  |
|            |                                                                      |
|            v                                                                      |
|  +-----------------------------------------------------------------------------+  |
|  |                 Digital Twin & Diagnostic Evaluation Pipeline               |  |
|  |                                                                             |  |
|  |  +----------------------+  +---------------------+  +--------------------+  |  |
|  |  | 0D Thermodynamic     |  | Residual Evaluation |  | Deterministic XAI  |  |  |
|  |  | Model (MVEM / Turbo) |  | & Anomaly Scoring   |  | Multi-Class Rules  |  |  |
|  |  +----------------------+  +---------------------+  +--------------------+  |  |
|  |            |                          |                         |           |  |
|  |            +--------------------------+-------------------------+           |  |
|  |                                       |                                     |  |
|  |                                       v                                     |  |
|  |                 +-------------------------------------------+               |  |
|  |                 | RUL Prognostics & Arrhenius Stress Engine |               |  |
|  |                 | - 90% Confidence Interval Estimation      |               |  |
|  |                 | - Subsystem Wear Indices & TBO Milestones |               |  |
|  |                 +-------------------------------------------+               |  |
|  +-----------------------------------------------------------------------------+  |
|                                          |                                        |
|                                          v  REST API Endpoints                    |
+------------------------------------------+----------------------------------------+
                                           |
                                           v  Axios HTTP / HTTPS
+-----------------------------------------------------------------------------------+
|                        Ground Control Station (GCS) UI                            |
|                                                                                   |
|   +--------------------+  +--------------------+  +--------------------+          |
|   | Dashboard Console  |  | Engine Monitoring  |  | Mission Registry   |          |
|   +--------------------+  +--------------------+  +--------------------+          |
|   +--------------------+  +--------------------+  +--------------------+          |
|   | Digital Twin View  |  | Fault Diagnosis    |  | RUL Prognostics    |          |
|   +--------------------+  +--------------------+  +--------------------+          |
|   +--------------------------------------------------------------------+          |
|   | Flight Data Recorder (FDR) Synchronized Mission Replay Deck        |          |
|   +--------------------------------------------------------------------+          |
+-----------------------------------------------------------------------------------+
```

---

## 5. Technology Stack

### Backend Architecture
- **Language & Runtime:** Python 3.11+
- **Web Framework:** FastAPI 0.110+ (Asynchronous ASGI framework)
- **Application Server:** Uvicorn 0.28+ (Standard worker process)
- **Object-Relational Mapping:** SQLAlchemy 2.0+ (Declarative models and connection pooling)
- **Data Validation & Typing:** Pydantic v2.6+ & Pydantic Settings
- **Database Engine:** PostgreSQL 17 (Supabase in production) with automatic SQLite fallback for isolated local execution
- **Database Driver:** `psycopg2-binary` 2.9+

### Frontend Architecture
- **Framework & Tooling:** React 18.2+ with Vite 5.1+
- **Routing:** React Router DOM v6.22+ (Single Page Application client routing)
- **HTTP Client:** Axios 1.6+ (Centralized API client with response interceptors and environment detection)
- **Data Visualization:** Recharts 2.12+ (Time-series multi-axis sensor charting)
- **Iconography:** Lucide React 0.359+ (Tactical aerospace icons)
- **Styling Architecture:** Modern Aerospace Dark Design Tokens (`#0b1329` primary canvas, `#151f38` card containers, `#38bdf8` cyan accents, `#f59e0b` amber warnings, `#ef4444` critical highlights)

### DevOps & Infrastructure
- **Containerization:** Docker with multi-stage builds (`frontend-builder` + Python 3.11-slim) and `docker-compose.yml`
- **Reverse Proxy:** Nginx (in standalone frontend container)
- **Continuous Deployment:**
  - Frontend: Vercel with automatic SPA routing rewrites (`vercel.json`)
  - Backend: Render Web Service with automated Git-driven deployments

---

## 6. Repository Directory Structure

```text
TwinProp-DX/
├── .gitignore                     # Git exclusion rules
├── Dockerfile                     # Multi-stage full-stack container build
├── docker-compose.yml             # Local orchestration (PostgreSQL, Backend, Frontend)
├── vercel.json                    # Root Vercel SPA configuration
├── README.md                      # Comprehensive system documentation
│
├── backend/
│   ├── Dockerfile                 # Backend standalone container definition
│   ├── requirements.txt           # Python backend dependencies
│   ├── verify_backend.py          # Local automated API test suite
│   ├── verify_database.py         # Database connectivity verification script
│   ├── .env.example               # Environment variables template
│   │
│   └── app/
│       ├── __init__.py
│       ├── main.py                # FastAPI app initialization, CORS, static SPA serving
│       ├── config.py              # Pydantic Settings configuration & environment parser
│       ├── database.py            # SQLAlchemy engine, session generator & SQLite fallback
│       │
│       ├── models/                # SQLAlchemy Relational Models
│       │   ├── __init__.py
│       │   ├── engine.py          # Engine model (engines table)
│       │   ├── telemetry.py       # Telemetry model (telemetry table with composite index)
│       │   ├── mission.py         # Mission sortie model (missions table)
│       │   └── fault.py           # Diagnostic fault log model (fault_logs table)
│       │
│       ├── schemas/               # Pydantic Validation Schemas
│       │   ├── __init__.py
│       │   ├── engine.py          # EngineCreate, EngineResponse
│       │   ├── telemetry.py       # TelemetryCreate, TelemetryResponse
│       │   ├── mission.py         # MissionCreate, MissionResponse
│       │   ├── fault.py           # SensorDeviation, DiagnosisResult, FaultLogResponse
│       │   ├── digital_twin.py    # DigitalTwinStateResponse, DigitalTwinHistoryResponse
│       │   ├── rul.py             # RULStateResponse, RULTrajectoryResponse, SubsystemWear
│       │   └── replay.py          # ReplayMissionListItem, MissionReplayPackage, ReplayFrame
│       │
│       ├── api/                   # REST API Routers
│       │   ├── __init__.py        # Combined api_router aggregator
│       │   ├── engine.py          # /api/engines endpoints
│       │   ├── telemetry.py       # /api/telemetry endpoints
│       │   ├── missions.py        # /api/missions endpoints
│       │   ├── faults.py          # /api/faults endpoints (diagnosis, logs, simulation)
│       │   ├── digital_twin.py    # /api/digital-twin endpoints
│       │   ├── rul.py             # /api/rul endpoints
│       │   └── replay.py          # /api/replay endpoints
│       │
│       └── services/              # Core Physics & Prognostic Computational Engines
│           ├── __init__.py
│           ├── digital_twin_service.py # 0D MVEM thermodynamic engine cycle & turbo modeling
│           ├── fault_service.py        # Residual analysis, XAI attribution, multi-fault logic
│           ├── rul_service.py          # Arrhenius stress multipliers & RUL confidence bounds
│           ├── replay_service.py       # FDR sortie package assembly & fault marker sync
│           └── health_service.py       # Legacy health interface adapter
│
├── frontend/
│   ├── package.json               # Frontend dependencies & build scripts
│   ├── vite.config.js             # Vite development server & proxy configuration
│   ├── vercel.json                # Frontend Vercel SPA client rewrite configuration
│   ├── nginx.conf                 # Production Nginx reverse proxy configuration
│   ├── index.html                 # HTML entry point with aerospace font links
│   │
│   └── src/
│       ├── main.jsx               # React DOM entry point
│       ├── App.jsx                # SPA routing, Layout, and Global Footer branding
│       ├── index.css              # Aerospace design tokens, CSS variables, and utility classes
│       │
│       ├── components/            # Reusable UI Components
│       │   ├── Header.jsx         # GCS top header with live backend status badge
│       │   ├── Sidebar.jsx        # Navigation sidebar with status badges
│       │   ├── MetricCard.jsx     # High-contrast aerospace sensor card
│       │   ├── TelemetryChart.jsx # Multi-series sensor telemetry Recharts visualizer
│       │   └── Navbar.jsx         # Auxiliary navbar component
│       │
│       ├── pages/                 # Full-Page GCS Modules
│       │   ├── Dashboard.jsx        # Operations console with health gauge & active sortie
│       │   ├── EngineMonitoring.jsx # High-res sensor matrix & telemetry injection
│       │   ├── Missions.jsx         # Mission sortie registry & fleet readiness
│       │   ├── DigitalTwin.jsx      # Physics-informed digital twin thermodynamic model
│       │   ├── FaultDiagnosis.jsx   # XAI fault classification, residuals & scenario simulator
│       │   ├── RULPrediction.jsx    # RUL prognostics, Arrhenius stress & TBO countdowns
│       │   ├── MissionReplay.jsx    # FDR debriefing console with scrubber & fault markers
│       │   └── PlaceholderModule.jsx# Auxiliary placeholder template
│       │
│       ├── services/
│       │   └── api.js             # Centralized Axios client & API integration methods
│       │
│       └── context/
│           └── ThemeContext.jsx   # Aerospace theme context provider
│
└── database/
    └── init.sql                   # Standalone PostgreSQL initialization & indexing script
```

---

## 7. REST API Endpoint Reference

The backend exposes **21 REST API endpoints** (19 under `/api` across the 6 propulsion and mission routers, plus 2 root service and system health probes):

### System & Health Endpoints
| Method | Endpoint | Description | Query / Body | Response Status & Type |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Root service identifier / SPA index | None | `200 OK` (JSON or HTML) |
| `GET` | `/health` | System and database connectivity check | None | `200 OK` (`{"status": "healthy", "database": "connected"}`) |

### Engine Registry Endpoints (`/api/engines`)
| Method | Endpoint | Description | Request Body | Response Type |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/engines` | List all registered UAV aero engines | None | `Array<EngineResponse>` |
| `GET` | `/api/engines/{engine_id}` | Retrieve specific engine metadata | None | `EngineResponse` (404 if not found) |
| `POST` | `/api/engines` | Register a new aero engine | `EngineCreate` JSON | `201 Created` (`EngineResponse`) |

### Telemetry Endpoints (`/api/telemetry`)
| Method | Endpoint | Description | Query / Body | Response Type |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/telemetry/{engine_id}` | Historical telemetry records | `?limit=100&offset=0` | `Array<TelemetryResponse>` |
| `GET` | `/api/telemetry/{engine_id}/latest` | Most recent telemetry packet | None | `TelemetryResponse` (404 if no data) |
| `POST` | `/api/telemetry` | Ingest real-time / simulated packet | `TelemetryCreate` JSON | `201 Created` (404 if engine nonexistent) |

### Mission Sortie Endpoints (`/api/missions`)
| Method | Endpoint | Description | Request Body | Response Type |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/missions` | List all scheduled & recorded missions | None | `Array<MissionResponse>` |
| `GET` | `/api/missions/{mission_id}` | Retrieve specific mission sortie | None | `MissionResponse` (404 if not found) |
| `POST` | `/api/missions` | Create mission with validation | `MissionCreate` JSON | `201 Created` (404 engine, 422 validations) |

### Diagnostic & Anomaly Endpoints (`/api/faults`)
| Method | Endpoint | Description | Request / Query | Response Type |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/faults/{engine_id}/diagnosis` | Real-time XAI diagnosis & residuals | None | `DiagnosisResult` |
| `GET` | `/api/faults/{engine_id}` | Retrieve logged historical faults | `?limit=50&severity=&unacknowledged_only=` | `Array<FaultLogResponse>` |
| `POST` | `/api/faults/{fault_id}/acknowledge`| Acknowledge an active logged fault | None | `FaultLogResponse` |
| `POST` | `/api/faults/simulate` | Inject synthetic failure scenario | `FaultSimulateRequest` JSON | `201 Created` (`DiagnosisResult`) |

### Physics Digital Twin Endpoints (`/api/digital-twin`)
| Method | Endpoint | Description | Query Params | Response Type |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/digital-twin/{engine_id}` | Current 0D thermodynamic twin state | None | `DigitalTwinStateResponse` |
| `GET` | `/api/digital-twin/{engine_id}/history` | Historical twin state trajectory | `?limit=25` | `DigitalTwinHistoryResponse` |

### Prognostics & RUL Endpoints (`/api/rul`)
| Method | Endpoint | Description | Query Params | Response Type |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/rul/{engine_id}` | Physics-informed RUL & confidence | None | `RULStateResponse` |
| `GET` | `/api/rul/{engine_id}/trajectory` | Multi-step degradation projection | None | `RULTrajectoryResponse` |

### Flight Data Recorder Replay Endpoints (`/api/replay`)
| Method | Endpoint | Description | Request | Response Type |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/replay/missions` | List missions with telemetry counts | None | `Array<ReplayMissionListItem>` |
| `GET` | `/api/replay/missions/{mission_id}` | Full FDR mission replay package | None | `MissionReplayPackage` |

---

## 8. Data Trust, Validation & Reliability Guarantees

TwinProp-DX enforces strict engineering safeguards across both backend services and frontend presentations:

1. **Strict Engine Verification on Ingestion:**
   `POST /api/telemetry` validates the target `engine_id` against registered engines in the database. Ingesting telemetry for an unregistered engine ID is rejected immediately with `HTTP 404 Not Found`.
2. **Comprehensive Mission Parameter Validation:**
   `POST /api/missions` enforces:
   - Target engine presence in database (`HTTP 404`).
   - Temporal sanity: `end_time >= start_time` (`HTTP 422`).
   - Altitude operating ceiling: $-500\text{ m} \le \text{altitude} \le 20,000\text{ m}$ (`HTTP 422`).
   - Controlled status state machine: `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `ABORTED` (`HTTP 422`).
   - Backend-controlled unique ID generation (`MSN-YYYY-NNN`) with concurrency collision retry.
3. **No False-Normal Diagnostic States:**
   In `fault_service.py`, if classified fault status is `NORMAL` but individual sensor residuals exceed warning or critical tolerance bands, overall diagnostic severity automatically escalates to `WARNING`.
4. **Deterministic Multi-Fault Ranking:**
   When simultaneous failure conditions trigger (e.g., lubrication breakdown concurrent with high airframe vibration), the diagnostic engine sorts faults deterministically by severity weight (`CRITICAL` > `WARNING` > `ADVISORY`), confidence, and rule order, reporting the primary fault alongside concurrent active codes and advisories.
5. **No Fabricated Health Metrics:**
   If an engine has no telemetry or diagnostic evaluation available, the dashboard circular health gauge renders explicit `'N/A'` rather than defaulting to an unearned 100%.
6. **Temporal Isolation in Mission Replay:**
   Flight Data Recorder replay packages query fault logs strictly within the boundaries of the sortie's recorded window (`window_start` to `window_end`). Post-sortie faults occurring hours later cannot bleed into or contaminate historical flight replay data.
7. **Transparent Estimation Disclaimers:**
   Values that are not directly measured by telemetry sensors (e.g., Manifold Absolute Pressure / MAP when flying without an optional bus transducer) are explicitly labeled with `Estimated MAP` and `Model-estimated`.

---

## 9. Local Development & Installation Guide

### Prerequisites
- **Python:** Version 3.11 or higher
- **Node.js:** Version 18.x or higher (with `npm`)
- **Git**

### Step 1: Clone Repository
```bash
git clone https://github.com/Monika-Srinithi/TwinProp-DX.git
cd TwinProp-DX
```

### Step 2: Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run syntax/compile verification
python -m compileall app

# Start local FastAPI backend (uses SQLite fallback if no PostgreSQL DATABASE_URL is set)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The local API documentation will be available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Step 3: Frontend Setup
Open a separate terminal:
```bash
cd TwinProp-DX/frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The GCS Dashboard will open at: [http://localhost:5173](http://localhost:5173) (configured to proxy `/api` requests to `http://127.0.0.1:8000`).

### Step 4: Verification Suite
To run the automated backend verification script against the running server:
```bash
cd backend
python verify_backend.py
```

---

## 10. Docker Containerization Guide

The repository includes complete Docker container orchestration for full-stack deployment:

### Multi-Container Setup via Docker Compose
To build and start PostgreSQL, FastAPI Backend, and React Frontend in isolated containers:
```bash
cd TwinProp-DX
docker compose up --build
```

**Services Launched:**
- **Frontend GCS:** `http://localhost:3000`
- **FastAPI Backend:** `http://localhost:8000`
- **Interactive OpenAPI Docs:** `http://localhost:8000/docs`
- **PostgreSQL Database:** `localhost:5432` (`twinprop` database initialized via `database/init.sql`)

---

## 11. Database Schema & Relational Indexing

The platform utilizes four core relational tables:

```
+--------------------+       +------------------------------------+
|      engines       |       |             telemetry              |
+--------------------+       +------------------------------------+
| id (PK)            | 1   * | id (PK)                            |
| engine_id (UNIQUE) |<------| engine_id (FK reference)           |
| engine_type        |       | timestamp (DESC)                   |
| aircraft_id        |       | rpm, cht, egt, oil_pressure, etc.  |
| status             |       +------------------------------------+
| created_at         |                  ^
+--------------------+                  |
        | 1                             | 1
        |                               |
        v *                             v *
+--------------------+       +------------------------------------+
|      missions      |       |             fault_logs             |
+--------------------+       +------------------------------------+
| id (PK)            |       | id (PK)                            |
| mission_id (UNIQUE)|       | engine_id (FK reference)           |
| engine_id          |       | timestamp (DESC)                   |
| start_time         |       | severity (NORMAL/WARN/CRITICAL)    |
| end_time           |       | fault_code, fault_type             |
| altitude           |       | anomaly_score, confidence          |
| status             |       | feature_attributions (JSON)        |
+--------------------+       +------------------------------------+
```

- **Optimized Composite Indexes:**
  - `telemetry(engine_id, timestamp DESC)`: Enables sub-millisecond retrieval of the latest telemetry packet and sliding-window historical queries.
  - `fault_logs(engine_id, timestamp DESC)`: Optimizes real-time diagnostic window queries.
  - `missions(mission_id)` and `engines(engine_id)`: Guarantees unique entity identification.

---

## 12. Engineering & Airworthiness Disclaimers

> [!IMPORTANT]
> **ACADEMIC & PROTOTYPE RESEARCH NOTICE:**
> TwinProp-DX is a software research and prototype development platform submitted for the **Smart India Hackathon (SIH 2026)** under Problem Statement `SIH26054`.
> - Remaining Useful Life (RUL) predictions, digital twin thermodynamic states, and diagnostic anomaly scores are **condition-based engineering estimates** calibrated to documented Rotax 914 F reference parameters and prototype baseline assumptions.
> - This software does **NOT** constitute a certified airworthiness release and does **NOT** override, supersede, or replace mandatory scheduled maintenance limits, airworthiness directives (ADs), or service bulletins (SBs) mandated by the engine manufacturer (BRP-Rotax), the FAA, DGCA, or EASA.

---

## 13. Team & Submission Credits

- **Event:** Smart India Hackathon (SIH 2026)
- **Problem Statement ID:** `SIH26054`
- **Project Name:** TwinProp-DX (Digital Twin-based Real-Time Health Monitoring of MALE UAV Aero Piston Engines)
- **Repository:** [https://github.com/Monika-Srinithi/TwinProp-DX](https://github.com/Monika-Srinithi/TwinProp-DX)
- **Release Version:** `v1.0.0` (Production-Deployed Prototype)
