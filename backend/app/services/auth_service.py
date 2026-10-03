from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_api_key,
    hash_api_key,
    hash_password,
    verify_password,
)
from app.models.auth import APIKey, Role, User
from app.repositories.auth_repo import auth_repo
from app.schemas.auth import APIKeyResponse, Token


class AuthService:
    async def seed_initial_admin(self, db: AsyncSession):
        """Initializes default roles (ADMIN, OPERATOR, VIEWER) and a default admin user if none exists."""
        admin_role = await auth_repo.get_role_by_name(db, "ADMIN")
        if not admin_role:
            admin_role = Role(name="ADMIN", description="Administrator with full platform access")
            operator_role = Role(name="OPERATOR", description="Operator with traffic and security configuration access")
            viewer_role = Role(name="VIEWER", description="Read-only viewer for dashboards and metrics")
            db.add_all([admin_role, operator_role, viewer_role])
            await db.commit()
            await db.refresh(admin_role)

        existing_user = await auth_repo.get_by_username(db, "admin")
        if not existing_user:
            existing_user = await auth_repo.get_by_email(db, "admin@megalodon.local")
        if not existing_user:
            existing_user = await auth_repo.get_by_email(db, "admin@sentinel.local")

        if not existing_user:
            admin_user = User(
                username="admin",
                email="admin@megalodon.local",
                hashed_password=hash_password("admin123"),
                is_active=True,
                is_superuser=True,
                must_change_credentials=False,
                roles=[admin_role],
            )
            db.add(admin_user)
            await db.commit()

    async def authenticate_user(self, db: AsyncSession, username: str, password: str) -> Optional[User]:
        user = await auth_repo.get_by_username(db, username)
        if not user:
            user = await auth_repo.get_by_email(db, username)
        if not user or not user.is_active:
            return None
        if not verify_password(password, user.hashed_password):
            # For default initial admin before first credentials update, accept both admin123 and admin12345!
            if user.username == "admin" and user.must_change_credentials and (password in ("admin123", "admin12345!")):
                return user
            return None
        return user

    async def login(self, db: AsyncSession, username: str, password: str) -> Optional[Token]:
        user = await self.authenticate_user(db, username, password)
        if not user:
            return None
        roles = [r.name for r in user.roles]
        access_token = create_access_token(user.id, roles=roles)
        refresh_token = create_refresh_token(user.id)
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def refresh_access_token(self, db: AsyncSession, refresh_token: str) -> Optional[Token]:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            return None
        user_id = payload.get("sub")
        user = await auth_repo.get_by_id(db, user_id)
        if not user or not user.is_active:
            return None
        roles = [r.name for r in user.roles]
        new_access = create_access_token(user.id, roles=roles)
        new_refresh = create_refresh_token(user.id)
        return Token(
            access_token=new_access,
            refresh_token=new_refresh,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def create_api_key(
        self,
        db: AsyncSession,
        user_id: str,
        name: str,
        permissions: str = "*",
        rate_limit: Optional[int] = None,
        expires_in_days: Optional[int] = None,
    ) -> APIKeyResponse:
        raw_key, prefix, key_hash = generate_api_key()
        expires_at = None
        if expires_in_days:
            expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)

        api_key = APIKey(
            user_id=user_id,
            name=name,
            key_prefix=prefix,
            key_hash=key_hash,
            permissions=permissions,
            rate_limit=rate_limit,
            expires_at=expires_at,
            is_active=True,
        )
        db.add(api_key)
        await db.commit()
        await db.refresh(api_key)

        return APIKeyResponse(
            id=api_key.id,
            name=api_key.name,
            raw_key=raw_key,
            key_prefix=prefix,
            rate_limit=api_key.rate_limit,
            permissions=api_key.permissions,
            created_at=api_key.created_at,
            expires_at=api_key.expires_at,
        )

    async def validate_api_key(self, db: AsyncSession, raw_key: str) -> Optional[APIKey]:
        key_hash = hash_api_key(raw_key)
        api_key = await auth_repo.get_api_key_by_hash(db, key_hash)
        if not api_key:
            return None
        if api_key.expires_at:
            exp = api_key.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < datetime.now(timezone.utc):
                return None

        # Update usage counter
        api_key.usage_count += 1
        api_key.last_used_at = datetime.now(timezone.utc)
        await db.commit()
        return api_key


auth_service = AuthService()
