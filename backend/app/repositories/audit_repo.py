import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.repositories.base import BaseRepository


class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self):
        super().__init__(AuditLog)

    async def log_action(
        self,
        db: AsyncSession,
        action: str,
        resource: str,
        resource_id: Optional[str] = None,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        source_ip: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        audit_entry = AuditLog(
            timestamp=datetime.now(timezone.utc),
            user_id=user_id,
            username=username,
            action=action,
            resource=resource,
            resource_id=resource_id,
            source_ip=source_ip,
            metadata_json=json.dumps(metadata or {}),
        )
        db.add(audit_entry)
        await db.commit()
        await db.refresh(audit_entry)
        return audit_entry

    async def list_recent(self, db: AsyncSession, limit: int = 100) -> List[AuditLog]:
        result = await db.execute(select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit))
        return list(result.scalars().all())


audit_repo = AuditRepository()
