from fastapi import APIRouter

from app.api.v1.alerts import router as alerts_router
from app.api.v1.api_keys import router as api_keys_router
from app.api.v1.audit import router as audit_router
from app.api.v1.auth import router as auth_router
from app.api.v1.backends import router as backends_router
from app.api.v1.health import router as health_router
from app.api.v1.ip_policies import router as ip_policies_router
from app.api.v1.network import router as network_router
from app.api.v1.rate_limits import router as rate_limits_router
from app.api.v1.routes import router as routes_router
from app.api.v1.security_events import router as security_events_router
from app.api.v1.security_rules import router as security_rules_router
from app.api.v1.traffic import router as traffic_router
from app.api.v1.users import router as users_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(api_keys_router)
api_v1_router.include_router(network_router)
api_v1_router.include_router(ip_policies_router)
api_v1_router.include_router(rate_limits_router)
api_v1_router.include_router(security_rules_router)
api_v1_router.include_router(security_events_router)
api_v1_router.include_router(alerts_router)
api_v1_router.include_router(backends_router)
api_v1_router.include_router(routes_router)
api_v1_router.include_router(traffic_router)
api_v1_router.include_router(audit_router)
api_v1_router.include_router(health_router)

