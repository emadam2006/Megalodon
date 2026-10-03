# Megalodon Production Deployment Guide

Megalodon is an enterprise-grade, high-throughput API Security Gateway, Web Application Firewall (WAF), and Real-time Network Visibility Platform.

---

## Architecture & Services

The Megalodon production stack runs 9 core containers orchestrated via Docker Compose:

| Service | Container Name | Description | Port / Exposure |
|---|---|---|---|
| **Frontend WebUI** | `megalodon-frontend` | React + Vite UI served via hardened Nginx | `3000:80` |
| **Core API Gateway** | `megalodon-api` | Asynchronous FastAPI gateway, WAF engine, proxy pipeline | `8000:8000` |
| **Network Discovery** | `megalodon-network-agent` | Host-level socket, interface, and port inspector | Host network |
| **Event Streaming** | `megalodon-kafka` | Apache Kafka (KRaft mode, no Zookeeper required) | `9092:9092` |
| **Cache & Throttling** | `megalodon-redis` | Redis 7 distributed sliding-window & token-bucket cache | `6379:6379` |
| **Relational Database**| `megalodon-postgres` | PostgreSQL 16 ACID storage (users, rules, audit, policies) | `5432:5432` |
| **Analytics Worker** | `megalodon-analytics-worker`| Kafka consumer computing live metrics & window aggregations| Internal |
| **Security Worker** | `megalodon-security-worker` | Kafka consumer analyzing threat patterns & auto-quarantine | Internal |
| **Alert Worker** | `megalodon-alert-worker` | Kafka consumer dispatching security incident notifications | Internal |

---

## 1. Quickstart Deployment

### Prerequisites
- Docker Engine `>= 24.0.0`
- Docker Compose v2 (`docker compose`)
- Minimum System Resources:
  - 2 CPU Cores
  - 4 GB RAM (8 GB recommended for high RPS)
  - 20 GB Disk Space

### Step 1: Extract the Production Archive
```bash
tar -xf megalodon-production.tar
cd megalodon-production
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` and configure your secure production keys:
```bash
cp .env.example .env
```

Generate secure cryptographic keys for production:
```bash
# Generate 32-character random keys
openssl rand -hex 32
```
Update the following values in `.env`:
- `MEGALODON_SECRET_KEY`: Set to your newly generated 32+ character random string.
- `POSTGRES_PASSWORD`: Set to a strong database password.
- `NETWORK_AGENT_TOKEN`: Set to a strong internal authentication token.
- `DATABASE_URL`: Ensure the password matches `POSTGRES_PASSWORD`.

### Step 3: Launch Production Services
Start the entire stack in detached mode:
```bash
make up
# or:
docker compose up -d --build
```

Alembic database migrations execute automatically on startup before the API begins accepting traffic.

### Step 4: Verify Deployment Health
Check service health and status:
```bash
make status
# or:
docker compose ps
```

Verify the API health endpoint:
```bash
curl -f http://localhost:8000/health
# Response: {"status":"healthy",...}
```

---

## 2. Web Console & Initial Login

Access the Web Console at:
```
http://<YOUR_SERVER_IP>:3000
```

- **Default Administrator Username**: `admin`
- **Default Administrator Password**: `admin123`

> [!IMPORTANT]
> Upon your initial login, the system will prompt you to replace the default credentials immediately before proceeding.

---

## 3. Connecting Real Upstream Services

Megalodon routes traffic to your real backend microservices and applies rate limits, WAF inspection, and IP policies:

1. Navigate to **Infrastructure -> Backends** in the UI (or use the API).
2. Click **Create Backend**:
   - **Name**: `billing-service`
   - **Target URL**: `http://10.0.0.15:8080` (or `https://api.yourdomain.internal`)
   - **Weight**: `1`
3. Navigate to **Infrastructure -> Routes**:
   - Create a route mapping a path prefix (e.g., `/api/billing/*`) to your backend.
4. Megalodon will now inspect, rate limit, proxy, and protect all traffic routed through `http://<MEGALODON_IP>:8000/api/billing/*`.

---

## 4. Production Hardening Checklist

1. **TLS / SSL Termination**:
   - In production, place Megalodon behind an edge reverse proxy (Cloudflare, Nginx, Caddy, or AWS ALB) with SSL/TLS certificates configured on port 443.
   - Point your edge proxy to `http://127.0.0.1:3000` (Web UI) and `http://127.0.0.1:8000` (API Gateway & Ingress).

2. **Firewall Ingress**:
   - Restrict port `5432` (PostgreSQL), `6379` (Redis), and `9092` (Kafka) so they are **not** exposed to the public internet. Use internal Docker network bridges or bind them to `127.0.0.1`.

3. **Persistent Volume Backups**:
   - Megalodon stores persistent data in Docker named volumes:
     - `postgres_data`: Database schema, policies, rules, alerts, audit logs.
     - `redis_data`: Cache snapshots and sliding-window rate counters.
     - `kafka_data`: Event log persistence.
   - Back up PostgreSQL regularly using `pg_dump`:
     ```bash
     docker compose exec postgres pg_dump -U megalodon megalodon > megalodon_backup_$(date +%F).sql
     ```

---

## 5. Operations & Maintenance

| Action | Command |
|---|---|
| View All Logs | `make logs` or `docker compose logs -f` |
| View Gateway Logs | `docker compose logs -f megalodon-api` |
| Restart Services | `make restart` or `docker compose restart` |
| Stop Stack | `make down` or `docker compose down` |
| CLI Administration | `docker compose exec megalodon-api python -m megalodon_cli.main --help` |
| Database Migration | `docker compose exec megalodon-api alembic upgrade head` |
