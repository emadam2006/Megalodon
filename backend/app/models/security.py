from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class IPPolicy(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "ip_policies"

    ip_or_cidr: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(32), default="BLOCK", nullable=False)  # ALLOW, BLOCK, TEMPORARY_BLOCK, PERMANENT_BLOCK
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(64), default="system", nullable=True)


class RateLimitPolicy(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "rate_limit_policies"

    name: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    algorithm: Mapped[str] = mapped_column(String(32), default="SLIDING_WINDOW", nullable=False)  # FIXED_WINDOW, SLIDING_WINDOW, TOKEN_BUCKET
    target_type: Mapped[str] = mapped_column(String(32), default="IP", nullable=False)  # IP, API_KEY, USER, ROUTE, GLOBAL
    rate_limit: Mapped[int] = mapped_column(Integer, nullable=False)  # Max requests
    window_seconds: Mapped[int] = mapped_column(Integer, default=60, nullable=False)  # Window time in seconds
    burst_capacity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # For token bucket


class SecurityRule(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "security_rules"

    name: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=100, nullable=False)  # Lower number = higher priority
    conditions_json: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array of conditions
    action: Mapped[str] = mapped_column(String(32), nullable=False)  # ALLOW, BLOCK, RATE_LIMIT, TEMPORARY_BLOCK, RETURN_STATUS, CREATE_ALERT, LOG_EVENT
    action_parameters_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON params (e.g. block duration, status code)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class SecurityEvent(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "security_events"

    event_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    severity: Mapped[str] = mapped_column(String(16), default="MEDIUM", index=True, nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    client_ip: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    request_path: Mapped[str] = mapped_column(String(256), nullable=False)
    method: Mapped[str] = mapped_column(String(16), nullable=False)
    details_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    rule_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)


class Alert(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "alerts"

    title: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(16), default="WARNING", index=True, nullable=False)  # INFO, WARNING, ERROR, CRITICAL
    status: Mapped[str] = mapped_column(String(16), default="OPEN", index=True, nullable=False)  # OPEN, ACKNOWLEDGED, RESOLVED
    source: Mapped[str] = mapped_column(String(64), default="megalodon-core", nullable=False)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, default="{}", nullable=True)
