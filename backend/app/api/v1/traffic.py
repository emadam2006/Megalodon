from typing import List

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.auth import User
from app.schemas.analytics import (
    DashboardMetrics,
    IPDetailResponse,
    PortDetailResponse,
    RequestLogEntry,
)
from app.core.database import get_db
from app.repositories.network_repo import network_repo
from app.services.analytics_service import analytics_service
from app.services.network_service import network_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/traffic", tags=["Traffic & Analytics"])


@router.get("/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(user: User = Depends(get_current_user)):
    return analytics_service.get_dashboard_metrics()


@router.get("/live", response_model=List[RequestLogEntry])
async def get_live_requests(
    limit: int = 50,
    user: User = Depends(get_current_user),
):
    return analytics_service.get_recent_requests(limit=limit)


@router.get("/ip/{ip}", response_model=IPDetailResponse)
async def get_ip_details(
    ip: str,
    user: User = Depends(get_current_user),
):
    return analytics_service.get_ip_details(ip)


@router.get("/port/{port}", response_model=PortDetailResponse)
async def get_port_details(
    port: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    listener = await network_repo.get_listener_by_port(db, port)
    live_connections = network_service.get_live_connections()
    return analytics_service.get_port_details(
        port,
        listener=listener,
        live_connections=live_connections,
    )
