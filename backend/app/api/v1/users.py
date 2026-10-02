from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.core.security import hash_password
from app.models.auth import User
from app.repositories.auth_repo import auth_repo
from app.schemas.auth import UserCreate, UserRead
from app.services.audit_service import audit_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserRead])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_roles(["ADMIN"])),
):
    return await auth_repo.get_all(db)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    req: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_roles(["ADMIN"])),
):
    existing = await auth_repo.get_by_username(db, req.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    existing_email = await auth_repo.get_by_email(db, req.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    roles = []
    for r_name in req.role_names:
        role = await auth_repo.get_role_by_name(db, r_name.upper())
        if role:
            roles.append(role)

    new_user = User(
        username=req.username,
        email=req.email,
        hashed_password=hash_password(req.password),
        is_active=True,
        is_superuser=any(r.name == "ADMIN" for r in roles),
        must_change_credentials=True,
        roles=roles,
    )
    user = await auth_repo.create(db, new_user)

    await audit_service.record_action(
        db=db,
        action="CREATE_USER",
        resource="User",
        resource_id=user.id,
        user_id=admin.id,
        username=admin.username,
        metadata={"created_username": user.username, "roles": [r.name for r in roles]},
    )

    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_roles(["ADMIN"])),
):
    user = await auth_repo.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    await auth_repo.delete(db, user_id)
    await audit_service.record_action(
        db=db,
        action="DELETE_USER",
        resource="User",
        resource_id=user_id,
        user_id=admin.id,
        username=admin.username,
        metadata={"deleted_username": user.username},
    )
