import os
import socket
from typing import Any

import psutil
from megalodon_agent.processes import ProcessCorrelator


class SocketCollector:
    @staticmethod
    def collect_listeners() -> list[dict[str, Any]]:
        listeners: list[dict[str, Any]] = []
        seen = set()

        # Collect via psutil net_connections
        try:
            connections = psutil.net_connections(kind="inet")
            for conn in connections:
                # We want LISTEN state for TCP, or UDP sockets with no raddr
                is_tcp_listen = conn.type == socket.SOCK_STREAM and conn.status == psutil.CONN_LISTEN
                is_udp_listen = conn.type == socket.SOCK_DGRAM and not conn.raddr

                if is_tcp_listen or is_udp_listen:
                    proto = "TCP" if conn.type == socket.SOCK_STREAM else "UDP"
                    bind_ip = conn.laddr.ip if conn.laddr else "0.0.0.0"
                    port = conn.laddr.port if conn.laddr else 0

                    key = (proto, bind_ip, port)
                    if key in seen or port == 0:
                        continue
                    seen.add(key)

                    proc_name, cmdline = ProcessCorrelator.get_process_info(conn.pid)

                    listeners.append({
                        "protocol": proto,
                        "bind_address": bind_ip,
                        "port": port,
                        "pid": conn.pid,
                        "process_name": proc_name,
                        "command": cmdline,
                    })
        except Exception:
            pass

        # Parse Linux /proc/net/tcp and /proc/net/udp as supplemental safe inspection if permitted
        listeners.extend(SocketCollector._supplement_proc_net(seen))

        return listeners

    @staticmethod
    def _supplement_proc_net(seen: set) -> list[dict[str, Any]]:
        results = []
        for proto, filename in [("TCP", "/proc/net/tcp"), ("UDP", "/proc/net/udp")]:
            if not os.path.exists(filename):
                continue
            try:
                with open(filename, "r") as f:
                    lines = f.readlines()[1:]  # skip header
                for line in lines:
                    parts = line.strip().split()
                    if len(parts) < 4:
                        continue
                    # State 0A is LISTEN in hex for TCP
                    state_hex = parts[3]
                    if proto == "TCP" and state_hex != "0A":
                        continue

                    local_addr_hex = parts[1]
                    ip_hex, port_hex = local_addr_hex.split(":")
                    port = int(port_hex, 16)
                    # Convert little-endian hex to IP string
                    try:
                        ip_bytes = bytes.fromhex(ip_hex)[::-1]
                        ip_str = socket.inet_ntoa(ip_bytes)
                    except Exception:
                        ip_str = "0.0.0.0"

                    key = (proto, ip_str, port)
                    if key not in seen and port > 0:
                        seen.add(key)
                        results.append({
                            "protocol": proto,
                            "bind_address": ip_str,
                            "port": port,
                            "pid": None,
                            "process_name": "kernel socket",
                            "command": None,
                        })
            except Exception:
                continue
        return results
