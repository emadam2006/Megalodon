from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.auth import User
from app.repositories.audit_repo import audit_repo
from app.schemas.audit import AuditLogRead

router = APIRouter(prefix="/audit", tags=["Audit Logging"])


@router.get("", response_model=List[AuditLogRead])
async def list_audit_logs(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    return await audit_repo.list_recent(db, limit=limit)
