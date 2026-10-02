from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import UUIDMixin, utc_now


class AuditLog(Base, UUIDMixin):
    __tablename__ = "audit_logs"

    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True, nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), index=True, nullable=True)
    username: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    action: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    resource: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    resource_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    source_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, default="{}", nullable=True)
