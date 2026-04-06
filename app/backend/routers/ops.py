from datetime import datetime, timezone

from core.config import settings
from fastapi import APIRouter, Response, status
from services.database import check_database_health
from services.storage import StorageService

router = APIRouter(prefix="/ops", tags=["ops"])


@router.get("/health/live")
async def liveness_probe():
    return {
        "status": "alive",
        "service": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/ready")
async def readiness_probe(response: Response):
    db_ok = await check_database_health()

    storage_ok = True
    storage_error = None
    try:
        StorageService()
    except Exception as exc:
        storage_ok = False
        storage_error = str(exc)

    checks = {
        "database": "healthy" if db_ok else "unhealthy",
        "storage": "healthy" if storage_ok else "unhealthy",
    }

    if not db_ok or not storage_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "checks": checks,
            "error": storage_error,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    return {
        "status": "ready",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
