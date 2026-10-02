# Megalodon Architecture & System Design

Megalodon is an open-source, production-grade self-hosted API security, traffic management, and network visibility platform engineered to be deployed directly on a user's Linux server or VPS.

---

## 1. High-Level Architecture

```mermaid
flowchart TD
    subgraph Host["Linux Host / VPS"]
        subgraph Discovery["Host Network Discovery (Mode B)"]
            Agent["megalodon-network-agent"]
            Kernel["/proc/net, sockets, interfaces"]
            Agent -->|safe read| Kernel
        end

        subgraph Ingress["Traffic Gateway (Mode A)"]
            Client["External HTTP/API Clients"]
            GW["Megalodon Gateway (:8080)"]
            Client -->|Request| GW
        end

        subgraph Core["Megalodon Core Platform"]
            API["Megalodon API (:8000)"]
            UI["React Dashboard (:3000)"]
            Workers["Async Workers\n(Analytics, Security, Alert, Network)"]
        end

        subgraph Storage["Data & Event Layer"]
            PG[("PostgreSQL 16")]
            Redis[("Redis 7 (Rate Limiter / Cache)")]
            Kafka[("Apache Kafka (Event Bus)")]
        end

        subgraph Observability["Observability"]
            Prom["Prometheus (:9090)"]
            Graf["Grafana (:3001)"]
        end
    end

    Agent -->|POST /api/v1/network/discovery| API
    GW -->|Validate Policies & Rules| Redis
    GW -->|Publish Request Events| Kafka
    GW -->|Forward Upstream| Backends["Target Microservices"]

    API --> PG
    API --> Redis
    API --> Kafka

    Workers --> Kafka
    Workers --> PG
    Workers --> Redis

    UI -->|REST /api/v1| API
    UI -->|WebSocket /ws| API

    Prom -->|Scrape /metrics| API
    Prom -->|Scrape /metrics| GW
    Graf -->|Query| Prom
```

---

## 2. Request Pipeline

Every HTTP request handled by the Megalodon Gateway traverses a 10-step zero-trust pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor Client as External Client
    participant GW as Megalodon Gateway
    participant Redis as Redis Cache
    participant Engine as Security Rule Engine
    participant Proxy as Reverse Proxy Engine
    participant Backend as Upstream Service
    participant Bus as Kafka / WebSocket

    Client->>GW: HTTP Request
    GW->>GW: 1. Assign Unique Request ID
    GW->>GW: 2. Resolve Client IP (Trusted Proxy Aware)
    GW->>Redis: 3. Check IP Policy & Cache
    alt IP is Blocked
        GW-->>Client: 403 Forbidden
    else IP is Allowed
        GW->>Engine: 4. Evaluate Security Rules (Chained Conditions)
        alt Rule Triggered (Action: Block)
            GW-->>Client: 403 / Custom Status
        else Rule Passed
            GW->>Redis: 5. Check Distributed Rate Limit (Sliding Window)
            alt Rate Limit Exceeded
                GW-->>Client: 429 Too Many Requests (Retry-After)
            else Rate Limit OK
                GW->>GW: 6. Match Route Prefix
                GW->>Proxy: 7. Validate SSRF & Link-Local Filter
                Proxy->>Backend: 8. Forward Upstream Request
                Backend-->>Proxy: 9. Upstream Response
                Proxy-->>GW: Return Content & Headers
                GW->>Bus: 10. Emit Request Telemetry & Metrics
                GW-->>Client: HTTP Response (X-Megalodon-Request-ID)
            end
        end
    end
```

---

## 3. Host Network Discovery Architecture

```mermaid
flowchart LR
    subgraph HostKernel["Linux Kernel & Subsystems"]
        ProcNet["/proc/net (tcp, udp, route)"]
        ProcPid["/proc/<pid>"]
        Interfaces["Kernel Interfaces (eth0, docker0)"]
    end

    subgraph Agent["Megalodon Network Agent"]
        Collector["HostNetworkDiscoverer"]
        IfaceColl["InterfaceCollector"]
        SocketColl["SocketCollector"]
        ConnColl["ConnectionCollector"]
        ProcCorr["ProcessCorrelator"]

        Collector --> IfaceColl
        Collector --> SocketColl
        Collector --> ConnColl
        Collector --> ProcCorr
    end

    IfaceColl --> Interfaces
    SocketColl --> ProcNet
    ProcCorr --> ProcPid

    Agent -->|Continuous Loop (10s)| API["Megalodon API: /network/discovery"]
    API -->|Diff State| EventGen["Change Detection\n(PORT_OPENED, IFACE_ADDED)"]
    EventGen --> WS["WebSocket Dashboard Broadcast"]
```
