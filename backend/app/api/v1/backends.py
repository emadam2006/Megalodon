from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.auth import User
from app.models.gateway import BackendService
from app.repositories.gateway_repo import gateway_repo
from app.schemas.gateway import BackendServiceCreate, BackendServiceRead, BackendServiceUpdate
from app.services.audit_service import audit_service

router = APIRouter(prefix="/backends", tags=["Upstream Backends"])


@router.get("", response_model=List[BackendServiceRead])
async def list_backends(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR", "VIEWER"])),
):
    return await gateway_repo.list_backends(db)


@router.post("", response_model=BackendServiceRead, status_code=status.HTTP_201_CREATED)
async def create_backend(
    req: BackendServiceCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    backend = BackendService(
        name=req.name,
        upstream_url=req.upstream_url,
        health_check_path=req.health_check_path,
        is_active=req.is_active,
        timeout_seconds=req.timeout_seconds,
        weight=req.weight,
    )
    created = await gateway_repo.backend_repo.create(db, backend)

    await audit_service.record_action(
        db=db,
        action="CREATE_BACKEND",
        resource="BackendService",
        resource_id=created.id,
        user_id=user.id,
        username=user.username,
        metadata={"name": created.name, "upstream_url": created.upstream_url},
    )

    return created


@router.put("/{backend_id}", response_model=BackendServiceRead)
async def update_backend(
    backend_id: str,
    req: BackendServiceUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    backend = await gateway_repo.get_backend_by_id(db, backend_id)
    if not backend:
        raise HTTPException(status_code=404, detail="Backend service not found")

    if req.name is not None:
        backend.name = req.name
    if req.upstream_url is not None:
        backend.upstream_url = req.upstream_url
    if req.health_check_path is not None:
        backend.health_check_path = req.health_check_path
    if req.is_active is not None:
        backend.is_active = req.is_active
    if req.timeout_seconds is not None:
        backend.timeout_seconds = req.timeout_seconds
    if req.weight is not None:
        backend.weight = req.weight

    await db.commit()
    await db.refresh(backend)

    await audit_service.record_action(
        db=db,
        action="UPDATE_BACKEND",
        resource="BackendService",
        resource_id=backend.id,
        user_id=user.id,
        username=user.username,
        metadata={"name": backend.name, "upstream_url": backend.upstream_url},
    )

    return backend


@router.delete("/{backend_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_backend(
    backend_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    backend = await gateway_repo.get_backend_by_id(db, backend_id)
    if not backend:
        raise HTTPException(status_code=404, detail="Backend service not found")

    await gateway_repo.backend_repo.delete(db, backend_id)

    await audit_service.record_action(
        db=db,
        action="DELETE_BACKEND",
        resource="BackendService",
        resource_id=backend_id,
        user_id=user.id,
        username=user.username,
        metadata={"name": backend.name},
    )
