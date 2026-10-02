import time
from typing import Tuple


async def check_sliding_window(
    redis_client,
    key: str,
    limit: int,
    window_seconds: int
) -> Tuple[bool, int, int, int]:
    """
    Sliding Window rate limiting using timestamps.
    Provides precise rate limiting without boundary-edge spikes.
    Returns:
        (is_allowed, current_count, remaining, reset_time)
    """
    now = time.time()
    window_start = now - window_seconds
    redis_key = f"ratelimit:sliding:{key}"

    # Check if native zset methods are available (real redis)
    if hasattr(redis_client, "zremrangebyscore"):
        try:
            pipe = redis_client.pipeline(transaction=True)
            pipe.zremrangebyscore(redis_key, 0, window_start)
            pipe.zadd(redis_key, {str(now): now})
            pipe.zcard(redis_key)
            pipe.expire(redis_key, window_seconds + 5)
            results = await pipe.execute()
            current_count = results[2]

            is_allowed = current_count <= limit
            remaining = max(0, limit - current_count)
            reset_time = int(now + window_seconds)
            return is_allowed, current_count, remaining, reset_time
        except Exception:
            pass

    # Fallback counter for mock/in-memory
    current_count = await redis_client.incr(redis_key)
    if current_count == 1:
        await redis_client.expire(redis_key, window_seconds)
    is_allowed = current_count <= limit
    remaining = max(0, limit - current_count)
    reset_time = int(now + window_seconds)
    return is_allowed, current_count, remaining, reset_time
