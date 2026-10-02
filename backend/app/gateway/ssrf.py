import ipaddress
import socket
from typing import Tuple
from urllib.parse import urlparse

from app.core.logging import logger

# Dangerous IP ranges to block by default for reverse proxy targets
METADATA_IP = ipaddress.ip_address("169.254.169.254")  # AWS/GCP/Azure link-local metadata
LINK_LOCAL_NETV4 = ipaddress.ip_network("169.254.0.0/16")
LINK_LOCAL_NETV6 = ipaddress.ip_network("fe80::/10")


class SSRFProtection:
    @staticmethod
    def validate_target_url(url: str, allow_private: bool = True, allow_loopback: bool = True) -> Tuple[bool, str]:
        """
        Validates an upstream target URL to protect against SSRF and metadata exfiltration.
        By default in Docker Compose, private subnets (e.g. docker network 172.x) are allowed
        for configured backends, but cloud metadata endpoints are strictly blocked.
        """
        try:
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https"):
                return False, f"Unsupported scheme: {parsed.scheme}. Only HTTP/HTTPS allowed."

            hostname = parsed.hostname
            if not hostname:
                return False, "Target URL missing hostname."

            # Resolve hostname to check IP
            try:
                ip_info = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80))
            except socket.gaierror:
                return False, f"Could not resolve hostname: {hostname}"

            for item in ip_info:
                ip_str = item[4][0]
                ip = ipaddress.ip_address(ip_str)

                # Strictly block link-local and cloud metadata endpoints
                if ip == METADATA_IP or (isinstance(ip, ipaddress.IPv4Address) and ip in LINK_LOCAL_NETV4):
                    return False, f"Access to cloud metadata service ({ip_str}) is prohibited."

                if isinstance(ip, ipaddress.IPv6Address) and ip in LINK_LOCAL_NETV6:
                    return False, f"Access to IPv6 link-local address ({ip_str}) is prohibited."

                # Disallow loopback if configured
                if not allow_loopback and ip.is_loopback:
                    return False, f"Access to loopback address ({ip_str}) is disallowed."

                # Disallow private RFC1918 if configured
                if not allow_private and ip.is_private:
                    return False, f"Access to private RFC1918 address ({ip_str}) is disallowed."

            return True, "Valid target URL"
        except Exception as e:
            logger.error(f"Error during SSRF target validation: {e}")
            return False, f"SSRF check error: {str(e)}"
