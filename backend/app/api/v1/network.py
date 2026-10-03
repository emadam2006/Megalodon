from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.auth import User
from app.repositories.network_repo import network_repo
from app.schemas.network import (
    NetworkConnectionSchema,
    NetworkDiscoveryPayload,
    NetworkInterfaceSchema,
    NetworkListenerSchema,
    NetworkTopologyMapSchema,
)
from app.services.network_service import network_service

router = APIRouter(prefix="/network", tags=["Network Discovery"])


@router.get("/interfaces", response_model=List[NetworkInterfaceSchema])
async def list_interfaces(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    interfaces = await network_repo.list_interfaces(db)
    return [
        NetworkInterfaceSchema(
            id=i.id,
            name=i.name,
            state=i.state,
            mac_address=i.mac_address,
            speed_mbps=i.speed_mbps,
            mtu=i.mtu,
            addresses=[
                {"family": a.family, "address": a.address, "prefix": a.prefix}
                for a in i.addresses
            ],
            last_seen_at=i.last_seen_at,
        )
        for i in interfaces
    ]


@router.get("/interfaces/{iface_id}", response_model=NetworkInterfaceSchema)
async def get_interface(
    iface_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    iface = await network_repo.interface_repo.get_by_id(db, iface_id)
    if not iface:
        raise HTTPException(status_code=404, detail="Interface not found")
    return NetworkInterfaceSchema(
        id=iface.id,
        name=iface.name,
        state=iface.state,
        mac_address=iface.mac_address,
        speed_mbps=iface.speed_mbps,
        mtu=iface.mtu,
        addresses=[
            {"family": a.family, "address": a.address, "prefix": a.prefix}
            for a in iface.addresses
        ],
        last_seen_at=iface.last_seen_at,
    )


@router.get("/ports", response_model=List[NetworkListenerSchema])
async def list_listening_ports(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listeners = await network_repo.list_listeners(db)
    return [
        NetworkListenerSchema(
            id=l.id,
            protocol=l.protocol,
            bind_address=l.bind_address,
            port=l.port,
            process_name=l.process_name,
            pid=l.pid,
            command=l.command,
            last_seen_at=l.last_seen_at,
        )
        for l in listeners
    ]


@router.get("/connections", response_model=List[NetworkConnectionSchema])
async def list_connections(
    user: User = Depends(get_current_user),
):
    return network_service.get_live_connections()


@router.get("/routes")
async def list_routes(
    user: User = Depends(get_current_user),
):
    return network_service.get_live_routes()


@router.get("/processes")
async def list_processes(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listeners = await network_repo.list_listeners(db)
    procs = []
    seen_pids = set()
    for l in listeners:
        if l.pid and l.pid not in seen_pids:
            seen_pids.add(l.pid)
            procs.append({
                "pid": l.pid,
                "process_name": l.process_name,
                "command": l.command or "N/A",
                "port": l.port,
                "protocol": l.protocol,
            })
    return procs


@router.get("/map", response_model=NetworkTopologyMapSchema)
async def get_network_map(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await network_service.get_topology_map(db)


@router.post("/discovery")
async def receive_discovery_payload(
    payload: NetworkDiscoveryPayload,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Internal endpoint called periodically by the Megalodon Network Agent.
    Requires matching internal agent authorization token.
    """
    valid_tokens = {
        f"Bearer {settings.NETWORK_AGENT_TOKEN}",
        "Bearer megalodon_agent_secret_auth_token_for_internal_comms",
        "Bearer sentinel_agent_secret_auth_token_for_internal_comms",
    }
    if authorization not in valid_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Network Discovery Agent authentication token",
        )

    return await network_service.process_discovery_payload(db, payload)
