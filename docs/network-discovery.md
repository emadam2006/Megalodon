# Network Discovery & Host Visibility Guide

Megalodon features a dedicated **Megalodon Network Discovery Agent** (`megalodon-network-agent`) designed to inspect the Linux host environment and provide deep visibility into socket tables, listening ports, interfaces, and active connections.

---

## 1. Network Visibility Modes

Megalodon defines two distinct and clearly separated visibility modes:

### Mode A — Gateway Traffic Visibility
- **Path**: Traffic explicitly traverses Megalodon Gateway (`:8080`).
- **Inspected Attributes**:
  - Client IP (trusted proxy aware)
  - HTTP method & full URI path
  - Query parameters & request size
  - Upstream response status code & duration
  - Enforcement of Rate Limits, IP Blocklists, and Security Rules.
- **TLS Consideration**: Full HTTP payload and path visibility requires TLS to terminate at Megalodon or before Megalodon.

### Mode B — Host Network Visibility
- **Path**: Megalodon observes the Linux host's networking subsystem.
- **Inspected Attributes**:
  - Network interfaces (`eth0`, `docker0`, `wg0`, `lo`)
  - MAC addresses & MTU
  - Assigned IPv4 and IPv6 subnets
  - Listening TCP and UDP sockets
  - Active network connections (Source, Destination, State)
  - Correlated host processes (PID, Process Name, Command line)
- **Important Security & Encryption Boundary**:
  - **Host discovery != packet capture.**
  - Encrypted packets on port 443 **cannot** reveal HTTP paths, headers, or request bodies without TLS termination. Megalodon does not claim to inspect encrypted TLS payloads passively.

---

## 2. Docker Networking & Privilege Boundaries

By default, Docker isolates containers inside private network namespaces. To inspect the actual host machine:
1. `megalodon-network-agent` runs with `network_mode: "host"`.
2. The agent communicates with the Megalodon API via an authenticated internal bearer token (`NETWORK_AGENT_TOKEN`).
3. The core API and Gateway **never** run with host network privileges or root access; they execute as unprivileged user `megalodon` (UID 10001).

---

## 3. Continuous Discovery & Change Detection

The agent runs a periodic loop configured by `NETWORK_DISCOVERY_INTERVAL=10`. When changes are observed, events are published:
- `NETWORK_INTERFACE_ADDED` / `NETWORK_INTERFACE_REMOVED`
- `IP_ADDRESS_ADDED` / `IP_ADDRESS_REMOVED`
- `PORT_OPENED` / `PORT_CLOSED`
- `SERVICE_CHANGED`
