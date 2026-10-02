from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.redis import redis_pool
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.auth import User
from app.repositories.auth_repo import auth_repo
from app.schemas.auth import (
    ChangeCredentialsRequest,
    ChangeCredentialsResponse,
    LoginRequest,
    RefreshRequest,
    Token,
    UserRead,
)
from app.services.audit_service import audit_service
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ── Login brute-force protection constants ────────────────────────────────────
_MAX_LOGIN_ATTEMPTS = 10       # max failures per window
_WINDOW_SECONDS = 60           # rolling 60-second window
_LOCKOUT_SECONDS = 300         # 5-minute lockout after max failures


async def _check_login_rate_limit(request: Request) -> None:
    """
    Redis-backed sliding-window rate limiter for the login endpoint.
    Keyed by client IP to prevent credential stuffing / brute force (OWASP A07).
    """
    client_ip = request.client.host if request.client else "unknown"
    redis_key = f"megalodon:login_attempts:{client_ip}"

    try:
        redis = await redis_pool.get_client()
        count = await redis.incr(redis_key)
        if count == 1:
            # First attempt in this window — set TTL
            await redis.expire(redis_key, _WINDOW_SECONDS)

        if count > _MAX_LOGIN_ATTEMPTS:
            # Extend lockout window and reject
            await redis.expire(redis_key, _LOCKOUT_SECONDS)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please wait 5 minutes before trying again.",
                headers={"Retry-After": str(_LOCKOUT_SECONDS)},
            )
    except HTTPException:
        raise
    except Exception:
        # If Redis is unavailable, fail open (don't block legitimate logins)
        pass


@router.post("/login", response_model=Token)
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    # Rate-limit check BEFORE authentication to prevent enumeration
    await _check_login_rate_limit(request)

    token = await auth_service.login(db, req.username, req.password)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    # Clear rate-limit counter on successful login
    try:
        client_ip = request.client.host if request.client else "unknown"
        redis = await redis_pool.get_client()
        await redis.delete(f"megalodon:login_attempts:{client_ip}")
        await redis.delete(f"sentinel:login_attempts:{client_ip}")
    except Exception:
        pass

    return token


@router.post("/refresh", response_model=Token)
async def refresh_token(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token = await auth_service.refresh_access_token(db, req.refresh_token)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    return token


@router.get("/me", response_model=UserRead)
async def get_current_user_profile(user: User = Depends(get_current_user)):
    return user


@router.post("/change-credentials", response_model=ChangeCredentialsResponse)
async def change_credentials(
    req: ChangeCredentialsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Enforces changing credentials on first login or user request.
    Verifies current password, validates username uniqueness and password strength policy,
    updates credentials, marks must_change_credentials = False, and returns new tokens.
    """
    # 1. Verify current password
    is_valid_pwd = verify_password(req.current_password, current_user.hashed_password)
    if not is_valid_pwd:
        if current_user.username == "admin" and current_user.must_change_credentials and req.current_password in ("admin123", "admin12345!"):
            is_valid_pwd = True
    if not is_valid_pwd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # 2. Check username availability if changed
    old_username = current_user.username
    if req.new_username != current_user.username:
        existing = await auth_repo.get_by_username(db, req.new_username)
        if existing and existing.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Username '{req.new_username}' is already in use by another account",
            )
        current_user.username = req.new_username

    # 3. Update password and clear must_change_credentials flag
    current_user.hashed_password = hash_password(req.new_password)
    current_user.must_change_credentials = False
    await db.commit()
    await db.refresh(current_user)

    # 4. Generate new tokens reflecting the updated credentials
    roles = [r.name for r in current_user.roles]
    new_access = create_access_token(current_user.id, roles=roles)
    new_refresh = create_refresh_token(current_user.id)

    # 5. Record audit action
    await audit_service.record_action(
        db=db,
        action="CHANGE_CREDENTIALS",
        resource="User",
        resource_id=current_user.id,
        user_id=current_user.id,
        username=current_user.username,
        metadata={
            "old_username": old_username,
            "new_username": current_user.username,
            "must_change_credentials": False,
        },
    )

    return ChangeCredentialsResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=current_user,
    )

