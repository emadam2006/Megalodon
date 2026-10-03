from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import APIKey, Role, User
from app.repositories.base import BaseRepository


class AuthRepository(BaseRepository[User]):
    def __init__(self):
        super().__init__(User)

    async def get_by_username(self, db: AsyncSession, username: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.username == username))
        return result.scalars().first()

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalars().first()

    async def get_role_by_name(self, db: AsyncSession, name: str) -> Optional[Role]:
        result = await db.execute(select(Role).where(Role.name == name))
        return result.scalars().first()

    async def get_api_key_by_hash(self, db: AsyncSession, key_hash: str) -> Optional[APIKey]:
        result = await db.execute(select(APIKey).where(APIKey.key_hash == key_hash, APIKey.is_active.is_(True)))
        return result.scalars().first()

    async def list_user_api_keys(self, db: AsyncSession, user_id: str) -> List[APIKey]:
        result = await db.execute(select(APIKey).where(APIKey.user_id == user_id))
        return list(result.scalars().all())

    async def list_all_api_keys(self, db: AsyncSession) -> List[APIKey]:
        result = await db.execute(select(APIKey))
        return list(result.scalars().all())


auth_repo = AuthRepository()
