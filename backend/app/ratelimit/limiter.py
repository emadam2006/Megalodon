import time
from dataclasses import dataclass

from app.core.redis import get_redis
from app.ratelimit.fixed_window import check_fixed_window
from app.ratelimit.sliding_window import check_sliding_window
from app.ratelimit.token_bucket import check_token_bucket


@dataclass
class RateLimitResult:
    allowed: bool
    limit: int
    remaining: int
    reset_epoch: int
    retry_after: int


class DistributedRateLimiter:
    @staticmethod
    async def check_rate_limit(
        policy_name: str,
        identifier: str,
        limit: int,
        window_seconds: int = 60,
        algorithm: str = "SLIDING_WINDOW",
        burst_capacity: int = 0,
    ) -> RateLimitResult:
        redis_client = await get_redis()
        cache_key = f"{policy_name}:{identifier}"

        algo = algorithm.upper()
        if algo == "FIXED_WINDOW":
            allowed, count, remaining, reset_epoch = await check_fixed_window(
                redis_client, cache_key, limit, window_seconds
            )
        elif algo == "TOKEN_BUCKET":
            allowed, count, remaining, reset_epoch = await check_token_bucket(
                redis_client, cache_key, limit, window_seconds, burst_capacity
            )
        else:  # Default SLIDING_WINDOW
            allowed, count, remaining, reset_epoch = await check_sliding_window(
                redis_client, cache_key, limit, window_seconds
            )

        now = int(time.time())
        retry_after = max(1, reset_epoch - now) if not allowed else 0

        return RateLimitResult(
            allowed=allowed,
            limit=limit,
            remaining=remaining,
            reset_epoch=reset_epoch,
            retry_after=retry_after,
        )
