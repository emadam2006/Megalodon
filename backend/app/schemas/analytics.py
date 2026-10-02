from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class RequestLogEntry(BaseModel):
    timestamp: datetime
    request_id: str
    client_ip: str
    interface: str = "eth0"
    destination_ip: str
    destination_port: int
    method: str
    path: str
    status_code: int
    response_time_ms: float
    request_size_bytes: int = 0
    response_size_bytes: int = 0
    user_agent: Optional[str] = None
    backend_service: Optional[str] = None
    rate_limited: bool = False
    blocked: bool = False
    action_taken: str = "FORWARDED"  # FORWARDED, BLOCKED, RATE_LIMITED


class TrafficTimeseriesPoint(BaseModel):
    timestamp: str
    requests: int
    blocked: int = 0
    rate_limited: int = 0
    avg_latency_ms: float = 0.0
    p50_latency_ms: float = 0.0
    p95_latency_ms: float = 0.0
    p99_latency_ms: float = 0.0
    success_count: int = 0
    error_count: int = 0
    bandwidth_kb: float = 0.0


class TopEntityStat(BaseModel):
    key: str
    count: int
    percentage: float = 0.0


class DashboardMetrics(BaseModel):
    total_requests: int
    requests_per_second: float
    blocked_requests: int
    rate_limited_requests: int
    unique_ips: int
    unique_ports: int
    open_ports_count: int
    active_connections_count: int
    error_rate_percentage: float
    avg_latency_ms: float
    p50_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    bandwidth_bytes_total: int = 0
    bandwidth_kbps: float = 0.0
    traffic_timeseries: List[TrafficTimeseriesPoint] = []
    status_distribution: Dict[str, int] = {}
    top_ips: List[TopEntityStat] = []
    top_ports: List[TopEntityStat] = []
    top_routes: List[TopEntityStat] = []


class IPDetailResponse(BaseModel):
    ip: str
    status: str  # ALLOWED, BLOCKED, TEMPORARY_BLOCKED, UNKNOWN
    interface: str
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    total_requests: int
    blocked_requests: int
    rate_limited_requests: int
    error_count: int
    avg_latency_ms: float
    top_paths: List[TopEntityStat] = []
    ports_accessed: List[int] = []
    http_methods: Dict[str, int] = {}
    status_codes: Dict[str, int] = {}
    security_events: List[Dict[str, Any]] = []
    recent_requests: List[RequestLogEntry] = []


class PortDetailResponse(BaseModel):
    port: int
    protocol: str
    interface: str
    bind_address: str
    process_name: Optional[str] = None
    pid: Optional[int] = None
    command: Optional[str] = None
    total_connections: int
    active_connections: int
    unique_source_ips: int
    avg_latency_ms: float
    error_rate: float
    recent_connections: List[Dict[str, Any]] = []
