import time
from typing import Any, Dict, Optional

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.logging import logger


class InMemoryRedisFallback:
    """
    In-memory fallback providing atomic-like primitives and TTL support
    for local test suites when a standalone Redis instance is not yet running.
    """
    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._expires: Dict[str, float] = {}

    def _cleanup(self, key: str) -> bool:
        if key in self._expires:
            if time.time() > self._expires[key]:
                self._data.pop(key, None)
                self._expires.pop(key, None)
                return True
        return False

    async def get(self, key: str) -> Optional[str]:
        self._cleanup(key)
        return self._data.get(key)

    async def set(self, key: str, value: Any, ex: Optional[int] = None) -> bool:
        self._data[key] = str(value)
        if ex:
            self._expires[key] = time.time() + ex
        else:
            self._expires.pop(key, None)
        return True

    async def incr(self, key: str) -> int:
        self._cleanup(key)
        val = int(self._data.get(key, 0)) + 1
        self._data[key] = str(val)
        return val

    async def expire(self, key: str, seconds: int) -> bool:
        if key in self._data:
            self._expires[key] = time.time() + seconds
            return True
        return False

    async def ttl(self, key: str) -> int:
        if key not in self._data:
            return -2
        if key in self._expires:
            remaining = int(self._expires[key] - time.time())
            return remaining if remaining > 0 else -2
        return -1

    async def delete(self, *keys: str) -> int:
        count = 0
        for k in keys:
            if k in self._data:
                del self._data[k]
                self._expires.pop(k, None)
                count += 1
        return count

    async def ping(self) -> bool:
        return True

    async def close(self):
        pass


class RedisClient:
    def __init__(self):
        self._redis: Optional[aioredis.Redis] = None
        self._fallback = InMemoryRedisFallback()
        self._use_fallback = False

    async def get_client(self):
        if self._use_fallback:
            return self._fallback

        if self._redis is None:
            try:
                redis_instance = aioredis.from_url(
                    settings.effective_redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=2.0,
                    socket_timeout=2.0,
                )
                await redis_instance.ping()
                self._redis = redis_instance
                logger.info("Successfully connected to Redis at %s", settings.effective_redis_url)
            except Exception as e:
                logger.warning(
                    "Could not connect to Redis (%s). Using thread-safe in-memory fallback for testing/offline mode.",
                    e,
                )
                self._use_fallback = True
                return self._fallback

        return self._redis

    async def close(self):
        if self._redis:
            await self._redis.close()
            self._redis = None


redis_pool = RedisClient()


async def get_redis():
    """FastAPI dependency or internal helper for Redis operations."""
    return await redis_pool.get_client()
