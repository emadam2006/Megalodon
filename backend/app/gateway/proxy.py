from typing import Dict, Tuple

import httpx

from app.core.logging import logger
from app.gateway.ssrf import SSRFProtection


class ReverseProxyEngine:
    def __init__(self):
        # Persistent async client with connection pooling
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            follow_redirects=False,
            verify=False,
        )

    async def forward_request(
        self,
        upstream_base_url: str,
        subpath: str,
        method: str,
        headers: Dict[str, str],
        query_string: str,
        body: bytes,
        timeout: float = 30.0,
    ) -> Tuple[int, Dict[str, str], bytes]:
        """
        Forwards incoming HTTP request to upstream service safely with SSRF protection.
        Returns:
            (status_code, response_headers, response_body)
        """
        # Formulate full upstream URL
        clean_base = upstream_base_url.rstrip("/")
        clean_path = subpath if subpath.startswith("/") else f"/{subpath}"
        full_url = f"{clean_base}{clean_path}"
        if query_string:
            full_url = f"{full_url}?{query_string}"

        # Perform SSRF check
        is_safe, error_msg = SSRFProtection.validate_target_url(full_url)
        if not is_safe:
            logger.warning(f"Blocked SSRF attempt to {full_url}: {error_msg}")
            return 502, {"content-type": "application/json"}, f'{{"error": "Bad Gateway - Target blocked by SSRF filter: {error_msg}"}}'.encode("utf-8")

        # Strip hop-by-hop headers
        hop_by_hop = {
            "connection", "keep-alive", "proxy-authenticate",
            "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade", "host"
        }
        forward_headers = {k: v for k, v in headers.items() if k.lower() not in hop_by_hop}

        try:
            upstream_resp = await self.client.request(
                method=method,
                url=full_url,
                headers=forward_headers,
                content=body,
                timeout=timeout,
            )

            # Sanitize response headers
            resp_headers = {}
            for k, v in upstream_resp.headers.items():
                if k.lower() not in hop_by_hop and k.lower() != "content-length":
                    resp_headers[k] = v

            return upstream_resp.status_code, resp_headers, upstream_resp.content

        except httpx.ConnectTimeout:
            logger.error(f"Upstream timeout connecting to {full_url}")
            return 504, {"content-type": "application/json"}, b'{"error": "Gateway Timeout: Backend did not respond"}'
        except httpx.ConnectError as e:
            logger.error(f"Upstream connection failed for {full_url}: {e}")
            return 502, {"content-type": "application/json"}, f'{{"error": "Bad Gateway: Could not connect to upstream backend - {str(e)}"}}'.encode("utf-8")
        except Exception as e:
            logger.error(f"Reverse proxy unexpected exception: {e}")
            return 502, {"content-type": "application/json"}, b'{"error": "Bad Gateway: Upstream request error"}'

    async def close(self):
        await self.client.aclose()


proxy_engine = ReverseProxyEngine()
