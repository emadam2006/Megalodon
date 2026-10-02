from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.kafka import TOPIC_NETWORK_EVENTS, event_bus
from app.core.logging import logger
from app.core.telemetry import (
    MEGALODON_ACTIVE_CONNECTIONS,
    MEGALODON_LISTENING_PORTS,
    MEGALODON_NETWORK_CONNECTIONS,
    MEGALODON_NETWORK_INTERFACES,
)
from app.repositories.network_repo import network_repo
from app.schemas.network import (
    NetworkConnectionSchema,
    NetworkDiscoveryPayload,
    NetworkTopologyEdge,
    NetworkTopologyMapSchema,
    NetworkTopologyNode,
)
from app.websocket.manager import ws_manager


class NetworkService:
    def __init__(self):
        self._last_interfaces: Set[str] = set()
        self._last_ips: Set[str] = set()
        self._last_ports: Set[int] = set()
        self._last_connections: List[NetworkConnectionSchema] = []
        self._last_routes: List[dict] = []
        self._last_updated_at: Optional[datetime] = None

    async def process_discovery_payload(
        self,
        db: AsyncSession,
        payload: NetworkDiscoveryPayload,
    ) -> Dict[str, Any]:
        """
        Processes discovery telemetry from Megalodon Network Agent,
        detects lifecycle changes, updates database state,
        and broadcasts network events.
        """
        now = datetime.now(timezone.utc)
        self._last_updated_at = now
        self._last_connections = payload.connections
        self._last_routes = [r.model_dump() for r in payload.routes]

        # 1. Detect Interface Changes
        current_interfaces = {iface.name for iface in payload.interfaces}
        current_ips = set()
        for iface in payload.interfaces:
            for addr in iface.addresses:
                current_ips.add(f"{iface.name}:{addr.address}")

        events_generated = []

        if self._last_interfaces:
            added_ifaces = current_interfaces - self._last_interfaces
            removed_ifaces = self._last_interfaces - current_interfaces
            for iface_name in added_ifaces:
                events_generated.append({"event": "NETWORK_INTERFACE_ADDED", "interface": iface_name})
            for iface_name in removed_ifaces:
                events_generated.append({"event": "NETWORK_INTERFACE_REMOVED", "interface": iface_name})

        if self._last_ips:
            added_ips = current_ips - self._last_ips
            removed_ips = self._last_ips - current_ips
            for ip_item in added_ifaces if False else added_ips:
                events_generated.append({"event": "IP_ADDRESS_ADDED", "ip": ip_item})
            for ip_item in removed_ips:
                events_generated.append({"event": "IP_ADDRESS_REMOVED", "ip": ip_item})

        # 2. Detect Listening Port Changes
        current_ports = {l.port for l in payload.listeners}
        if self._last_ports:
            opened = current_ports - self._last_ports
            closed = self._last_ports - current_ports
            for p in opened:
                events_generated.append({"event": "PORT_OPENED", "port": p})
            for p in closed:
                events_generated.append({"event": "PORT_CLOSED", "port": p})

        # Update cache
        self._last_interfaces = current_interfaces
        self._last_ips = current_ips
        self._last_ports = current_ports

        # 3. Persist interfaces and listeners to PostgreSQL
        for iface in payload.interfaces:
            await network_repo.upsert_interface(
                db=db,
                name=iface.name,
                state=iface.state,
                mac=iface.mac_address,
                mtu=iface.mtu,
                speed=iface.speed_mbps,
                addresses=[a.model_dump() for a in iface.addresses],
            )

        await network_repo.sync_listeners(
            db=db,
            listeners=[l.model_dump() for l in payload.listeners],
        )

        # 4. Update Prometheus Telemetry Gauges
        MEGALODON_NETWORK_INTERFACES.labels(state="UP").set(len(payload.interfaces))
        MEGALODON_LISTENING_PORTS.labels(protocol="TCP").set(len([l for l in payload.listeners if l.protocol == "TCP"]))
        MEGALODON_NETWORK_CONNECTIONS.labels(state="ACTIVE").set(len(payload.connections))
        MEGALODON_ACTIVE_CONNECTIONS.set(len(payload.connections))

        # 5. Emit Events to Kafka & WebSockets
        for ev in events_generated:
            ev["timestamp"] = now.isoformat()
            await event_bus.publish(TOPIC_NETWORK_EVENTS, ev)
            await ws_manager.broadcast_json("NETWORK_EVENT", ev)
            logger.info(f"Network Change Detected: {ev['event']} -> {ev}")

        # Broadcast live network state
        await ws_manager.broadcast_json("NETWORK_STATE_UPDATED", {
            "interface_count": len(payload.interfaces),
            "listener_count": len(payload.listeners),
            "connection_count": len(payload.connections),
            "timestamp": now.isoformat(),
        })

        return {
            "status": "success",
            "interfaces_synced": len(payload.interfaces),
            "listeners_synced": len(payload.listeners),
            "connections_observed": len(payload.connections),
            "events_detected": len(events_generated),
        }

    async def get_topology_map(self, db: AsyncSession) -> NetworkTopologyMapSchema:
        """
        Builds graph hierarchy:
        [Internet / External] -> [Host Interfaces (e.g. eth0, docker0)] -> [Listeners (Ports)] -> [Services/Gateway]
        """
        nodes: List[NetworkTopologyNode] = []
        edges: List[NetworkTopologyEdge] = []

        # Internet Root Node
        nodes.append(NetworkTopologyNode(
            id="internet",
            label="Internet / WAN",
            type="internet",
            status="normal",
            details={"description": "External Network Ingress"}
        ))

        # Interfaces
        interfaces = await network_repo.list_interfaces(db)
        listeners = await network_repo.list_listeners(db)

        for iface in interfaces:
            node_id = f"iface_{iface.name}"
            ips = [a.address for a in iface.addresses]
            nodes.append(NetworkTopologyNode(
                id=node_id,
                label=f"{iface.name} ({iface.state})",
                type="interface",
                status="normal" if iface.state == "UP" else "warning",
                details={
                    "mac": iface.mac_address or "N/A",
                    "ips": ips,
                    "state": iface.state,
                }
            ))
            # Edge: Internet -> Interface
            edges.append(NetworkTopologyEdge(
                source="internet",
                target=node_id,
                label="ingress",
            ))

            # Listeners on this interface or 0.0.0.0
            for l in listeners:
                listener_node_id = f"port_{l.protocol}_{l.port}"
                # Add port node if not added
                if not any(n.id == listener_node_id for n in nodes):
                    nodes.append(NetworkTopologyNode(
                        id=listener_node_id,
                        label=f":{l.port} ({l.protocol}) - {l.process_name or 'service'}",
                        type="port",
                        status="normal",
                        details={
                            "port": l.port,
                            "protocol": l.protocol,
                            "bind": l.bind_address,
                            "process": l.process_name or "N/A",
                            "pid": l.pid,
                        }
                    ))

                # Edge from interface to port
                if l.bind_address in ("0.0.0.0", "::") or any(l.bind_address == ip for ip in ips):
                    edges.append(NetworkTopologyEdge(
                        source=node_id,
                        target=listener_node_id,
                        label=f"{l.protocol}/{l.port}",
                    ))

        return NetworkTopologyMapSchema(nodes=nodes, edges=edges)

    def get_live_connections(self) -> List[NetworkConnectionSchema]:
        return self._last_connections

    def get_live_routes(self) -> List[dict]:
        return self._last_routes


network_service = NetworkService()
