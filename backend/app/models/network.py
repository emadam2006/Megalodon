from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin, utc_now


class NetworkInterface(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "network_interfaces"

    name: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    state: Mapped[str] = mapped_column(String(16), default="UP", nullable=False)  # UP, DOWN, UNKNOWN
    mac_address: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    speed_mbps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mtu: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    addresses: Mapped[List["NetworkAddress"]] = relationship("NetworkAddress", back_populates="interface", cascade="all, delete-orphan", lazy="selectin")


class NetworkAddress(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "network_addresses"

    interface_id: Mapped[str] = mapped_column(String(36), ForeignKey("network_interfaces.id", ondelete="CASCADE"), index=True, nullable=False)
    family: Mapped[str] = mapped_column(String(16), nullable=False)  # IPv4, IPv6
    address: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    prefix: Mapped[int] = mapped_column(Integer, nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    interface: Mapped["NetworkInterface"] = relationship("NetworkInterface", back_populates="addresses")


class NetworkListener(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "network_listeners"

    protocol: Mapped[str] = mapped_column(String(16), default="TCP", index=True, nullable=False)  # TCP, UDP
    bind_address: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    port: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    process_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    pid: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    command: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class NetworkService(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "network_services"

    name: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    port: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    protocol: Mapped[str] = mapped_column(String(16), default="TCP", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="ACTIVE", nullable=False)
