import collections
import math
from datetime import datetime, timezone
from typing import Any, Deque, Dict, List, Optional

from app.schemas.analytics import (
    DashboardMetrics,
    IPDetailResponse,
    PortDetailResponse,
    RequestLogEntry,
    TopEntityStat,
    TrafficTimeseriesPoint,
)


class AnalyticsService:
    def __init__(self, max_history: int = 5000):
        # Rolling request buffer
        self._history: Deque[RequestLogEntry] = collections.deque(maxlen=max_history)
        self._ip_stats: Dict[str, Dict[str, Any]] = collections.defaultdict(
            lambda: {
                "first_seen": datetime.now(timezone.utc),
                "last_seen": datetime.now(timezone.utc),
                "total": 0,
                "blocked": 0,
                "rate_limited": 0,
                "errors": 0,
                "latencies": [],
                "paths": collections.Counter(),
                "ports": set(),
                "methods": collections.Counter(),
                "statuses": collections.Counter(),
                "interface": "eth0",
            }
        )

    def record_request(self, entry: RequestLogEntry):
        self._history.append(entry)

        # Update per-IP stats
        ip_data = self._ip_stats[entry.client_ip]
        ip_data["last_seen"] = entry.timestamp
        ip_data["total"] += 1
        ip_data["interface"] = entry.interface
        if entry.blocked:
            ip_data["blocked"] += 1
        if entry.rate_limited:
            ip_data["rate_limited"] += 1
        if entry.status_code >= 400:
            ip_data["errors"] += 1
        ip_data["latencies"].append(entry.response_time_ms)
        if len(ip_data["latencies"]) > 200:
            ip_data["latencies"].pop(0)

        ip_data["paths"][entry.path] += 1
        ip_data["ports"].add(entry.destination_port)
        ip_data["methods"][entry.method] += 1
        ip_data["statuses"][str(entry.status_code)] += 1

    def get_recent_requests(self, limit: int = 50) -> List[RequestLogEntry]:
        items = list(self._history)
        return items[-limit:][::-1]

    def get_dashboard_metrics(self) -> DashboardMetrics:
        entries = list(self._history)
        total = len(entries)

        if total == 0:
            return DashboardMetrics(
                total_requests=0,
                requests_per_second=0.0,
                blocked_requests=0,
                rate_limited_requests=0,
                unique_ips=0,
                unique_ports=0,
                open_ports_count=0,
                active_connections_count=0,
                error_rate_percentage=0.0,
                avg_latency_ms=0.0,
                p50_latency_ms=0.0,
                p95_latency_ms=0.0,
                p99_latency_ms=0.0,
                traffic_timeseries=[],
                status_distribution={},
                top_ips=[],
                top_ports=[],
                top_routes=[],
            )

        blocked_count = sum(1 for e in entries if e.blocked)
        rate_limited_count = sum(1 for e in entries if e.rate_limited)
        errors_count = sum(1 for e in entries if e.status_code >= 400)
        unique_ips = len(set(e.client_ip for e in entries))
        unique_ports = len(set(e.destination_port for e in entries))

        latencies = sorted(e.response_time_ms for e in entries)
        avg_latency = sum(latencies) / float(total)

        def percentile(sorted_arr, p):
            idx = int(math.ceil(p * len(sorted_arr))) - 1
            return sorted_arr[max(0, min(idx, len(sorted_arr) - 1))]

        p50 = percentile(latencies, 0.50)
        p95 = percentile(latencies, 0.95)
        p99 = percentile(latencies, 0.99)

        # Status distribution
        statuses = collections.Counter(str(e.status_code) for e in entries)

        # Top IPs
        ip_counts = collections.Counter(e.client_ip for e in entries).most_common(5)
        top_ips = [
            TopEntityStat(key=ip, count=cnt, percentage=round((cnt / total) * 100, 1))
            for ip, cnt in ip_counts
        ]

        # Top Ports
        port_counts = collections.Counter(str(e.destination_port) for e in entries).most_common(5)
        top_ports = [
            TopEntityStat(key=str(port), count=cnt, percentage=round((cnt / total) * 100, 1))
            for port, cnt in port_counts
        ]

        # Top Routes
        route_counts = collections.Counter(e.path for e in entries).most_common(5)
        top_routes = [
            TopEntityStat(key=route, count=cnt, percentage=round((cnt / total) * 100, 1))
            for route, cnt in route_counts
        ]

        # Timeseries breakdown (aggregate last minute buckets)
        timeseries: List[TrafficTimeseriesPoint] = []
        buckets: Dict[str, List[RequestLogEntry]] = collections.defaultdict(list)
        for e in entries[-120:]:
            time_bucket = e.timestamp.strftime("%H:%M:%S")
            buckets[time_bucket].append(e)

        total_bytes = sum(e.request_size_bytes + e.response_size_bytes for e in entries)
        bandwidth_kbps = round((total_bytes / 1024.0) / max(1, len(entries)), 2)

        for bucket_time, b_entries in list(buckets.items())[-20:]:
            b_total = len(b_entries)
            b_blocked = sum(1 for x in b_entries if x.blocked)
            b_rate_limited = sum(1 for x in b_entries if x.rate_limited)
            b_errors = sum(1 for x in b_entries if x.status_code >= 400)
            b_success = b_total - b_errors
            b_bytes = sum(x.request_size_bytes + x.response_size_bytes for x in b_entries)
            b_lats = sorted(x.response_time_ms for x in b_entries)
            b_avg_lat = sum(b_lats) / float(b_total) if b_total else 0.0
            b_p50 = percentile(b_lats, 0.50) if b_lats else 0.0
            b_p95 = percentile(b_lats, 0.95) if b_lats else 0.0
            b_p99 = percentile(b_lats, 0.99) if b_lats else 0.0

            timeseries.append(TrafficTimeseriesPoint(
                timestamp=bucket_time,
                requests=b_total,
                blocked=b_blocked,
                rate_limited=b_rate_limited,
                avg_latency_ms=round(b_avg_lat, 2),
                p50_latency_ms=round(b_p50, 2),
                p95_latency_ms=round(b_p95, 2),
                p99_latency_ms=round(b_p99, 2),
                success_count=b_success,
                error_count=b_errors,
                bandwidth_kb=round(b_bytes / 1024.0, 2),
            ))

        return DashboardMetrics(
            total_requests=total,
            requests_per_second=round(min(total, 50.0), 2),
            blocked_requests=blocked_count,
            rate_limited_requests=rate_limited_count,
            unique_ips=unique_ips,
            unique_ports=unique_ports,
            open_ports_count=unique_ports,
            active_connections_count=len(entries[-20:]),
            error_rate_percentage=round((errors_count / total) * 100, 2),
            avg_latency_ms=round(avg_latency, 2),
            p50_latency_ms=round(p50, 2),
            p95_latency_ms=round(p95, 2),
            p99_latency_ms=round(p99, 2),
            bandwidth_bytes_total=total_bytes,
            bandwidth_kbps=bandwidth_kbps,
            traffic_timeseries=timeseries,
            status_distribution=dict(statuses),
            top_ips=top_ips,
            top_ports=top_ports,
            top_routes=top_routes,
        )

    def get_ip_details(self, ip: str) -> IPDetailResponse:
        data = self._ip_stats.get(ip)
        if not data:
            return IPDetailResponse(
                ip=ip,
                status="UNKNOWN",
                interface="eth0",
                first_seen=None,
                last_seen=None,
                total_requests=0,
                blocked_requests=0,
                rate_limited_requests=0,
                error_count=0,
                avg_latency_ms=0.0,
                top_paths=[],
                ports_accessed=[],
                http_methods={},
                status_codes={},
                security_events=[],
                recent_requests=[],
            )

        latencies = data["latencies"]
        avg_lat = (sum(latencies) / len(latencies)) if latencies else 0.0
        top_paths = [
            TopEntityStat(key=p, count=c) for p, c in data["paths"].most_common(5)
        ]
        recent = [e for e in reversed(self._history) if e.client_ip == ip][:15]

        status = "ALLOWED"
        if data["blocked"] > 0:
            status = "BLOCKED"
        elif data["rate_limited"] > 0:
            status = "RATE_LIMITED"

        return IPDetailResponse(
            ip=ip,
            status=status,
            interface=data["interface"],
            first_seen=data["first_seen"],
            last_seen=data["last_seen"],
            total_requests=data["total"],
            blocked_requests=data["blocked"],
            rate_limited_requests=data["rate_limited"],
            error_count=data["errors"],
            avg_latency_ms=round(avg_lat, 2),
            top_paths=top_paths,
            ports_accessed=list(data["ports"]),
            http_methods=dict(data["methods"]),
            status_codes=dict(data["statuses"]),
            security_events=[],
            recent_requests=recent,
        )

    def get_port_details(
        self,
        port: int,
        listener: Optional[Any] = None,
        live_connections: Optional[List[Any]] = None,
    ) -> PortDetailResponse:
        port_entries = [e for e in self._history if e.destination_port == port]

        # Correlate real host socket connections (e.g. SSH on port 22, DB on 5432, etc.)
        port_conns = []
        if live_connections:
            port_conns = [
                c for c in live_connections
                if getattr(c, "source_port", None) == port or getattr(c, "destination_port", None) == port
            ]

        source_ips = set()
        for c in port_conns:
            s_ip = getattr(c, "source_ip", "")
            d_ip = getattr(c, "destination_ip", "")
            if s_ip:
                source_ips.add(s_ip)
            if d_ip:
                source_ips.add(d_ip)
        for e in port_entries:
            source_ips.add(e.client_ip)
        source_ips.discard("")

        unique_ips = len(source_ips)
        errors = sum(1 for e in port_entries if e.status_code >= 400)
        avg_lat = (sum(e.response_time_ms for e in port_entries) / len(port_entries)) if port_entries else 0.0
        error_rate = (errors / len(port_entries)) * 100.0 if port_entries else 0.0

        recent: List[Dict[str, Any]] = []
        # Add host kernel socket connections first
        for c in port_conns:
            src_ip = getattr(c, "source_ip", "")
            src_port = getattr(c, "source_port", 0)
            dst_ip = getattr(c, "destination_ip", "")
            dst_port = getattr(c, "destination_port", 0)
            is_incoming = (src_port == port)
            state = getattr(c, "state", "ESTABLISHED")
            proto = getattr(c, "protocol", "TCP")
            proc = getattr(c, "process_name", None) or (getattr(listener, "process_name", None) if listener else None)
            pid = getattr(c, "pid", None) or (getattr(listener, "pid", None) if listener else None)

            recent.append({
                "source_ip": src_ip,
                "source_port": src_port,
                "destination_ip": dst_ip,
                "destination_port": dst_port,
                "client_ip": src_ip,
                "remote_port": dst_port,
                "flow": f"from {src_ip}:{src_port} connect to {dst_ip}:{dst_port}",
                "method": proto,
                "path": f"from {src_ip}:{src_port} connect to {dst_ip}:{dst_port}",
                "status": state,
                "latency": 0.0,
                "direction": "INBOUND" if is_incoming else "OUTBOUND",
                "pid": pid,
                "process_name": proc,
            })

        # Also append HTTP requests if any
        for e in port_entries[-10:]:
            recent.append({
                "client_ip": e.client_ip,
                "remote_port": None,
                "method": e.method,
                "path": e.path,
                "status": str(e.status_code),
                "latency": e.response_time_ms,
                "direction": "HTTP",
                "timestamp": e.timestamp.isoformat(),
            })

        total_conns = len(port_conns) if port_conns else len(port_entries)
        active_conns = sum(
            1 for c in port_conns
            if getattr(c, "state", "") in ("ESTABLISHED", "SYN_SENT", "SYN_RECV")
        ) if port_conns else len(port_entries[-5:])
        if active_conns == 0 and port_conns:
            active_conns = len(port_conns)

        protocol = getattr(listener, "protocol", "TCP") if listener else "TCP"
        bind_addr = getattr(listener, "bind_address", "0.0.0.0") if listener else "0.0.0.0"
        proc_name = (
            getattr(listener, "process_name", None)
            if listener and getattr(listener, "process_name", None)
            else ("megalodon-gateway" if port in (80, 443, 8080) else "service")
        )
        pid = getattr(listener, "pid", None) if listener else None
        command = getattr(listener, "command", None) if listener else None

        return PortDetailResponse(
            port=port,
            protocol=protocol,
            interface="eth0",
            bind_address=bind_addr,
            process_name=proc_name,
            pid=pid,
            command=command,
            total_connections=total_conns,
            active_connections=active_conns,
            unique_source_ips=unique_ips,
            avg_latency_ms=round(avg_lat, 2),
            error_rate=round(error_rate, 2),
            recent_connections=recent,
        )


analytics_service = AnalyticsService()
