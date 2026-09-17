from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
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

@app.get("/", tags=["Root"])
def read_root():
    """Root endpoint providing platform identity and service status."""
    return {
        "project": "TwinProp-DX",
        "status": "online"
    }

@app.get("/health", tags=["Health"])
def health_check():
    """System health check verifying database and service readiness."""
    db_ok = check_database_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected"
    }
