import os
import socket
import struct
from typing import Any


class RouteCollector:
    @staticmethod
    def collect_routes() -> list[dict[str, Any]]:
        routes: list[dict[str, Any]] = []
        route_file = "/proc/net/route"
        if not os.path.exists(route_file):
            return routes

        try:
            with open(route_file, "r") as f:
                lines = f.readlines()[1:]  # skip header

            for line in lines:
                parts = line.strip().split()
                if len(parts) < 8:
                    continue

                iface = parts[0]
                dest_hex = parts[1]
                gw_hex = parts[2]
                flags = parts[3]
                metric = int(parts[6])
                mask_hex = parts[7]

                def hex_to_ip(h):
                    try:
                        return socket.inet_ntoa(struct.pack("<L", int(h, 16)))
                    except Exception:
                        return "0.0.0.0"

                dest_ip = hex_to_ip(dest_hex)
                gw_ip = hex_to_ip(gw_hex)
                mask_ip = hex_to_ip(mask_hex)

                routes.append({
                    "interface": iface,
                    "destination": dest_ip,
                    "gateway": gw_ip,
                    "genmask": mask_ip,
                    "flags": flags,
                    "metric": metric,
                })
        except Exception:
            pass

        return routes
