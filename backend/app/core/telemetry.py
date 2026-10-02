from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)

# Custom or default registry
registry = CollectorRegistry()

# Total requests processed by the Megalodon Gateway
MEGALODON_REQUESTS_TOTAL = Counter(
    "megalodon_requests_total",
    "Total requests processed by Megalodon Gateway",
    ["method", "status", "backend"],
    registry=registry,
)

# Blocked requests by policy or security rule
MEGALODON_REQUESTS_BLOCKED_TOTAL = Counter(
    "megalodon_requests_blocked_total",
    "Total requests blocked by Megalodon IP policy or security rules",
    ["reason", "client_ip"],
    registry=registry,
)

# Rate-limited requests
MEGALODON_REQUESTS_RATE_LIMITED_TOTAL = Counter(
    "megalodon_requests_rate_limited_total",
    "Total requests rejected due to rate limit exhaustion",
    ["policy", "identifier"],
    registry=registry,
)

# Latency distribution in seconds
MEGALODON_REQUEST_DURATION_SECONDS = Histogram(
    "megalodon_request_duration_seconds",
    "Request latency through the Megalodon Gateway in seconds",
    ["backend", "status"],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
    registry=registry,
)

# Active connections observed
MEGALODON_ACTIVE_CONNECTIONS = Gauge(
    "megalodon_active_connections",
    "Number of active connections currently tracked",
    registry=registry,
)

# Backend errors
MEGALODON_BACKEND_ERRORS_TOTAL = Counter(
    "megalodon_backend_errors_total",
    "Total errors encountered contacting upstream backend services",
    ["backend", "error_type"],
    registry=registry,
)

# Security events detected
MEGALODON_SECURITY_EVENTS_TOTAL = Counter(
    "megalodon_security_events_total",
    "Security events triggered across Megalodon",
    ["severity", "event_type"],
    registry=registry,
)

# Host network interfaces discovered
MEGALODON_NETWORK_INTERFACES = Gauge(
    "megalodon_network_interfaces",
    "Count of discovered host network interfaces",
    ["state"],
    registry=registry,
)

# Listening ports discovered on host
MEGALODON_LISTENING_PORTS = Gauge(
    "megalodon_listening_ports",
    "Count of active listening ports discovered on host",
    ["protocol"],
    registry=registry,
)

# Host network connections
MEGALODON_NETWORK_CONNECTIONS = Gauge(
    "megalodon_network_connections",
    "Count of discovered host network connections",
    ["state"],
    registry=registry,
)

# Backward-compatibility aliases
SENTINEL_REQUESTS_TOTAL = MEGALODON_REQUESTS_TOTAL
SENTINEL_REQUESTS_BLOCKED_TOTAL = MEGALODON_REQUESTS_BLOCKED_TOTAL
SENTINEL_REQUESTS_RATE_LIMITED_TOTAL = MEGALODON_REQUESTS_RATE_LIMITED_TOTAL
SENTINEL_REQUEST_DURATION_SECONDS = MEGALODON_REQUEST_DURATION_SECONDS
SENTINEL_ACTIVE_CONNECTIONS = MEGALODON_ACTIVE_CONNECTIONS
SENTINEL_BACKEND_ERRORS_TOTAL = MEGALODON_BACKEND_ERRORS_TOTAL
SENTINEL_SECURITY_EVENTS_TOTAL = MEGALODON_SECURITY_EVENTS_TOTAL
SENTINEL_NETWORK_INTERFACES = MEGALODON_NETWORK_INTERFACES
SENTINEL_LISTENING_PORTS = MEGALODON_LISTENING_PORTS
SENTINEL_NETWORK_CONNECTIONS = MEGALODON_NETWORK_CONNECTIONS


def get_metrics_data() -> bytes:
    """Returns the latest Prometheus metrics in text format."""
    return generate_latest(registry)
