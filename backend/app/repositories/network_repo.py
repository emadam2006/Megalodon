from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.network import NetworkAddress, NetworkInterface, NetworkListener, NetworkService
from app.repositories.base import BaseRepository


class NetworkRepository:
    def __init__(self):
        self.interface_repo = BaseRepository(NetworkInterface)
        self.listener_repo = BaseRepository(NetworkListener)
        self.service_repo = BaseRepository(NetworkService)

    async def list_interfaces(self, db: AsyncSession) -> List[NetworkInterface]:
        result = await db.execute(select(NetworkInterface).options(selectinload(NetworkInterface.addresses)))
        return list(result.scalars().all())

    async def get_interface_by_name(self, db: AsyncSession, name: str) -> Optional[NetworkInterface]:
        result = await db.execute(
            select(NetworkInterface)
            .where(NetworkInterface.name == name)
            .options(selectinload(NetworkInterface.addresses))
        )
        return result.scalars().first()

    async def list_listeners(self, db: AsyncSession) -> List[NetworkListener]:
        result = await db.execute(select(NetworkListener).order_by(NetworkListener.port.asc()))
        return list(result.scalars().all())

    async def get_listener_by_port(self, db: AsyncSession, port: int) -> Optional[NetworkListener]:
        result = await db.execute(select(NetworkListener).where(NetworkListener.port == port))
        return result.scalars().first()

    async def upsert_interface(
        self,
        db: AsyncSession,
        name: str,
        state: str,
        mac: Optional[str],
        mtu: Optional[int],
        speed: Optional[int],
        addresses: List[dict],
    ) -> NetworkInterface:
        now = datetime.now(timezone.utc)
        iface = await self.get_interface_by_name(db, name)
        if iface is None:
            iface = NetworkInterface(
                name=name,
                state=state,
                mac_address=mac,
                mtu=mtu,
                speed_mbps=speed,
                last_seen_at=now,
            )
            db.add(iface)
            await db.flush()
        else:
            iface.state = state
            iface.mac_address = mac
            iface.mtu = mtu
            iface.speed_mbps = speed
            iface.last_seen_at = now
            # Clear old addresses
            await db.execute(delete(NetworkAddress).where(NetworkAddress.interface_id == iface.id))

        # Add updated addresses
        for addr in addresses:
            net_addr = NetworkAddress(
                interface_id=iface.id,
                family=addr.get("family", "IPv4"),
                address=addr.get("address", ""),
                prefix=addr.get("prefix", 32),
                last_seen_at=now,
            )
            db.add(net_addr)

        await db.commit()
        await db.refresh(iface)
        return iface

    async def sync_listeners(self, db: AsyncSession, listeners: List[dict]):
        now = datetime.now(timezone.utc)
        # Clear existing listeners
        await db.execute(delete(NetworkListener))
        for l in listeners:
            item = NetworkListener(
                protocol=l.get("protocol", "TCP"),
                bind_address=l.get("bind_address", "0.0.0.0"),
                port=l.get("port", 0),
                process_name=l.get("process_name"),
                pid=l.get("pid"),
                command=l.get("command"),
                last_seen_at=now,
            )
            db.add(item)
        await db.commit()


network_repo = NetworkRepository()
