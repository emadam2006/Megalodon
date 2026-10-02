# Megalodon
Open-source infrastructure security platform that discovers, monitors, analyzes, and protects your network and API traffic in real time.


 ### Key Sections Included in the GitHub README

  1. Header & Badges:
      • Build status, Apache 2.0 license, Python 3.12+, React 18, Docker Compose, Redis 7, and Apache Kafka (KRaft).
  2. Architecture Diagram:
      • Detailed ASCII/Unicode topology depicting Ingress → Gateway (:8080) → FastAPI Core (:8000) → Redis, PostgreSQL, Kafka → Linux Host Network Discovery Agent → React Command Center
      (:3000).
  3. Core Feature Deep-Dives:
      • Ingress API Gateway & Reverse Proxy: Dynamic routing, SSRF protection against cloud metadata and private subnets, trusted proxy header resolution.
      • Distributed Multi-Algorithm Rate Limiter: Token Bucket, Sliding Window Log, and Fixed Window counters in Redis with standard RFC headers (X-RateLimit-*).
      • Security Rule Engine & Firewall: Multi-condition chaining (IF ... AND ... THEN ...), IP CIDR filtering, and automated malicious IP quarantine.
      • Host Network Visibility: /proc/net kernel scraping, socket-to-process PID correlation, active connection tracking, and Kafka event streaming.
      • Built-in Observability & Telemetry Center: Embedded single-pane-of-glass dashboard for p₅₀, p₉₅, p₉₉ latency percentiles, traffic composition, HTTP status counters, host system
      resources (CPU/RAM/uptime), and live OpenMetrics/Prometheus scraper with copy/export.
      • Authentication, RBAC & Credential Governance: Enforced first-login password change policy and password complexity requirements.
  4. Quick Start & Ports Map:
      • 3-step setup via docker compose up -d --build.
      • Complete table of all exposed ports and their roles.
  5. Access & Default Credentials:
      • Web UI: http://localhost:3000
      • Core API & Swagger Docs: http://localhost:8000/docs
      • Initial login: admin / admin123 with explanation of the first-login mandatory password change modal.
  6. Megalodon CLI Reference:
      • Usage guide for megalodon health, megalodon network interfaces, megalodon network ports, and megalodon ip block.
  7. REST API Reference:
      • Comprehensive endpoint tables for Auth, Traffic/Observability, Network Discovery, and Security/Rules.
  8. Configuration Reference (.env):
      • Descriptions and defaults for security keys, rate limits, network agents, and database URLs.
  9. Testing & Verification:
      • Local test execution with pytest and frontend build steps.
  10. Security Best Practices & Apache 2.0 License.
