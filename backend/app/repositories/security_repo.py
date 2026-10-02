from datetime import datetime, timezone
from typing import List

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.security import Alert, IPPolicy, RateLimitPolicy, SecurityEvent, SecurityRule
from app.repositories.base import BaseRepository


class SecurityRepository:
    def __init__(self):
        self.ip_policy_repo = BaseRepository(IPPolicy)
        self.rate_limit_repo = BaseRepository(RateLimitPolicy)
        self.rule_repo = BaseRepository(SecurityRule)
        self.event_repo = BaseRepository(SecurityEvent)
        self.alert_repo = BaseRepository(Alert)

    async def list_active_ip_policies(self, db: AsyncSession) -> List[IPPolicy]:
        now = datetime.now(timezone.utc)
        result = await db.execute(select(IPPolicy))
        policies = list(result.scalars().all())
        # Filter out expired temporary policies
        active = []
        for p in policies:
            if p.expires_at:
                exp = p.expires_at
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if exp < now:
                    continue
            active.append(p)
        return active

    async def list_security_rules(self, db: AsyncSession) -> List[SecurityRule]:
        result = await db.execute(select(SecurityRule).order_by(SecurityRule.priority.asc()))
        return list(result.scalars().all())

    async def list_security_events(self, db: AsyncSession, limit: int = 100) -> List[SecurityEvent]:
        result = await db.execute(select(SecurityEvent).order_by(desc(SecurityEvent.created_at)).limit(limit))
        return list(result.scalars().all())

    async def list_alerts(self, db: AsyncSession, limit: int = 100) -> List[Alert]:
        result = await db.execute(select(Alert).order_by(desc(Alert.created_at)).limit(limit))
        return list(result.scalars().all())


security_repo = SecurityRepository()
