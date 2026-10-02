from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from app.core.database import get_session_maker
from app.core.kafka import TOPIC_SECURITY_EVENTS, event_bus
from app.core.logging import logger
from app.models.security import IPPolicy
from app.repositories.security_repo import security_repo
from app.services.alert_service import alert_service


class SecurityWorker:
    def __init__(self):
        self._running = False
        self._ip_violation_counts: Dict[str, int] = {}

    async def handle_security_event(self, event_data: Dict[str, Any]):
        """
        Analyzes security events. If an IP exceeds threshold of violations,
        automatically escalates to a temporary block and generates an alert.
        """
        client_ip = event_data.get("client_ip")
        if not client_ip:
            return

        self._ip_violation_counts[client_ip] = self._ip_violation_counts.get(client_ip, 0) + 1
        violations = self._ip_violation_counts[client_ip]

        if violations >= 5:
            # Auto-block IP for 30 minutes
            session_maker = get_session_maker()
            async with session_maker() as db:
                expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
                policy = IPPolicy(
                    ip_or_cidr=client_ip,
                    action="TEMPORARY_BLOCK",
                    expires_at=expires_at,
                    reason="Auto-blocked: 5+ repeated security violations detected within interval",
                    created_by="megalodon-security-worker",
                )
                await security_repo.ip_policy_repo.create(db, policy)

                await alert_service.create_alert(
                    db=db,
                    title=f"IP {client_ip} Auto-Blocked",
                    description=f"Client IP {client_ip} has been automatically placed on temporary block for 30 minutes due to repeated security rule violations.",
                    severity="CRITICAL",
                    source="security-worker",
                    metadata={"client_ip": client_ip, "violations": violations},
                )
                self._ip_violation_counts[client_ip] = 0

    async def start(self):
        self._running = True
        event_bus.subscribe_local(TOPIC_SECURITY_EVENTS, self.handle_security_event)
        logger.info("Security Worker started successfully.")

    async def stop(self):
        self._running = False


security_worker = SecurityWorker()
