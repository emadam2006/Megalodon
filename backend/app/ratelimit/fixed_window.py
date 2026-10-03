import time
from typing import Tuple


async def check_fixed_window(
    redis_client,
    key: str,
    limit: int,
    window_seconds: int
) -> Tuple[bool, int, int, int]:
    """
    Fixed Window Rate Limiting using atomic Redis operations.
    Returns:
        (is_allowed, current_count, remaining, reset_time)
    """
    now = int(time.time())
    window_bucket = now // window_seconds
    redis_key = f"ratelimit:fixed:{key}:{window_bucket}"

    count = await redis_client.incr(redis_key)
    if count == 1:
        await redis_client.expire(redis_key, window_seconds * 2)

    remaining = max(0, limit - count)
    reset_time = (window_bucket + 1) * window_seconds
    is_allowed = count <= limit

    return is_allowed, count, remaining, reset_time
