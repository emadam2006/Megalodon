from typing import List, Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class BackendService(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "backend_services"

    name: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    upstream_url: Mapped[str] = mapped_column(String(256), nullable=False)
    health_check_path: Mapped[str] = mapped_column(String(128), default="/health", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    timeout_seconds: Mapped[float] = mapped_column(Float, default=30.0, nullable=False)
    weight: Mapped[int] = mapped_column(Integer, default=100, nullable=False)

    routes: Mapped[List["Route"]] = relationship("Route", back_populates="backend_service", cascade="all, delete-orphan")


class Route(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "routes"

    name: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    path_prefix: Mapped[str] = mapped_column(String(256), index=True, nullable=False)
    methods: Mapped[str] = mapped_column(String(64), default="ALL", nullable=False)  # Comma-separated: GET,POST,PUT or ALL
    backend_service_id: Mapped[str] = mapped_column(String(36), ForeignKey("backend_services.id", ondelete="CASCADE"), nullable=False)
    strip_prefix: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    auth_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    rate_limit_policy_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    backend_service: Mapped["BackendService"] = relationship("BackendService", back_populates="routes")


class GatewayConfig(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "gateway_configs"

    key: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    value_json: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
