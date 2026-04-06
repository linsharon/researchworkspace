from datetime import datetime, timezone

from core.config import settings
from dependencies.auth import get_admin_user
from fastapi import APIRouter, Response, status
from schemas.auth import UserResponse
from services.database import check_database_health
from services.ops_monitor import collect_ops_metrics, evaluate_alerts
from services.storage import StorageService
from fastapi import Depends

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


@router.get("/metrics")
async def ops_metrics(_current_user: UserResponse = Depends(get_admin_user)):
    metrics = await collect_ops_metrics()
    return {
        "status": "ok",
        "metrics": metrics,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/alerts")
async def ops_alerts(_current_user: UserResponse = Depends(get_admin_user)):
    metrics = await collect_ops_metrics()
    alerts = evaluate_alerts(metrics)
    return {
        "status": "alert" if alerts else "ok",
        "alerts": alerts,
        "metrics": metrics,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
