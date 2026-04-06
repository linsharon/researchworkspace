import os
import shutil
from datetime import datetime, timedelta, timezone

from core.config import settings
from core.database import db_manager
from sqlalchemy import text


async def collect_ops_metrics() -> dict:
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=settings.ops_alert_window_minutes)

    total_requests = 0
    error_requests = 0
    p95_latency_ms = 0

    if db_manager.async_session_maker is not None:
        async with db_manager.async_session_maker() as session:
            total_query = text(
                """
                SELECT COUNT(*)
                FROM activity_events
                WHERE created_at >= :window_start
                """
            )
            total_result = await session.execute(total_query, {"window_start": window_start})
            total_requests = int(total_result.scalar() or 0)

            error_query = text(
                """
                SELECT COUNT(*)
                FROM activity_events
                WHERE created_at >= :window_start
                  AND status_code >= 500
                """
            )
            error_result = await session.execute(error_query, {"window_start": window_start})
            error_requests = int(error_result.scalar() or 0)

            latency_query = text(
                """
                SELECT COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0)
                FROM activity_events
                WHERE created_at >= :window_start
                  AND duration_ms IS NOT NULL
                """
            )
            latency_result = await session.execute(latency_query, {"window_start": window_start})
            p95_latency_ms = int(float(latency_result.scalar() or 0))

    error_rate_pct = (error_requests / total_requests * 100.0) if total_requests else 0.0

    disk = shutil.disk_usage("/")
    disk_usage_pct = ((disk.total - disk.free) / disk.total * 100.0) if disk.total else 0.0

    cpu_usage_pct = 0.0
    try:
        load_avg = os.getloadavg()[0]
        cpu_count = os.cpu_count() or 1
        cpu_usage_pct = max(0.0, min(100.0, load_avg / cpu_count * 100.0))
    except OSError:
        cpu_usage_pct = 0.0

    db_connections = None
    if db_manager.async_session_maker is not None:
        async with db_manager.async_session_maker() as session:
            try:
                db_conn_query = text("SELECT COUNT(*) FROM pg_stat_activity")
                db_conn_result = await session.execute(db_conn_query)
                db_connections = int(db_conn_result.scalar() or 0)
            except Exception:
                db_connections = None

    return {
        "window_minutes": settings.ops_alert_window_minutes,
        "total_requests": total_requests,
        "error_requests": error_requests,
        "error_rate_pct": round(error_rate_pct, 3),
        "p95_latency_ms": p95_latency_ms,
        "disk_usage_pct": round(disk_usage_pct, 2),
        "cpu_usage_pct": round(cpu_usage_pct, 2),
        "db_connections": db_connections,
    }


def evaluate_alerts(metrics: dict) -> list[dict]:
    alerts: list[dict] = []

    if metrics["error_rate_pct"] > settings.alert_error_rate_threshold_pct:
        alerts.append(
            {
                "name": "high_error_rate",
                "level": "critical",
                "value": metrics["error_rate_pct"],
                "threshold": settings.alert_error_rate_threshold_pct,
            }
        )

    if metrics["p95_latency_ms"] > settings.alert_p95_latency_ms_threshold:
        alerts.append(
            {
                "name": "high_p95_latency",
                "level": "warning",
                "value": metrics["p95_latency_ms"],
                "threshold": settings.alert_p95_latency_ms_threshold,
            }
        )

    if metrics["disk_usage_pct"] > settings.alert_disk_usage_threshold_pct:
        alerts.append(
            {
                "name": "high_disk_usage",
                "level": "critical",
                "value": metrics["disk_usage_pct"],
                "threshold": settings.alert_disk_usage_threshold_pct,
            }
        )

    if metrics["cpu_usage_pct"] > settings.alert_cpu_usage_threshold_pct:
        alerts.append(
            {
                "name": "high_cpu_usage",
                "level": "warning",
                "value": metrics["cpu_usage_pct"],
                "threshold": settings.alert_cpu_usage_threshold_pct,
            }
        )

    if (
        metrics["db_connections"] is not None
        and metrics["db_connections"] > settings.alert_db_connections_threshold
    ):
        alerts.append(
            {
                "name": "high_db_connections",
                "level": "critical",
                "value": metrics["db_connections"],
                "threshold": settings.alert_db_connections_threshold,
            }
        )

    return alerts
