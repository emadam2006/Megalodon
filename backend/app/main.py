import asyncio
import json
import time
import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.api.v1.health import router as health_router
from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.database import get_session_maker, init_db
from app.core.kafka import TOPIC_ALERTS, TOPIC_REQUESTS, TOPIC_SECURITY_EVENTS, event_bus
from app.core.logging import logger
from app.core.redis import redis_pool
from app.core.telemetry import (
    MEGALODON_REQUESTS_BLOCKED_TOTAL,
    MEGALODON_REQUESTS_RATE_LIMITED_TOTAL,
)
from app.firewall.ip_filter import IPPolicyEvaluator
from app.firewall.waf import WAFEngine
from app.gateway.client_ip import client_ip_detector
from app.gateway.pipeline import gateway_pipeline
from app.gateway.proxy import proxy_engine
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.models.security import IPPolicy, SecurityEvent
from app.repositories.security_repo import security_repo
from app.schemas.analytics import RequestLogEntry
from app.services.alert_service import alert_service
from app.services.analytics_service import analytics_service
from app.services.auth_service import auth_service
from app.websocket.manager import ws_manager
from app.workers.alert_worker import alert_worker
from app.workers.analytics_worker import analytics_worker
from app.workers.network_worker import network_worker
from app.workers.security_worker import security_worker


def _record_and_broadcast(payload: dict):
    """Record request in memory analytics buffer and broadcast via WebSocket."""
    try:
        ts = payload.get("timestamp")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except Exception:
                ts = datetime.now(timezone.utc)
        elif not isinstance(ts, datetime):
            ts = datetime.now(timezone.utc)

        entry = RequestLogEntry(
            timestamp=ts,
            request_id=payload.get("request_id", ""),
            client_ip=payload.get("client_ip", "127.0.0.1"),
            interface=payload.get("interface", "eth0"),
            destination_ip=payload.get("destination_ip", "0.0.0.0"),
            destination_port=payload.get("destination_port", 8000),
            method=payload.get("method", "GET"),
            path=payload.get("path", "/"),
            status_code=payload.get("status_code", 200),
            response_time_ms=payload.get("response_time_ms", 1.0),
            request_size_bytes=payload.get("request_size_bytes", 0),
            response_size_bytes=payload.get("response_size_bytes", 0),
            rate_limited=payload.get("rate_limited", False),
            blocked=payload.get("blocked", False),
            action_taken=payload.get("action_taken", "PASSED"),
        )
        analytics_service.record_request(entry)
    except Exception as err:
        logger.debug(f"Error recording request to analytics: {err}")

    asyncio.ensure_future(ws_manager.broadcast_json("LIVE_REQUEST", payload))


# ── Active IP Policy Cache ───────────────────────────────────────────────────
async def _get_active_policies():
    return await IPPolicyEvaluator.get_active_policies(get_session_maker())


# ── In-Memory / Redis Sliding Rate Limiter for DoS Detection ─────────────────
_mem_rate_limits: dict[str, list[float]] = {}
_dos_alert_cooldown: dict[str, float] = {}


def _check_dos_rate(client_ip: str) -> tuple[int, bool, bool]:
    """
    Returns (request_count_10s, is_rate_limited, is_dos_attack).
    Thresholds:
      > 30 req / 10s: rate-limited (HTTP 429)
      > 40 req / 10s: DoS attack (triggers critical red alert & auto-block)
    """
    now = time.time()
    times = _mem_rate_limits.setdefault(client_ip, [])
    # Keep only timestamps in last 10 seconds
    times = [t for t in times if now - t < 10.0]
    times.append(now)
    _mem_rate_limits[client_ip] = times

    count = len(times)
    is_rate_limited = count > 30
    is_dos = count > 40
    return count, is_rate_limited, is_dos


# ── Live Traffic & Security Enforcement Middleware ───────────────────────────
class LiveTrafficMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip WebSocket upgrades and preflight
        if request.method == "OPTIONS" or request.url.path.startswith("/ws"):
            return await call_next(request)

        start = time.time()
        request_id = f"req_{uuid.uuid4().hex[:12]}"
        client_ip = client_ip_detector.get_client_ip(request)
        path = request.url.path
        method = request.method

        # Check if management endpoint that should never lock out administrators
        is_management_path = (
            path.startswith("/api/v1/auth")
            or path.startswith("/api/v1/ip-policies")
            or path.startswith("/api/v1/users/me")
        )
        is_health_probe = (
            path.startswith("/api/v1/health")
            or path.startswith("/health")
            or path == "/metrics"
        )

        # 1. IP Policy Enforcement (ALLOW / BLOCK / TEMPORARY_BLOCK)
        if not is_management_path:
            policies = await _get_active_policies()
            ip_decision, ip_reason = IPPolicyEvaluator.evaluate_policies(client_ip, policies)

            if ip_decision == "BLOCK":
                MEGALODON_REQUESTS_BLOCKED_TOTAL.labels(reason="ip_policy", client_ip=client_ip).inc()
                duration_ms = round((time.time() - start) * 1000.0, 2)
                block_content = json.dumps({
                    "error": "Forbidden - Access blocked by Megalodon IP Policy",
                    "reason": ip_reason or "IP address is blacklisted by administrator policy",
                    "client_ip": client_ip,
                }).encode("utf-8")

                payload = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "request_id": request_id,
                    "client_ip": client_ip,
                    "interface": "eth0",
                    "destination_ip": "0.0.0.0",
                    "destination_port": 8000,
                    "method": method,
                    "path": path,
                    "status_code": 403,
                    "response_time_ms": duration_ms,
                    "request_size_bytes": int(request.headers.get("content-length", 0) or 0),
                    "response_size_bytes": len(block_content),
                    "backend_service": None,
                    "rate_limited": False,
                    "blocked": True,
                    "action_taken": "BLOCKED",
                }
                _record_and_broadcast(payload)

                return Response(
                    content=block_content,
                    status_code=403,
                    media_type="application/json",
                    headers={"X-Megalodon-Blocked": "ip_policy", "X-Megalodon-Request-ID": request_id},
                )

        # 1.5 Automated Threat Defense & WAF Deep Packet Inspection
        # Detects Path Traversal, XSS, SQLi, Command Injection, XXE, SSRF, and Oversized Payloads
        if not is_health_probe and client_ip not in ("127.0.0.1", "::1"):
            query_str = str(request.url.query)
            content_length = int(request.headers.get("content-length", 0) or 0)

            body_bytes = b""
            # Skip body inspection on auth login to allow complex passwords with special characters
            if method in ("POST", "PUT", "PATCH") and 0 < content_length < 262144:
                if not path.startswith("/api/v1/auth/login"):
                    try:
                        body_bytes = await request.body()
                    except Exception:
                        body_bytes = b""

            is_threat, attack_type, match_detail = WAFEngine.inspect(
                path=path,
                query_string=query_str,
                body_bytes=body_bytes,
                content_length=content_length,
            )

            if is_threat:
                MEGALODON_REQUESTS_BLOCKED_TOTAL.labels(reason=f"waf_{attack_type.lower()}", client_ip=client_ip).inc()
                duration_ms = round((time.time() - start) * 1000.0, 2)
                block_content = json.dumps({
                    "error": "Forbidden - Megalodon Automated Threat Defense",
                    "reason": f"Malicious {attack_type} detected: {match_detail}. Source IP {client_ip} has been automatically blocked.",
                    "client_ip": client_ip,
                    "attack_type": attack_type,
                    "action": "AUTO_BLOCKED",
                }).encode("utf-8")

                # Asynchronously auto-block the IP, create Critical Alert, and log Security Event
                async def _quarantine_malicious_ip(ip: str, atk: str, detail: str, req_path: str, req_method: str):
                    try:
                        session_maker = get_session_maker()
                        async with session_maker() as db:
                            # 1. Auto-block source IP permanently
                            pol = IPPolicy(
                                ip_or_cidr=ip,
                                action="BLOCK",
                                reason=f"Auto-blocked by Megalodon WAF: {atk} detected ('{detail}')",
                                created_by="megalodon-waf-guard",
                            )
                            await security_repo.ip_policy_repo.create(db, pol)
                            IPPolicyEvaluator.invalidate_cache()

                            # 2. Trigger CRITICAL platform alert
                            await alert_service.create_alert(
                                db=db,
                                title=f"WAF Intrusion Detected & IP Auto-Blocked: {ip}",
                                description=(
                                    f"Megalodon WAF detected a malicious {atk} from {ip} "
                                    f"targeting {req_path}. Matched signature: '{detail}'. "
                                    f"Source IP has been automatically blacklisted and isolated."
                                ),
                                severity="CRITICAL",
                                source="megalodon-waf-guard",
                                metadata={
                                    "client_ip": ip,
                                    "attack_type": atk,
                                    "signature": detail,
                                    "path": req_path,
                                    "method": req_method,
                                    "action": "AUTO_BLOCKED",
                                },
                            )

                            # 3. Security Event log
                            sec_ev = SecurityEvent(
                                event_type="WAF_BLOCK",
                                severity="CRITICAL",
                                client_ip=ip,
                                request_path=req_path,
                                method=req_method,
                                details_json=json.dumps({
                                    "attack_type": atk,
                                    "signature": detail,
                                    "action": "AUTO_BLOCKED",
                                }),
                            )
                            db.add(sec_ev)
                            await db.commit()

                            await event_bus.publish(TOPIC_SECURITY_EVENTS, {
                                "event_type": "WAF_BLOCK",
                                "attack_type": atk,
                                "client_ip": ip,
                                "path": req_path,
                                "signature": detail,
                            })
                    except Exception as err:
                        logger.error(f"Error auto-quarantining {ip}: {err}")

                asyncio.ensure_future(_quarantine_malicious_ip(client_ip, attack_type, match_detail, path, method))

                payload = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "request_id": request_id,
                    "client_ip": client_ip,
                    "interface": "eth0",
                    "destination_ip": "0.0.0.0",
                    "destination_port": 8000,
                    "method": method,
                    "path": path,
                    "status_code": 403,
                    "response_time_ms": duration_ms,
                    "request_size_bytes": content_length,
                    "response_size_bytes": len(block_content),
                    "backend_service": None,
                    "rate_limited": False,
                    "blocked": True,
                    "action_taken": "AUTO_BLOCKED",
                }
                _record_and_broadcast(payload)

                return Response(
                    content=block_content,
                    status_code=403,
                    media_type="application/json",
                    headers={
                        "X-Megalodon-Blocked": "waf_guard",
                        "X-Megalodon-Threat": attack_type,
                        "X-Megalodon-Request-ID": request_id,
                    },
                )

        # 2. Rate Limiting & DoS Attack Detection
        # Skip health checks and management routes to prevent operator lockout and false container failures
        if not is_health_probe and not is_management_path:
            count, is_rate_limited, is_dos = _check_dos_rate(client_ip)

            if is_dos:
                now_t = time.time()
                last_alert_time = _dos_alert_cooldown.get(client_ip, 0)
                # Alert once every 20 seconds per attacker IP
                if now_t - last_alert_time > 20.0:
                    _dos_alert_cooldown[client_ip] = now_t

                    async def _trigger_dos_alert():
                        try:
                            session_maker = get_session_maker()
                            async with session_maker() as db:
                                await alert_service.create_alert(
                                    db=db,
                                    title=f"DoS Attack Detected: {client_ip}",
                                    description=(
                                        f"High-frequency request flood detected from IP {client_ip} "
                                        f"({count} requests in 10s window against {path}). "
                                        f"Rate-limiting and auto-mitigation active."
                                    ),
                                    severity="CRITICAL",
                                    source="megalodon-dos-guard",
                                    metadata={
                                        "client_ip": client_ip,
                                        "request_rate": count,
                                        "target_path": path,
                                        "method": method,
                                        "attack_type": "DOS_FLOOD",
                                    },
                                )
                                # Auto-escalate to BLOCK policy immediately on DoS attack (skip local docker bridge)
                                if client_ip not in ("127.0.0.1", "::1", "localhost", "172.20.0.1"):
                                    existing = await security_repo.ip_policy_repo.get_by_field(db, "ip_or_cidr", client_ip)
                                    if not existing:
                                        auto_pol = IPPolicy(
                                            ip_or_cidr=client_ip,
                                            action="BLOCK",
                                            reason=f"Auto-quarantined: Active DoS attack ({count} req/10s)",
                                            created_by="megalodon-dos-guard",
                                        )
                                        await security_repo.ip_policy_repo.create(db, auto_pol)
                                        IPPolicyEvaluator.invalidate_cache()
                                    elif existing.action != "BLOCK":
                                        existing.action = "BLOCK"
                                        existing.reason = f"Auto-quarantined: Active DoS attack ({count} req/10s)"
                                        await db.commit()
                                        IPPolicyEvaluator.invalidate_cache()
                        except Exception as err:
                            logger.error(f"Error recording DoS alert: {err}")

                    asyncio.ensure_future(_trigger_dos_alert())

            if is_rate_limited:
                MEGALODON_REQUESTS_RATE_LIMITED_TOTAL.labels(policy="dos_guard", identifier=client_ip).inc()
                duration_ms = round((time.time() - start) * 1000.0, 2)
                rl_content = json.dumps({
                    "error": "Too Many Requests",
                    "message": f"Rate limit exceeded for IP {client_ip}. Please slow down.",
                    "retry_after": 10,
                }).encode("utf-8")

                payload = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "request_id": request_id,
                    "client_ip": client_ip,
                    "interface": "eth0",
                    "destination_ip": "0.0.0.0",
                    "destination_port": 8000,
                    "method": method,
                    "path": path,
                    "status_code": 429,
                    "response_time_ms": duration_ms,
                    "request_size_bytes": int(request.headers.get("content-length", 0) or 0),
                    "response_size_bytes": len(rl_content),
                    "backend_service": None,
                    "rate_limited": True,
                    "blocked": False,
                    "action_taken": "RATE_LIMITED",
                }
                _record_and_broadcast(payload)

                return Response(
                    content=rl_content,
                    status_code=429,
                    media_type="application/json",
                    headers={"Retry-After": "10", "X-Megalodon-Rate-Limited": "true", "X-Megalodon-Request-ID": request_id},
                )

        # 3. Process normal request
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000.0, 2)

        # Broadcast live request event and record in analytics
        try:
            payload = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "request_id": request_id,
                "client_ip": client_ip,
                "interface": "eth0",
                "destination_ip": "0.0.0.0",
                "destination_port": 8000,
                "method": method,
                "path": path,
                "status_code": response.status_code,
                "response_time_ms": duration_ms,
                "request_size_bytes": int(request.headers.get("content-length", 0) or 0),
                "response_size_bytes": 0,
                "backend_service": None,
                "rate_limited": False,
                "blocked": response.status_code in (403, 429),
                "action_taken": "BLOCKED" if response.status_code == 403 else (
                    "RATE_LIMITED" if response.status_code == 429 else "PASSED"
                ),
            }
            _record_and_broadcast(payload)
        except Exception:
            pass

        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Megalodon Platform...")
    # Initialize Database Schema
    await init_db()

    # Seed Admin User & Default Roles
    session_maker = get_session_maker()
    async with session_maker() as db:
        await auth_service.seed_initial_admin(db)

    # Initialize Event Bus & Workers
    await event_bus.start()
    await analytics_worker.start()
    await security_worker.start()
    await alert_worker.start()
    await network_worker.start()

    logger.info("Megalodon Platform is ONLINE and ready.")
    yield

    logger.info("Shutting down Megalodon Platform...")
    await analytics_worker.stop()
    await security_worker.stop()
    await alert_worker.stop()
    await network_worker.stop()
    await event_bus.stop()
    await proxy_engine.close()
    await redis_pool.close()
    logger.info("Megalodon shutdown complete.")


app = FastAPI(
    title="Megalodon",
    description="Self-Hosted API Security, Traffic Management & Network Visibility Platform",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)

# ── Security Headers Middleware (OWASP A05) ──────────────────────────────────
# Must be added BEFORE CORSMiddleware so headers appear on all responses
# including CORS pre-flight responses.
app.add_middleware(SecurityHeadersMiddleware)

# ── CORS Middleware (hardened — restrict to configured origins) ────────────────
# A01/A05: do NOT use allow_origins=["*"] in production.
# Allow only configured frontend origin(s).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key", "X-Requested-With"],
    expose_headers=["X-Request-ID"],
    max_age=600,
)

# ── Live Traffic Capture Middleware ──────────────────────────────────────────
# Must be added AFTER CORS so it only sees resolved real requests.
app.add_middleware(LiveTrafficMiddleware)

# ── Global Exception Handler (OWASP A05 - Prevent Stack Trace Leaks) ─────────
@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    req_id = request.headers.get("x-request-id", f"req_{uuid.uuid4().hex[:12]}")
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path} (ID: {req_id}): {exc}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Request logged for security review.",
            "request_id": req_id,
        },
        headers={"X-Request-ID": req_id},
    )

# Include Core API v1 and Root Health/Observability routes
app.include_router(health_router)
app.include_router(api_v1_router)


# WebSocket endpoint for real-time traffic and network state streaming
@app.websocket("/ws")
@app.websocket("/ws/live-traffic")
async def websocket_traffic_feed(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep socket alive and receive client pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"WebSocket connection closed: {e}")
        await ws_manager.disconnect(websocket)


# Catch-all gateway proxy handler for traffic routing
# Any path not handled by /api/ or /ws is evaluated by the Megalodon Gateway Pipeline
@app.api_route(
    "/proxy/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
)
async def gateway_proxy_route(request: Request, path: str):
    return await gateway_pipeline.process_request(request)
