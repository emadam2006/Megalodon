import ipaddress
import socket
from typing import Any

import psutil


class InterfaceCollector:
    @staticmethod
    def collect_interfaces() -> list[dict[str, Any]]:
        interfaces: list[dict[str, Any]] = []
        try:
            addrs = psutil.net_if_addrs()
            stats = psutil.net_if_stats()
        except Exception:
            return interfaces

        for iface_name, addr_list in addrs.items():
            iface_stat = stats.get(iface_name)
            is_up = iface_stat.isup if iface_stat else True
            speed = iface_stat.speed if iface_stat else 0
            mtu = iface_stat.mtu if iface_stat else 1500

            mac_address = None
            addresses = []

            for addr in addr_list:
                # AF_LINK / MAC address
                if addr.family == psutil.AF_LINK or addr.family == getattr(socket, "AF_PACKET", 17):
                    mac_address = addr.address
                # IPv4
                elif addr.family == socket.AF_INET:
                    prefix = 32
                    if addr.netmask:
                        try:
                            prefix = ipaddress.IPv4Network(f"0.0.0.0/{addr.netmask}").prefixlen
                        except ValueError:
                            prefix = 32
                    addresses.append({
                        "family": "IPv4",
                        "address": addr.address,
                        "prefix": prefix,
                    })
                # IPv6
                elif addr.family == socket.AF_INET6:
                    # Strip scope id if present (e.g. fe80::...%eth0)
                    clean_ip = addr.address.split("%")[0]
                    addresses.append({
                        "family": "IPv6",
                        "address": clean_ip,
                        "prefix": 64,
                    })

            interfaces.append({
                "name": iface_name,
                "state": "UP" if is_up else "DOWN",
                "mac_address": mac_address,
                "speed_mbps": speed if speed > 0 else None,
                "mtu": mtu,
                "addresses": addresses,
            })

        return interfaces
