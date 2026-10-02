from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request

from app.api.v1.health import router as health_router
from app.api.v1.router import api_v1_router
from app.core.database import get_session_maker, init_db
from app.core.kafka import event_bus
from app.core.logging import logger
from app.core.redis import redis_pool
from app.gateway.pipeline import gateway_pipeline
from app.gateway.proxy import proxy_engine
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.services.auth_service import auth_service
from app.websocket.manager import ws_manager
from app.workers.alert_worker import alert_worker
from app.workers.analytics_worker import analytics_worker
from app.workers.network_worker import network_worker
from app.workers.security_worker import security_worker


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

# ── CORS Middleware (hardened — restrict to localhost origins) ────────────────
# A01/A05: do NOT use allow_origins=["*"] in production.
# Allow the frontend origin(s) explicitly.
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key", "X-Requested-With"],
    expose_headers=["X-Request-ID"],
    max_age=600,
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
