import os
from typing import Any

import httpx

API_BASE_URL = os.getenv("MEGALODON_API_URL") or os.getenv("SENTINEL_API_URL") or "http://localhost:8000"
API_KEY = os.getenv("MEGALODON_API_KEY") or os.getenv("SENTINEL_API_KEY") or ""


class MegalodonClient:
    def __init__(self, base_url: str = API_BASE_URL, api_key: str = API_KEY):
        self.base_url = base_url.rstrip("/")
        self.headers = {"Content-Type": "application/json"}
        if api_key:
            self.headers["X-API-Key"] = api_key

    def _get(self, path: str) -> httpx.Response:
        return httpx.get(f"{self.base_url}{path}", headers=self.headers, timeout=10.0)

    def _post(self, path: str, json_data: dict) -> httpx.Response:
        return httpx.post(f"{self.base_url}{path}", json=json_data, headers=self.headers, timeout=10.0)

    def _delete(self, path: str) -> httpx.Response:
        return httpx.delete(f"{self.base_url}{path}", headers=self.headers, timeout=10.0)

    def get_health(self) -> dict[str, Any]:
        resp = self._get("/ready")
        return resp.json() if resp.status_code == 200 else {"status": "error", "code": resp.status_code}

    def get_metrics(self) -> dict[str, Any]:
        resp = self._get("/api/v1/traffic/metrics")
        return resp.json() if resp.status_code == 200 else {}

    def get_interfaces(self) -> list[dict[str, Any]]:
        resp = self._get("/api/v1/network/interfaces")
        return resp.json() if resp.status_code == 200 else []

    def get_ports(self) -> list[dict[str, Any]]:
        resp = self._get("/api/v1/network/ports")
        return resp.json() if resp.status_code == 200 else []

    def get_connections(self) -> list[dict[str, Any]]:
        resp = self._get("/api/v1/network/connections")
        return resp.json() if resp.status_code == 200 else []

    def list_ip_policies(self) -> list[dict[str, Any]]:
        resp = self._get("/api/v1/ip-policies")
        return resp.json() if resp.status_code == 200 else []

    def block_ip(self, ip_or_cidr: str, reason: str = "Blocked via CLI", duration_minutes: int | None = None) -> dict[str, Any]:
        payload = {
            "ip_or_cidr": ip_or_cidr,
            "action": "TEMPORARY_BLOCK" if duration_minutes else "BLOCK",
            "duration_minutes": duration_minutes,
            "reason": reason,
        }
        resp = self._post("/api/v1/ip-policies", payload)
        return resp.json() if resp.status_code in (200, 201) else {"error": resp.text}

    def unblock_ip(self, ip_or_cidr: str) -> bool:
        policies = self.list_ip_policies()
        target = next((p for p in policies if p.get("ip_or_cidr") == ip_or_cidr), None)
        if not target:
            return False
        resp = self._delete(f"/api/v1/ip-policies/{target['id']}")
        return resp.status_code in (200, 204)

    def list_rules(self) -> list[dict[str, Any]]:
        resp = self._get("/api/v1/security-rules")
        return resp.json() if resp.status_code == 200 else []

    def list_backends(self) -> list[dict[str, Any]]:
        resp = self._get("/api/v1/backends")
        return resp.json() if resp.status_code == 200 else []


SentinelClient = MegalodonClient
client = MegalodonClient()
