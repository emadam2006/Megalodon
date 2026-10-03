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
    # Stability windowing: a port/interface must be consistently seen/absent for
    # this many consecutive discovery scans before a change event is emitted.
    # This eliminates ephemeral port false positives from Docker, curl, health checks, etc.
    STABILITY_THRESHOLD = 3
    # Ports at or above this value are ephemeral (OS-assigned for outbound connections).
    # We never alert on them — they appear and disappear naturally.
    EPHEMERAL_PORT_MIN = 32768

    def __init__(self):
        self._last_interfaces: Set[str] = set()
        self._last_ips: Set[str] = set()
        # _stable_ports: ports that have been confirmed stable (present for THRESHOLD scans)
        self._stable_ports: Set[int] = set()
        # pending_open[port] = consecutive scan count where port was seen but not yet stable
        self._pending_open: Dict[int, int] = {}
        # pending_close[port] = consecutive scan count where port was absent (may be closing)
        self._pending_close: Dict[int, int] = {}
        # Same windowing for interfaces
        self._pending_iface_add: Dict[str, int] = {}
        self._pending_iface_remove: Dict[str, int] = {}
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

        Stability windowing is applied to both ports and interfaces:
        a change is only considered real after STABILITY_THRESHOLD consecutive
        confirmations — preventing ephemeral-port and transient-connection false positives.
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
            raw_added = current_interfaces - self._last_interfaces
            raw_removed = self._last_interfaces - current_interfaces

            # Stability windowing for interface additions
            for name in raw_added:
                self._pending_iface_add[name] = self._pending_iface_add.get(name, 0) + 1
                # Reset removal counter if it was pending removal
                self._pending_iface_remove.pop(name, None)
                if self._pending_iface_add[name] >= NetworkService.STABILITY_THRESHOLD:
                    events_generated.append({"event": "NETWORK_INTERFACE_ADDED", "interface": name})
                    self._pending_iface_add.pop(name, None)

            # Stability windowing for interface removals
            for name in raw_removed:
                self._pending_iface_remove[name] = self._pending_iface_remove.get(name, 0) + 1
                self._pending_iface_add.pop(name, None)
                if self._pending_iface_remove[name] >= NetworkService.STABILITY_THRESHOLD:
                    events_generated.append({"event": "NETWORK_INTERFACE_REMOVED", "interface": name})
                    self._pending_iface_remove.pop(name, None)

            # Reset pending counters for interfaces that are back to their previous state
            for name in list(self._pending_iface_add.keys()):
                if name not in raw_added:
                    self._pending_iface_add.pop(name, None)
            for name in list(self._pending_iface_remove.keys()):
                if name not in raw_removed:
                    self._pending_iface_remove.pop(name, None)

        if self._last_ips:
            added_ips = current_ips - self._last_ips
            removed_ips = self._last_ips - current_ips
            for ip_item in added_ips:
                events_generated.append({"event": "IP_ADDRESS_ADDED", "ip": ip_item})
            for ip_item in removed_ips:
                events_generated.append({"event": "IP_ADDRESS_REMOVED", "ip": ip_item})

        # 2. Detect Listening Port Changes — with stability windowing + ephemeral port filter
        # Only consider non-ephemeral ports (well-known service ports)
        raw_ports = {
            l.port for l in payload.listeners
            if l.port < NetworkService.EPHEMERAL_PORT_MIN
        }

        # Ports seen this scan but not yet in stable set
        newly_seen = raw_ports - self._stable_ports
        # Ports in stable set but absent this scan
        newly_gone = self._stable_ports - raw_ports

        # Track pending opens: increment counter for each new sighting
        for p in newly_seen:
            self._pending_open[p] = self._pending_open.get(p, 0) + 1
            self._pending_close.pop(p, None)  # cancel any close countdown
            if self._pending_open[p] >= NetworkService.STABILITY_THRESHOLD:
                # Port has been consistently present — promote to stable and emit event
                self._stable_ports.add(p)
                self._pending_open.pop(p, None)
                events_generated.append({"event": "PORT_OPENED", "port": p})
                logger.info(f"Stable new port confirmed after {NetworkService.STABILITY_THRESHOLD} scans: {p}")

        # Track pending closes: increment counter for each scan where port is absent
        for p in newly_gone:
            self._pending_close[p] = self._pending_close.get(p, 0) + 1
            self._pending_open.pop(p, None)
            if self._pending_close[p] >= NetworkService.STABILITY_THRESHOLD:
                self._stable_ports.discard(p)
                self._pending_close.pop(p, None)
                events_generated.append({"event": "PORT_CLOSED", "port": p})
                logger.info(f"Port confirmed closed after {NetworkService.STABILITY_THRESHOLD} scans: {p}")

        # Reset pending counters for ports that returned to their previous state
        for p in list(self._pending_open.keys()):
            if p not in newly_seen:
                self._pending_open.pop(p, None)
        for p in list(self._pending_close.keys()):
            if p not in newly_gone:
                self._pending_close.pop(p, None)

        # Update cache
        self._last_interfaces = current_interfaces
        self._last_ips = current_ips
        # Note: _stable_ports is the authoritative port set now (not a raw snapshot)

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
