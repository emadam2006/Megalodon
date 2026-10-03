from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.auth import User
from app.repositories.auth_repo import auth_repo
from app.schemas.auth import APIKeyCreate, APIKeyRead, APIKeyResponse
from app.services.audit_service import audit_service
from app.services.auth_service import auth_service

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


@router.get("", response_model=List[APIKeyRead])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.is_superuser:
        return await auth_repo.list_all_api_keys(db)
    return await auth_repo.list_user_api_keys(db, user.id)


@router.post("", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    req: APIKeyCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    key_resp = await auth_service.create_api_key(
        db=db,
        user_id=user.id,
        name=req.name,
        permissions=req.permissions,
        rate_limit=req.rate_limit,
        expires_in_days=req.expires_in_days,
    )

    await audit_service.record_action(
        db=db,
        action="CREATE_API_KEY",
        resource="APIKey",
        resource_id=key_resp.id,
        user_id=user.id,
        username=user.username,
        metadata={"name": req.name, "prefix": key_resp.key_prefix},
    )

    return key_resp


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    api_key = await auth_repo.get_by_id(db, key_id)
    if not api_key:
        raise HTTPException(status_code=404, detail="API Key not found")

    if not user.is_superuser and api_key.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    api_key.is_active = False
    await db.commit()

    await audit_service.record_action(
        db=db,
        action="REVOKE_API_KEY",
        resource="APIKey",
        resource_id=key_id,
        user_id=user.id,
        username=user.username,
        metadata={"prefix": api_key.key_prefix},
    )
