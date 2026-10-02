from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.kafka import TOPIC_AUDIT, event_bus
from app.models.audit import AuditLog
from app.repositories.audit_repo import audit_repo


class AuditService:
    async def record_action(
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
        log_entry = await audit_repo.log_action(
            db=db,
            action=action,
            resource=resource,
            resource_id=resource_id,
            user_id=user_id,
            username=username,
            source_ip=source_ip,
            metadata=metadata or {},
        )

        # Publish to Kafka
        await event_bus.publish(TOPIC_AUDIT, {
            "id": log_entry.id,
            "timestamp": log_entry.timestamp.isoformat(),
            "user_id": user_id,
            "username": username,
            "action": action,
            "resource": resource,
            "resource_id": resource_id,
            "source_ip": source_ip,
            "metadata": metadata or {},
        })

        return log_entry


audit_service = AuditService()
