from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.auth import User
from app.schemas.security import AlertCreate, AlertRead, AlertUpdate
from app.services.alert_service import alert_service

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertRead])
async def list_alerts(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await alert_service.list_alerts(db, limit=limit)


@router.post("", response_model=AlertRead, status_code=status.HTTP_201_CREATED)
async def create_alert(
    req: AlertCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    return await alert_service.create_alert(
        db=db,
        title=req.title,
        description=req.description,
        severity=req.severity,
        source=req.source,
        metadata=req.metadata,
    )


@router.patch("/{alert_id}/status", response_model=AlertRead)
async def update_alert_status(
    alert_id: str,
    req: AlertUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    updated = await alert_service.update_status(db, alert_id, req.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Alert not found")
    return updated
