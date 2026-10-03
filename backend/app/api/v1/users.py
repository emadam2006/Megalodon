from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.models.auth import User
from app.repositories.auth_repo import auth_repo
from app.schemas.auth import UserCreate, UserRead, UserUpdateMe
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


@router.put("/me", response_model=UserRead)
async def update_my_profile(
    req: UserUpdateMe,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Allows authenticated user to update their own username, email, and password."""
    # Username update
    if req.username and req.username != current_user.username:
        existing = await auth_repo.get_by_username(db, req.username)
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=400, detail="Username already in use")
        current_user.username = req.username

    # Email update
    if req.email and req.email != current_user.email:
        existing_email = await auth_repo.get_by_email(db, req.email)
        if existing_email and existing_email.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = req.email

    # Password update
    if req.new_password:
        if not req.current_password:
            raise HTTPException(status_code=400, detail="Current password is required to change password")
        if not verify_password(req.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        current_user.hashed_password = hash_password(req.new_password)
        current_user.must_change_credentials = False

    await db.commit()
    await db.refresh(current_user)

    await audit_service.record_action(
        db=db,
        action="UPDATE_USER_PROFILE",
        resource="User",
        resource_id=current_user.id,
        user_id=current_user.id,
        username=current_user.username,
        metadata={"username": current_user.username, "email": current_user.email},
    )

    return current_user


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
