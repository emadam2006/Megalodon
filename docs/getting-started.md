# Getting Started with Megalodon

Welcome to Megalodon. This guide walks you through deploying Megalodon on a Linux server or development machine in under 2 minutes.

---

## Prerequisites

- **Linux Server / VPS** (Ubuntu 22.04 LTS, Debian 12, Rocky Linux, or Fedora recommended)
- **Docker Engine** (v24.0+)
- **Docker Compose** (v2.20+)
- **Git**

---

## 1. Quick Start (Production Docker Compose)

```bash
# 1. Clone repository
git clone https://github.com/megalodon/megalodon.git
cd megalodon

# 2. Configure environment variables
cp .env.example .env

# 3. Launch Megalodon platform
docker compose up -d
```

### Accessing Platform Endpoints:

| Service | Port / URL | Description | Default Credentials |
|---|---|---|---|
| **WebUI Dashboard** | `http://localhost:3000` | Modern React Cyber-Defense Dashboard | `admin` / `admin12345!` |
| **Megalodon Gateway** | `http://localhost:8080` | Traffic Proxy Ingress | — |
| **Megalodon API** | `http://localhost:8000` | Core REST API & Swagger UI (`/api/docs`) | — |
| **Prometheus** | `http://localhost:9090` | Time-series metrics scraper | — |
| **Grafana** | `http://localhost:3001` | Pre-provisioned telemetry dashboards | `admin` / `admin_megalodon_change_me` |

---

## 2. Using the Megalodon CLI

Install the `megalodon` CLI locally or execute inside the container:

```bash
# Check platform status and latency metrics
megalodon status

# Inspect host network interfaces
megalodon network interfaces

# Inspect listening TCP/UDP ports and host processes
megalodon network ports

# Block an abusive IP address immediately
megalodon ip block 198.51.100.42 --reason "Abusive scraper"

# List active security rules
megalodon rule list
```
