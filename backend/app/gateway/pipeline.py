import json
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from starlette.requests import Request
from starlette.responses import Response

from app.core.database import get_session_maker
from app.core.kafka import TOPIC_REQUESTS, TOPIC_SECURITY_EVENTS, event_bus
from app.core.telemetry import (
    MEGALODON_REQUEST_DURATION_SECONDS,
    MEGALODON_REQUESTS_BLOCKED_TOTAL,
    MEGALODON_REQUESTS_RATE_LIMITED_TOTAL,
    MEGALODON_REQUESTS_TOTAL,
    MEGALODON_SECURITY_EVENTS_TOTAL,
)
from app.firewall.ip_filter import IPPolicyEvaluator
from app.gateway.client_ip import client_ip_detector
from app.gateway.proxy import proxy_engine
from app.models.security import SecurityEvent
from app.ratelimit.limiter import DistributedRateLimiter
from app.repositories.gateway_repo import gateway_repo
from app.repositories.security_repo import security_repo
from app.rules.engine import RuleEngine
from app.schemas.analytics import RequestLogEntry
from app.services.analytics_service import analytics_service
from app.services.auth_service import auth_service
from app.websocket.manager import ws_manager


class GatewayPipeline:
    async def process_request(self, request: Request) -> Response:
        start_time = time.time()
        request_id = f"req_{uuid.uuid4().hex[:12]}"
        client_ip = client_ip_detector.get_client_ip(request)
        method = request.method.upper()
        path = request.url.path
        query_string = request.url.query
        headers = dict(request.headers)
        body = await request.body()
        request_size = len(body)
        dest_port = request.url.port or 8080
        interface = "eth0"

        session_maker = get_session_maker()
        async with session_maker() as db:
            # 1. IP Policy Evaluation
            active_ip_policies = await security_repo.list_active_ip_policies(db)
            ip_decision, ip_reason = IPPolicyEvaluator.evaluate_policies(
                client_ip=client_ip,
                policies=[
                    {
                        "ip_or_cidr": p.ip_or_cidr,
                        "action": p.action,
                        "expires_at": p.expires_at,
                        "reason": p.reason,
                    }
                    for p in active_ip_policies
                ]
            )

            if ip_decision == "BLOCK":
                MEGALODON_REQUESTS_BLOCKED_TOTAL.labels(reason="ip_policy", client_ip=client_ip).inc()
                return await self._finalize_response(
                    status_code=403,
                    headers={"content-type": "application/json"},
                    content=json.dumps({"error": "Forbidden - Access blocked by Megalodon IP Policy", "reason": ip_reason}).encode("utf-8"),
                    request_id=request_id,
                    client_ip=client_ip,
                    method=method,
                    path=path,
                    dest_port=dest_port,
                    interface=interface,
                    request_size=request_size,
                    start_time=start_time,
                    blocked=True,
                    rate_limited=False,
                    action_taken="BLOCKED",
                )

            # 2. Match Route & Target Backend
            route = await gateway_repo.find_matching_route(db, path, method)
            backend_service_name = route.backend_service.name if route and route.backend_service else "megalodon_direct"

            # 3. Route Authentication (if required)
            user_authenticated = False
            username = "anonymous"
            if route and route.auth_required:
                auth_header = headers.get("authorization")
                api_key_header = headers.get("x-api-key")
                if api_key_header:
                    api_key_obj = await auth_service.validate_api_key(db, api_key_header)
                    if not api_key_obj:
                        return await self._finalize_response(
                            status_code=401,
                            headers={"content-type": "application/json"},
                            content=b'{"error": "Unauthorized: Invalid or expired API Key"}',
                            request_id=request_id,
                            client_ip=client_ip,
                            method=method,
                            path=path,
                            dest_port=dest_port,
                            interface=interface,
                            request_size=request_size,
                            start_time=start_time,
                            blocked=True,
                            rate_limited=False,
                            action_taken="UNAUTHORIZED",
                        )
                    user_authenticated = True
                    username = f"apikey:{api_key_obj.key_prefix}"
                elif auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
                    from app.core.security import decode_token
                    payload = decode_token(token)
                    if not payload:
                        return await self._finalize_response(
                            status_code=401,
                            headers={"content-type": "application/json"},
                            content=b'{"error": "Unauthorized: Invalid JWT token"}',
                            request_id=request_id,
                            client_ip=client_ip,
                            method=method,
                            path=path,
                            dest_port=dest_port,
                            interface=interface,
                            request_size=request_size,
                            start_time=start_time,
                            blocked=True,
                            rate_limited=False,
                            action_taken="UNAUTHORIZED",
                        )
                    user_authenticated = True
                    username = payload.get("sub", "authenticated_user")
                else:
                    return await self._finalize_response(
                        status_code=401,
                        headers={"content-type": "application/json"},
                        content=b'{"error": "Unauthorized: Route requires Authentication token or API Key"}',
                        request_id=request_id,
                        client_ip=client_ip,
                        method=method,
                        path=path,
                        dest_port=dest_port,
                        interface=interface,
                        request_size=request_size,
                        start_time=start_time,
                        blocked=True,
                        rate_limited=False,
                        action_taken="UNAUTHORIZED",
                    )

            # 4. Security Rule Engine Evaluation
            security_rules = await security_repo.list_security_rules(db)
            rule_context = {
                "client_ip": client_ip,
                "method": method,
                "path": path,
                "route_name": route.name if route else "unknown",
                "headers": headers,
                "query_params": dict(request.query_params),
                "interface": interface,
                "destination_port": dest_port,
                "backend_service": backend_service_name,
                "username": username,
            }
            rule_eval = RuleEngine.evaluate_all(
                rules=[
                    {
                        "id": r.id,
                        "name": r.name,
                        "priority": r.priority,
                        "conditions": r.conditions_json,
                        "action": r.action,
                        "action_parameters": r.action_parameters_json,
                        "is_enabled": r.is_enabled,
                    }
                    for r in security_rules
                ],
                context=rule_context,
            )

            if rule_eval and rule_eval.matched:
                if rule_eval.action in ("BLOCK", "TEMPORARY_BLOCK"):
                    MEGALODON_REQUESTS_BLOCKED_TOTAL.labels(reason=f"rule:{rule_eval.rule_name}", client_ip=client_ip).inc()
                    MEGALODON_SECURITY_EVENTS_TOTAL.labels(severity="high", event_type="rule_block").inc()
                    # Persist security event
                    sec_event = SecurityEvent(
                        event_type="RULE_BLOCK",
                        severity="HIGH",
                        client_ip=client_ip,
                        request_path=path,
                        method=method,
                        details_json=json.dumps({"rule": rule_eval.rule_name, "reason": rule_eval.reason}),
                        rule_id=rule_eval.rule_id,
                    )
                    db.add(sec_event)
                    await db.commit()

                    await event_bus.publish(TOPIC_SECURITY_EVENTS, {
                        "event_type": "RULE_BLOCK",
                        "rule_name": rule_eval.rule_name,
                        "client_ip": client_ip,
                        "path": path,
                        "method": method,
                    })

                    status_code = rule_eval.action_parameters.get("status_code", 403)
                    return await self._finalize_response(
                        status_code=int(status_code),
                        headers={"content-type": "application/json"},
                        content=json.dumps({"error": "Blocked by Megalodon Security Rule", "rule": rule_eval.rule_name}).encode("utf-8"),
                        request_id=request_id,
                        client_ip=client_ip,
                        method=method,
                        path=path,
                        dest_port=dest_port,
                        interface=interface,
                        request_size=request_size,
                        start_time=start_time,
                        blocked=True,
                        rate_limited=False,
                        action_taken="RULE_BLOCKED",
                    )

            # 5. Distributed Rate Limiting
            # Apply rate limiting per IP or policy attached to route
            rate_limit = 100
            window_sec = 60
            algo = "SLIDING_WINDOW"
            if route and route.rate_limit_policy_id:
                policy = await security_repo.rate_limit_repo.get_by_id(db, route.rate_limit_policy_id)
                if policy:
                    rate_limit = policy.rate_limit
                    window_sec = policy.window_seconds
                    algo = policy.algorithm

            rl_result = await DistributedRateLimiter.check_rate_limit(
                policy_name=f"ip_{route.name if route else 'default'}",
                identifier=client_ip,
                limit=rate_limit,
                window_seconds=window_sec,
                algorithm=algo,
            )

            rl_headers = {
                "X-RateLimit-Limit": str(rl_result.limit),
                "X-RateLimit-Remaining": str(rl_result.remaining),
                "X-RateLimit-Reset": str(rl_result.reset_epoch),
            }

            if not rl_result.allowed:
                MEGALODON_REQUESTS_RATE_LIMITED_TOTAL.labels(policy="default", identifier=client_ip).inc()
                rl_headers["Retry-After"] = str(rl_result.retry_after)
                rl_headers["content-type"] = "application/json"
                return await self._finalize_response(
                    status_code=429,
                    headers=rl_headers,
                    content=json.dumps({
                        "error": "Too Many Requests",
                        "retry_after": rl_result.retry_after,
                        "limit": rl_result.limit,
                    }).encode("utf-8"),
                    request_id=request_id,
                    client_ip=client_ip,
                    method=method,
                    path=path,
                    dest_port=dest_port,
                    interface=interface,
                    request_size=request_size,
                    start_time=start_time,
                    blocked=False,
                    rate_limited=True,
                    action_taken="RATE_LIMITED",
                )

            # 6. Reverse Proxy to Upstream
            if not route or not route.backend_service:
                # No upstream route configured for this path: return 404 or default welcome message
                return await self._finalize_response(
                    status_code=404,
                    headers={"content-type": "application/json", **rl_headers},
                    content=json.dumps({
                        "error": "Not Found",
                        "message": f"No upstream backend route matches prefix '{path}'",
                        "megalodon_gateway": "online",
                    }).encode("utf-8"),
                    request_id=request_id,
                    client_ip=client_ip,
                    method=method,
                    path=path,
                    dest_port=dest_port,
                    interface=interface,
                    request_size=request_size,
                    start_time=start_time,
                    blocked=False,
                    rate_limited=False,
                    action_taken="NOT_FOUND",
                )

            backend = route.backend_service
            target_subpath = path
            if route.strip_prefix and path.startswith(route.path_prefix):
                target_subpath = path[len(route.path_prefix):] or "/"

            status_code, resp_headers, resp_content = await proxy_engine.forward_request(
                upstream_base_url=backend.upstream_url,
                subpath=target_subpath,
                method=method,
                headers=headers,
                query_string=query_string,
                body=body,
                timeout=backend.timeout_seconds,
            )

            # Merge rate limit and gateway tracing headers
            resp_headers.update(rl_headers)
            resp_headers["X-Megalodon-Request-ID"] = request_id
            resp_headers["X-Sentinel-Request-ID"] = request_id

            return await self._finalize_response(
                status_code=status_code,
                headers=resp_headers,
                content=resp_content,
                request_id=request_id,
                client_ip=client_ip,
                method=method,
                path=path,
                dest_port=dest_port,
                interface=interface,
                request_size=request_size,
                start_time=start_time,
                blocked=False,
                rate_limited=False,
                action_taken="FORWARDED",
                backend_service=backend.name,
            )

    async def _finalize_response(
        self,
        status_code: int,
        headers: dict,
        content: bytes,
        request_id: str,
        client_ip: str,
        method: str,
        path: str,
        dest_port: int,
        interface: str,
        request_size: int,
        start_time: float,
        blocked: bool,
        rate_limited: bool,
        action_taken: str,
        backend_service: Optional[str] = None,
    ) -> Response:
        duration_ms = (time.time() - start_time) * 1000.0
        response_size = len(content)

        # 1. Update Prometheus Telemetry
        MEGALODON_REQUESTS_TOTAL.labels(
            method=method,
            status=str(status_code),
            backend=backend_service or "gateway",
        ).inc()
        MEGALODON_REQUEST_DURATION_SECONDS.labels(
            backend=backend_service or "gateway",
            status=str(status_code),
        ).observe(duration_ms / 1000.0)

        # 2. Record in Analytics Buffer
        entry = RequestLogEntry(
            timestamp=datetime.now(timezone.utc),
            request_id=request_id,
            client_ip=client_ip,
            interface=interface,
            destination_ip="0.0.0.0",
            destination_port=dest_port,
            method=method,
            path=path,
            status_code=status_code,
            response_time_ms=round(duration_ms, 2),
            request_size_bytes=request_size,
            response_size_bytes=response_size,
            backend_service=backend_service,
            rate_limited=rate_limited,
            blocked=blocked,
            action_taken=action_taken,
        )
        analytics_service.record_request(entry)

        # 3. Publish to Kafka topic megalodon.requests
        event_payload = {
            "timestamp": entry.timestamp.isoformat(),
            "request_id": request_id,
            "client_ip": client_ip,
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration_ms": round(duration_ms, 2),
            "backend": backend_service,
            "action": action_taken,
        }
        await event_bus.publish(TOPIC_REQUESTS, event_payload)

        # 4. Broadcast live request over WebSocket
        await ws_manager.broadcast_json("LIVE_REQUEST", event_payload)

        # 5. Formulate HTTP Response
        resp = Response(content=content, status_code=status_code, headers=headers)
        resp.headers["X-Megalodon-Request-ID"] = request_id
        resp.headers["X-Sentinel-Request-ID"] = request_id
        return resp


gateway_pipeline = GatewayPipeline()
