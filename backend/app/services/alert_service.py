import json
from typing import Any, Dict, List, Optional

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.kafka import TOPIC_ALERTS, event_bus
from app.core.logging import logger
from app.core.telemetry import MEGALODON_SECURITY_EVENTS_TOTAL
from app.models.security import Alert
from app.websocket.manager import ws_manager


class AlertService:
    async def create_alert(
        self,
        db: AsyncSession,
        title: str,
        description: str,
        severity: str = "WARNING",
        source: str = "megalodon-core",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Alert:
        alert = Alert(
            title=title,
            description=description,
            severity=severity.upper(),
            status="OPEN",
            source=source,
            metadata_json=json.dumps(metadata or {}),
        )
        db.add(alert)
        await db.commit()
        await db.refresh(alert)

        MEGALODON_SECURITY_EVENTS_TOTAL.labels(severity=severity.lower(), event_type="alert").inc()

        payload = {
            "id": alert.id,
            "title": alert.title,
            "description": alert.description,
            "severity": alert.severity,
            "status": alert.status,
            "source": alert.source,
            "created_at": alert.created_at.isoformat(),
        }

        # Publish to Kafka
        await event_bus.publish(TOPIC_ALERTS, payload)

        # Broadcast real-time alert via WebSocket
        await ws_manager.broadcast_json("ALERT_TRIGGERED", payload)

        logger.warning(f"ALERT [{alert.severity}] {alert.title}: {alert.description}")
        return alert

    async def list_alerts(self, db: AsyncSession, limit: int = 50) -> List[Alert]:
        result = await db.execute(select(Alert).order_by(desc(Alert.created_at)).limit(limit))
        return list(result.scalars().all())

    async def update_status(self, db: AsyncSession, alert_id: str, new_status: str) -> Optional[Alert]:
        result = await db.execute(select(Alert).where(Alert.id == alert_id))
        alert = result.scalars().first()
        if alert:
            alert.status = new_status.upper()
            await db.commit()
            await db.refresh(alert)
            await ws_manager.broadcast_json("ALERT_UPDATED", {
                "id": alert.id,
                "status": alert.status,
            })
        return alert


alert_service = AlertService()
