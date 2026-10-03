import platform
import socket
from datetime import datetime, timezone
from typing import Any

from megalodon_agent.connections import ConnectionCollector
from megalodon_agent.interfaces import InterfaceCollector
from megalodon_agent.routes import RouteCollector
from megalodon_agent.sockets import SocketCollector


class HostNetworkDiscoverer:
    @staticmethod
    def snapshot() -> dict[str, Any]:
        hostname = socket.gethostname() or platform.node()
        interfaces = InterfaceCollector.collect_interfaces()
        listeners = SocketCollector.collect_listeners()
        connections = ConnectionCollector.collect_connections()
        routes = RouteCollector.collect_routes()

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "host_name": hostname,
            "interfaces": interfaces,
            "listeners": listeners,
            "connections": connections,
            "routes": routes,
        }
