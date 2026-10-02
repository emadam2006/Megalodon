from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.gateway import BackendService, GatewayConfig, Route
from app.repositories.base import BaseRepository


class GatewayRepository:
    def __init__(self):
        self.backend_repo = BaseRepository(BackendService)
        self.route_repo = BaseRepository(Route)
        self.config_repo = BaseRepository(GatewayConfig)

    async def list_backends(self, db: AsyncSession) -> List[BackendService]:
        result = await db.execute(select(BackendService).options(selectinload(BackendService.routes)))
        return list(result.scalars().all())

    async def get_backend_by_id(self, db: AsyncSession, backend_id: str) -> Optional[BackendService]:
        result = await db.execute(select(BackendService).where(BackendService.id == backend_id).options(selectinload(BackendService.routes)))
        return result.scalars().first()

    async def list_routes(self, db: AsyncSession) -> List[Route]:
        result = await db.execute(select(Route).options(selectinload(Route.backend_service)))
        return list(result.scalars().all())

    async def get_route_by_id(self, db: AsyncSession, route_id: str) -> Optional[Route]:
        result = await db.execute(select(Route).where(Route.id == route_id).options(selectinload(Route.backend_service)))
        return result.scalars().first()

    async def find_matching_route(self, db: AsyncSession, path: str, method: str) -> Optional[Route]:
        routes = await self.list_routes(db)
        # Sort routes by path_prefix length descending for most specific prefix match first
        routes.sort(key=lambda r: len(r.path_prefix), reverse=True)

        for route in routes:
            if path.startswith(route.path_prefix):
                # Check method
                allowed_methods = [m.strip().upper() for m in route.methods.split(",")]
                if "ALL" in allowed_methods or method.upper() in allowed_methods:
                    return route
        return None


gateway_repo = GatewayRepository()
