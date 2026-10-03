<div align="center">
  <h1>🦈 Megalodon</h1>
  <p><strong>Production-Grade Self-Hosted API Security, Traffic Management, Host Visibility & Cyber-Defense Platform</strong></p>
  <p>
    <a href="https://github.com/emadam2006/Megalodon/actions"><img src="https://img.shields.io/badge/build-passing-brightgreen.svg" alt="Build Status"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="License"></a>
    <a href="https://fastapi.tiangolo.com"><img src="https://img.shields.io/badge/Python-3.12%2B-blue.svg" alt="Python"></a>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/React-18-cyan.svg" alt="React"></a>
    <a href="https://www.docker.com"><img src="https://img.shields.io/badge/deployment-docker--compose-2496ED.svg" alt="Docker Compose"></a>
    <a href="https://redis.io"><img src="https://img.shields.io/badge/redis-7.x-red.svg" alt="Redis"></a>
    <a href="https://kafka.apache.org"><img src="https://img.shields.io/badge/kafka-KRaft-black.svg" alt="Kafka"></a>
  </p>
</div>

---

## 📖 Overview

**Megalodon** is an open-source, production-ready, self-hosted cybersecurity and infrastructure platform engineered to run directly on your Linux host server or VPS. It combines the capabilities of a high-performance **Asynchronous API Engine & Traffic Inspector** with an automated **Kernel Network Discovery Agent**, a real-time **Security Rule & Firewall Engine**, and an integrated **Cyber-Defense Command Center (React 18 & TypeScript)**.

Unlike typical cloud API management tools that operate detached from the host operating system, Megalodon bridges application-layer HTTP traffic and host-layer Linux networking into a unified single-pane-of-glass interface.

### Key Highlights
- **Zero Kubernetes Overhead**: Runs entirely via lightweight Docker Compose on any standard Linux VPS or bare-metal host.
- **Embedded Observability**: High-frequency metrics, percentile latency curves ($p_{50}$, $p_{95}$, $p_{99}$), traffic composition charts, and infrastructure health built directly into the native web panel.
- **Host Network Awareness**: Automatically correlates host kernel interfaces, listening sockets, active connections, and OS processes with incoming traffic.
- **Dynamic Policy Enforcement**: Subnet CIDR IP filtering, automated rate limiting (Token Bucket, Sliding Window, Fixed Window), condition-chaining rule engine, and automated malicious IP quarantine.

---

## 🔒 Security Best Practices (Read Before Deployment)

> [!IMPORTANT]
> Megalodon is a security and network defense gateway. Before exposing any service publicly, apply these essential production hardening rules:

1. **Change the Default Secret Key**: Immediately update `MEGALODON_SECRET_KEY` in `.env` with a high-entropy 32+ character random string before public deployment.
2. **Update Database Credentials**: Change `POSTGRES_PASSWORD` from the default placeholder to a strong, random passphrase.
3. **Restrict Network Agent Token**: Ensure `NETWORK_AGENT_TOKEN` is kept secret and randomized to prevent unauthorized telemetry injection.
4. **Use TLS Termination**: Place a reverse proxy with valid TLS certificates (such as Caddy, Nginx, or Cloudflare) in front of port `3000` for public-facing deployments.

---

## 🏗️ System Architecture

```text
                                 [ Ingress Traffic: Internet / Clients ]
                                                   |
                                                   v
====================================================================================================
  LINUX HOST / VPS  (Docker Compose Stack)
====================================================================================================
                                                   |
               +-----------------------------------+-----------------------------------+
               |                                                                       |
               v (Port 8000)                                                           v (Port 3000)
    +-----------------------+                                               +----------------------+
    |  Megalodon Core Engine|                                               |  React Web Dashboard |
    |  (API & Security Core)|                                               |  (Command Center UI) |
    +-----------+-----------+                                               +----------+-----------+
                |                                                                      |
    [ Rate Limiting / WAF ]                                                            |
    [ SSRF / IP Validation]                                                            |
                |                                                                      |
                +----------------------------------------------------------------------+
                |
        +-------+-------+--------------------+--------------------+
        |               |                    |                    |
        v               v                    v                    v
  +-----------+   +-----------+        +-----------+        +--------------------------+
  | PostgreSQL|   |   Redis   |        |   Kafka   |        |  Megalodon Host Agent    |
  |  (:5432)  |   |  (:6379)  |        |  (:9092)  |        |  (network_mode: "host")  |
  +-----------+   +-----------+        +-----+-----+        +------------+-------------+
  Persistent Data Token Bucket Rate          | Distributed               |
  Users, Rules,   Limiting, Key Cache,       | Event Stream              | /proc/net/dev, tcp, udp
  Audit Logs      Session Stores             v                           | Socket-to-PID correlation
                                       +--------------------+            v
                                       | Async Workers Pool | ---> [ Host Interfaces & Ports ]
                                       |  - Analytics       |
                                       |  - Security & Ban  |
                                       |  - Alert Dispatch  |
                                       +--------------------+
```

---

## 🌟 Core Platform Features

### 1. Ingress Traffic Security & Proxy Engine
- **Prefix & Route Filtering**: Dynamic routing and traffic inspection with automated header sanitization.
- **SSRF Hardening**: Rejects requests targeting private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopbacks (`127.0.0.1`), and cloud metadata services (`169.254.169.254`).
- **Client IP Resolver**: Trusted proxy aware IP resolution that strips spoofed `X-Forwarded-For` and `X-Real-IP` headers.
- **Upstream Health Monitoring**: Background probes track backend health and isolate failing services.

### 2. Multi-Algorithm Distributed Rate Limiting
- **Token Bucket**: Handles bursty workloads smoothly with steady-state replenishing.
- **Sliding Window Log**: Sub-second precision preventing boundary-burst exploits.
- **Fixed Window Counter**: Ultra-fast, minimal Redis footprint.
- **Standard Headers**: Emits standard `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.

### 3. Security Rule Engine & Automated Firewall
- **Condition Chaining**: Complex rule evaluation (`IF method == POST AND path STARTSWITH /api AND rate > 100 THEN BLOCK`).
- **IP Policies & CIDR Filtering**: Permanent allow/deny lists, temporary quarantine with automatic TTL expiration.
- **Automated Quarantine**: High-frequency attack detection automatically blacklists offending client IPs in Redis and PostgreSQL.
- **Audit Logging**: Comprehensive, immutable audit trail of all security events, rule violations, and admin actions.

### 4. Linux Host Network Discovery
- **Interface Inspection**: Monitors operational state (`UP`/`DOWN`), MAC address, MTU, speed, and IPv4/IPv6 assignments.
- **Listening Sockets & Process Correlation**: Discovers all active listening TCP/UDP sockets and binds them to host processes (`PID`, process binary name, and command line).
- **Socket Connection Tracker**: Maps established, listening, and closing connections (e.g., `192.168.15.130:57182 -> 178.10.10.15:22`) with search filters (e.g. `port:22`).
- **Event-Driven Topology**: Emits real-time Kafka events on socket changes (`PORT_OPENED`, `PORT_CLOSED`, `NETWORK_INTERFACE_ADDED`).

### 5. Built-in Observability & Telemetry Center
- **Native Single-Pane Experience**: All metrics, latency curves, and health telemetry are built directly into the Megalodon Web Panel—no external third-party monitoring containers needed.
- **Percentile Latency Analytics**: Dynamic $p_{50}$, $p_{95}$, and $p_{99}$ latency distributions graphed over time.
- **Traffic Composition**: Live visual breakdowns of Allowed, Blocked, and Rate-Limited requests.
- **Infrastructure Health Matrix**: Real-time status, latency, CPU %, memory usage, and uptime for Core Engine, PostgreSQL, Redis, and Kafka.

### 6. Authentication, RBAC & Credential Governance
- **Role-Based Access Control**: `ADMIN`, `OPERATOR`, and `VIEWER` roles with strict route authorization.
- **First-Login Security Enforcement**: Mandatory password change upon initial login.
- **Password Policy Engine**: Enforces minimum length (8+ chars), mixed uppercase/lowercase, numeric digits, and special characters. Username requirements (3+ chars) enforced at registration and update.

---

## ⚡ Quick Start

### Prerequisites
- Linux OS (Ubuntu 22.04 / 24.04 LTS, Debian 12, CentOS / RHEL 9, Arch Linux)
- Docker 24.0+ and Docker Compose v2.20+
- `curl`, `git`

### 1. Clone & Configure
```bash
git clone https://github.com/emadam2006/Megalodon.git
cd Megalodon

# Initialize your environment configuration
cp .env.example .env
```

### 2. Launch the Platform
```bash
docker compose up -d --build
```

### 3. Verify Health
```bash
# Check container status
docker compose ps

# Check core health endpoint
curl http://localhost:8000/health
```

---

## 🌐 Network & Service Ports Map

| Service | Port | Description |
| :--- | :--- | :--- |
| **Megalodon Web Panel** | `3000` | Cyber-Defense UI & Native Observability Center |
| **Megalodon Core Engine** | `8000` | FastAPI Backend & Management API |
| **Demo Users Microservice** | `5001` | Sample upstream microservice for testing |
| **PostgreSQL 16** | `5432` | Relational storage for rules, users, and audit logs |
| **Redis 7** | `6379` | In-memory distributed rate limiter & cache |
| **Apache Kafka** | `9092` | Distributed event streaming bus (KRaft mode) |
| **Host Network Agent** | *Host Net* | Background host daemon inspecting `/proc/net` |

---

## 🔑 Access & Default Credentials

Upon first launching Megalodon, the database is seeded with a default administrator account:

* **Web UI URL**: [http://localhost:3000](http://localhost:3000)
* **Initial Username**: `admin`
* **Initial Password**: `admin123`

> [!IMPORTANT]
> **First-Login Policy**: On your first login with `admin:admin123`, Megalodon requires you to set a new password complying with the credential policy (minimum 8 characters, containing uppercase, lowercase, numbers, and symbols).

---

## 💻 Megalodon CLI

Megalodon includes a standalone command-line interface powered by Typer and Rich:

```bash
# Install the CLI locally
pip install -e ./cli

# Inspect platform health and latency metrics
megalodon health

# View host network interfaces
megalodon network interfaces

# List listening ports and correlated host processes
megalodon network ports

# Block a malicious IP address with quarantine reason
megalodon ip block 198.51.100.42 --reason "Brute-force scan"

# Inspect active firewall rules
megalodon rules list
```

---

## 📡 REST API Reference Summary

The Megalodon Core API provides programmatic control over platform features:

### Authentication & Users
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticate with credentials and receive JWT access/refresh tokens |
| `POST` | `/api/v1/auth/refresh` | Obtain a fresh access token using a valid refresh token |
| `POST` | `/api/v1/auth/change-password` | Update current user credentials (enforces password complexity) |
| `GET` | `/api/v1/users` | List platform users (Admin only) |
| `POST` | `/api/v1/users` | Create a new user with role assignment (Admin only) |

### Traffic & Built-in Observability
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Core system liveness and dependency status |
| `GET` | `/api/v1/system-stats` | Real-time host CPU %, memory usage (MB/percent), and system uptime |
| `GET` | `/api/v1/traffic/metrics` | Ingress throughput, $p_{50}/p_{95}/p_{99}$ latency, bandwidth, and HTTP status counts |
| `GET` | `/api/v1/traffic/live` | Stream of recent requests processed through the gateway |

### Host Network Visibility
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/network/interfaces` | List kernel network interfaces, MAC addresses, and IP assignments |
| `GET` | `/api/v1/network/ports` | List open listening sockets with PID and process name correlation |
| `GET` | `/api/v1/network/connections` | List active TCP/UDP connections with remote IP:port mapping |
| `POST` | `/api/v1/network/discovery` | Internal ingestion endpoint for the host discovery agent |

### Security & Firewall Configuration
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET/POST` | `/api/v1/routes` | Manage upstream gateway routes and prefix matching |
| `GET/POST` | `/api/v1/rate-limits` | Configure token bucket and sliding window rate limits per route |
| `GET/POST` | `/api/v1/ip-policies` | Manage IP whitelists, blacklists, and quarantine policies |
| `GET/POST` | `/api/v1/security-rules` | Create and evaluate condition-based firewall rules |
| `GET` | `/api/v1/security-events` | Query security alerts and trigger notifications |
| `GET` | `/api/v1/audit` | Query immutable audit log records |

---

## 🛠️ Configuration (.env)

Key environment settings configurable in `.env`:

```ini
# Environment
MEGALODON_ENV=production
LOG_LEVEL=INFO
DEBUG=false

# Security & Secrets
MEGALODON_SECRET_KEY=change_this_to_a_secure_random_32_byte_string
MEGALODON_JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Core API & Ingress
MEGALODON_API_PORT=8000
MEGALODON_TRUSTED_PROXIES=127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16

# Network Agent
NETWORK_DISCOVERY_INTERVAL=10
NETWORK_AGENT_TOKEN=megalodon_agent_secret_auth_token_for_internal_comms

# Database & Cache
DATABASE_URL=postgresql+asyncpg://megalodon:password@postgres:5432/megalodon
REDIS_URL=redis://redis:6379/0

# Event Bus
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
```

---

## 🧪 Testing & Verification

Run the test suite against the local development environment:

```bash
# 1. Run Python Unit & Integration Tests (15 tests covering Rate Limiting, Security Engine, IP Matching, Rules, Discovery)
PYTHONPATH=backend:network-agent pytest tests/ -v

# 2. Verify Frontend TypeScript Compilation & Build
cd frontend
npm run build
```

---

## 📄 License

Megalodon is released under the **Apache 2.0 License**. See [LICENSE](LICENSE) for full details.
