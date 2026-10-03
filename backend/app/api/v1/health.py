import time
from fastapi import APIRouter, Response
import psutil
from sqlalchemy import text

from app.core.database import get_session_maker
from app.core.kafka import event_bus
from app.core.redis import get_redis
from app.core.telemetry import CONTENT_TYPE_LATEST, get_metrics_data

router = APIRouter(tags=["Health & Observability"])
_SERVER_START_TIME = time.time()


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "megalodon-core"}


@router.get("/ready")
async def readiness_check():
    checks = {
        "database": "unknown",
        "redis": "unknown",
        "kafka": "unknown",
    }
    overall_status = "healthy"

    # Database check
    try:
        session_maker = get_session_maker()
        async with session_maker() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception as e:
        checks["database"] = f"error: {str(e)}"
        overall_status = "degraded"

    # Redis check
    try:
        redis_client = await get_redis()
        ping_ok = await redis_client.ping()
        checks["redis"] = "connected" if ping_ok else "unresponsive"
    except Exception as e:
        checks["redis"] = f"error: {str(e)}"
        overall_status = "degraded"

    # Kafka check
    checks["kafka"] = "connected" if event_bus.is_connected else "offline_or_fallback"

    return {
        "status": overall_status,
        "dependencies": checks,
    }


@router.get("/metrics")
async def prometheus_metrics():
    """Exposes standard Prometheus metrics scraper endpoint."""
    return Response(content=get_metrics_data(), media_type=CONTENT_TYPE_LATEST)


@router.get("/metrics/text")
async def metrics_text():
    """Returns raw Prometheus metrics string for native web panel viewer."""
    return {"metrics": get_metrics_data().decode("utf-8")}


@router.get("/system-stats")
async def system_stats():
    """Returns server and runtime telemetry for built-in observability dashboard."""
    uptime_seconds = int(time.time() - _SERVER_START_TIME)
    try:
        memory = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent(interval=None)
        mem_used_mb = round((memory.total - memory.available) / (1024 * 1024), 1)
        mem_total_mb = round(memory.total / (1024 * 1024), 1)
        mem_percent = memory.percent
    except Exception:
        cpu_percent = 0.0
        mem_used_mb = 0.0
        mem_total_mb = 0.0
        mem_percent = 0.0

    return {
        "uptime_seconds": uptime_seconds,
        "cpu_percent": cpu_percent,
        "memory_used_mb": mem_used_mb,
        "memory_total_mb": mem_total_mb,
        "memory_percent": mem_percent,
    }
