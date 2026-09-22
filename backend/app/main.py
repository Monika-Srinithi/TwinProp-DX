from pathlib import Path
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import engine, Base, check_database_connection
from app.api import api_router

# Configure structured logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("twinprop.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for database schema verification and startup checks."""
    logger.info(f"Initializing {settings.APP_NAME} Phase 1 backend services...")
    try:
        # Create database tables if not exist
        Base.metadata.create_all(bind=engine)
        logger.info("Database schemas verified and initialized successfully.")
    except Exception as e:
        logger.error(f"Error during schema initialization: {e}")
    yield
    logger.info(f"Shutting down {settings.APP_NAME} services.")

app = FastAPI(
    title="TwinProp-DX API",
    description="Real-Time Health Monitoring and Digital Twin Platform for MALE UAV Aero Piston Engines",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount core API router with configured prefix (default /api)
app.include_router(api_router, prefix=settings.API_PREFIX)

@app.get("/health", tags=["Health"])
def health_check():
    """System health check verifying database and service readiness."""
    db_ok = check_database_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected"
    }

# Determine static directory candidates for the React Vite frontend:
# 1. /app/static (inside container when copied to /app/static)
# 2. backend/static (local backend static directory)
# 3. frontend/dist (direct frontend dist build directory)
STATIC_DIR_CANDIDATES = [
    Path("/app/static"),
    Path(__file__).resolve().parent.parent / "static",
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
]
STATIC_DIR = next((p for p in STATIC_DIR_CANDIDATES if p.is_dir() and (p / "index.html").is_file()), None)

if STATIC_DIR:
    logger.info(f"Serving React frontend static assets from: {STATIC_DIR}")

    # Mount Vite assets directory if it exists
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Prevent intercepting /api or /health routes that weren't matched
        if full_path.startswith("api/") or full_path == "api" or full_path == "health":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")

        # Check if the requested path corresponds to an actual static file in STATIC_DIR
        target_file = STATIC_DIR / full_path
        if full_path and target_file.is_file():
            return FileResponse(target_file)

        # Fallback to index.html for root (full_path == "") and all client-side SPA routes
        index_file = STATIC_DIR / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
else:
    logger.warning("No static frontend directory found. Serving API fallback root.")

    @app.get("/", tags=["Root"])
    def read_root():
        """Fallback root endpoint providing platform identity when static frontend is not present."""
        return {
            "project": "TwinProp-DX",
            "status": "online"
        }
