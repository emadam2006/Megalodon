import socket
from typing import Any

import psutil
from megalodon_agent.processes import ProcessCorrelator


class ConnectionCollector:
    @staticmethod
    def collect_connections() -> list[dict[str, Any]]:
        connections: list[dict[str, Any]] = []
        try:
            conns = psutil.net_connections(kind="inet")
            for c in conns:
                # Exclude pure listening sockets here (handled in listeners)
                if c.status == psutil.CONN_LISTEN or not c.raddr:
                    continue

                proto = "TCP" if c.type == socket.SOCK_STREAM else "UDP"
                proc_name, _ = ProcessCorrelator.get_process_info(c.pid)

                connections.append({
                    "protocol": proto,
                    "source_ip": c.laddr.ip if c.laddr else "0.0.0.0",
                    "source_port": c.laddr.port if c.laddr else 0,
                    "destination_ip": c.raddr.ip if c.raddr else "0.0.0.0",
                    "destination_port": c.raddr.port if c.raddr else 0,
                    "state": c.status or "ESTABLISHED",
                    "pid": c.pid,
                    "process_name": proc_name,
                })
        except Exception:
            pass

        return connections
