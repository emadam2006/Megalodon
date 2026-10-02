from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.auth import User
from app.repositories.security_repo import security_repo
from app.schemas.security import SecurityEventRead

router = APIRouter(prefix="/security-events", tags=["Security Events"])


@router.get("", response_model=List[SecurityEventRead])
async def list_security_events(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await security_repo.list_security_events(db, limit=limit)
