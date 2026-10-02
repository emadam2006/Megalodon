from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.auth import User
from app.models.gateway import Route
from app.repositories.gateway_repo import gateway_repo
from app.schemas.gateway import RouteCreate, RouteRead
from app.services.audit_service import audit_service

router = APIRouter(prefix="/routes", tags=["Gateway Routes"])


@router.get("", response_model=List[RouteRead])
async def list_routes(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR", "VIEWER"])),
):
    return await gateway_repo.list_routes(db)


@router.post("", response_model=RouteRead, status_code=status.HTTP_201_CREATED)
async def create_route(
    req: RouteCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    backend = await gateway_repo.get_backend_by_id(db, req.backend_service_id)
    if not backend:
        raise HTTPException(status_code=400, detail="Referenced backend service does not exist")

    route = Route(
        name=req.name,
        path_prefix=req.path_prefix,
        methods=req.methods.upper(),
        backend_service_id=req.backend_service_id,
        strip_prefix=req.strip_prefix,
        auth_required=req.auth_required,
        rate_limit_policy_id=req.rate_limit_policy_id,
    )
    created = await gateway_repo.route_repo.create(db, route)

    await audit_service.record_action(
        db=db,
        action="CREATE_ROUTE",
        resource="Route",
        resource_id=created.id,
        user_id=user.id,
        username=user.username,
        metadata={"name": created.name, "prefix": created.path_prefix},
    )

    return await gateway_repo.get_route_by_id(db, created.id)


@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_route(
    route_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    route = await gateway_repo.get_route_by_id(db, route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    await gateway_repo.route_repo.delete(db, route_id)

    await audit_service.record_action(
        db=db,
        action="DELETE_ROUTE",
        resource="Route",
        resource_id=route_id,
        user_id=user.id,
        username=user.username,
        metadata={"name": route.name},
    )
