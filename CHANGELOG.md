# Changelog

All notable changes to Megalodon will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-01

### Added
- **Core Architecture**:
  - FastAPI asynchronous backend with SQLAlchemy 2.0 and Alembic migrations.
  - Redis integration for distributed sliding window, fixed window, and token bucket rate limiting.
  - Apache Kafka asynchronous event streaming for request telemetry, security events, and audit logs.
  - Prometheus metrics exporter (`/metrics`) and Grafana pre-provisioned dashboards.
- **Megalodon Network Discovery Agent**:
  - Continuous host discovery inspecting `/proc/net`, interfaces, IPv4, IPv6, MAC, listening ports, active connections, and correlated processes.
  - Network state change detection generating real-time lifecycle events.
- **Megalodon Gateway & Reverse Proxy**:
  - Dynamic reverse proxy engine with SSRF guardrails and trusted proxy client IP detection.
  - IP policy evaluation supporting CIDR ranges, temporary blocks with TTL, and permanent blocks.
  - Dynamic Security Rule Engine with condition chaining (`IF ... AND ... THEN ...`).
- **WebUI (React + TypeScript + Vite + Tailwind CSS)**:
  - Modern cybersecurity command center with dark theme and glassmorphic UI.
  - Real-time WebSocket live traffic feed with pause/resume and search filters.
  - Interactive Network Topology Map and deep-dive IP/Port inspection drawers.
  - Visual security rule creator and rate-limit policy manager.
- **Access Control & Audit**:
  - JWT authentication with Argon2id password hashing and refresh tokens.
  - Role-Based Access Control (Admin, Operator, Viewer).
  - Cryptographically secure hashed API keys with rotation and revocation.
  - Comprehensive immutable audit logging.
- **CLI & DevOps**:
  - Typer CLI (`megalodon`) for terminal status, network discovery, IP management, and health checks.
  - Production-ready `docker-compose.yml` with health checks, persistent volumes, and non-root execution.
  - Automated test suite covering unit, integration, and load tests.
