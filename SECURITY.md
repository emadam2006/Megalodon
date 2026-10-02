# Security Policy and Architecture Guardrails

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Megalodon very seriously. If you believe you have found a security vulnerability in Megalodon, please report it to our security team via private disclosure at `security@megalodon.local` (or via GitHub Private Vulnerability Reporting).

Please do **NOT** report security vulnerabilities via public GitHub issues.

Include the following details in your report:
- Type of vulnerability (e.g., SSRF, bypass, injection)
- Step-by-step proof of concept or reproduction steps
- Affected components (Gateway, API, Network Agent, etc.)
- Impact assessment and suggested mitigations

We will acknowledge receipt within 48 hours and provide status updates as we validate and remediate.

---

## Security Architecture & Boundaries

### 1. Host Discovery vs. Packet Inspection
- **Network Discovery Agent**: Inspects Linux kernel structures (`/proc/net`, `/proc/<pid>`, netlink, and socket tables via safe APIs). It provides socket states, listening ports, network interfaces, and process names.
- **Discovery Is Not Deep Packet Inspection**: Observing listening sockets and active connections does not decrypt or reveal TLS payloads.
- **HTTPS & TLS Boundary**: Encrypted packets (`:443`) cannot reveal request paths, query parameters, headers, or payloads unless TLS is explicitly terminated at Megalodon Gateway or proxied through Megalodon.

### 2. SSRF Protection on Reverse Proxy
Megalodon forwards requests to configured backend upstream services. To prevent Server-Side Request Forgery (SSRF):
- Default blocklist includes cloud metadata IPs (e.g., `169.254.169.254`, IPv6 link-local addresses).
- Loopback destinations (`127.0.0.1`, `::1`) are restricted unless explicitly marked as a trusted internal backend in administrative configuration.
- Proxy URL validation verifies target host, protocol (HTTP/HTTPS only), and port.

### 3. Client IP Identification & Proxy Headers
- Client IP resolution never blindly trusts headers like `X-Forwarded-For` or `X-Real-IP`.
- Headers are evaluated only when the direct socket connection originates from a configured and validated `MEGALODON_TRUSTED_PROXIES` CIDR.

### 4. Privilege Minimization
- The main Megalodon API, Gateway, and Workers run as unprivileged non-root users (`megalodon`, UID 10001).
- The `megalodon-network-agent` only requests minimal host network visibility (`network_mode: "host"` or read-only `/proc` mounts where socket metrics are required), and never runs arbitrary administrative commands on the host.

### 5. Secret Storage and Sanitization
- Passwords are hashed using **Argon2id** with salt.
- API keys are hashed with **SHA-256**; raw keys are generated cryptographically and shown only once upon creation.
- Request analytics and logs **never** capture or store authorization headers, passwords, session tokens, or sensitive payload bodies.
