import ipaddress
from typing import List, Optional

from starlette.requests import Request

from app.core.config import settings
from app.core.logging import logger


DEFAULT_TRUSTED_PROXIES = [
    "127.0.0.1/32",
    "::1/128",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
]


class ClientIPDetector:
    def __init__(self, trusted_proxies: Optional[List[str]] = None):
        configured = trusted_proxies or settings.trusted_proxy_list
        all_proxies = list(configured) + [p for p in DEFAULT_TRUSTED_PROXIES if p not in configured]
        self.trusted_proxies = all_proxies
        self._parsed_networks = []
        for proxy in self.trusted_proxies:
            try:
                self._parsed_networks.append(ipaddress.ip_network(proxy, strict=False))
            except ValueError as e:
                logger.warning(f"Invalid trusted proxy CIDR '{proxy}': {e}")

    def is_trusted_proxy(self, ip_str: str) -> bool:
        """Determines if the given direct connection IP belongs to a trusted proxy."""
        try:
            ip = ipaddress.ip_address(ip_str)
            return any(ip in net for net in self._parsed_networks)
        except ValueError:
            return False

    def get_client_ip(self, request: Request) -> str:
        """
        Safely detects the real client IP.
        Never blindly trusts forwarded headers unless the direct peer is a trusted proxy.
        """
        direct_ip = request.client.host if request.client else "127.0.0.1"

        # If direct connection is not from a trusted proxy, return direct connection IP immediately
        if not self.is_trusted_proxy(direct_ip):
            return direct_ip

        # Check X-Forwarded-For
        x_forwarded_for = request.headers.get("x-forwarded-for")
        if x_forwarded_for:
            # Parse right-to-left or left-most client IP
            ips = [ip.strip() for ip in x_forwarded_for.split(",") if ip.strip()]
            for candidate in ips:
                try:
                    ipaddress.ip_address(candidate)
                    # Return the first valid client IP from the chain
                    return candidate
                except ValueError:
                    continue

        # Check X-Real-IP
        x_real_ip = request.headers.get("x-real-ip")
        if x_real_ip:
            try:
                ipaddress.ip_address(x_real_ip.strip())
                return x_real_ip.strip()
            except ValueError:
                pass

        return direct_ip


client_ip_detector = ClientIPDetector()
