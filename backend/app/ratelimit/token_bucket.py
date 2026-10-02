import time
from typing import Tuple


async def check_token_bucket(
    redis_client,
    key: str,
    rate_limit: int,
    window_seconds: int,
    burst_capacity: int = 0
) -> Tuple[bool, int, int, int]:
    """
    Token Bucket rate limiting algorithm.
    Allows bursts up to capacity, refills at sustained rate.
    Returns:
        (is_allowed, current_tokens, remaining, reset_time)
    """
    now = time.time()
    capacity = burst_capacity if burst_capacity > rate_limit else rate_limit
    fill_rate = rate_limit / float(window_seconds)

    key_tokens = f"ratelimit:tb:{key}:tokens"
    key_last_update = f"ratelimit:tb:{key}:ts"

    # Fetch last known tokens and timestamp
    last_tokens_raw = await redis_client.get(key_tokens)
    last_ts_raw = await redis_client.get(key_last_update)

    if last_tokens_raw is not None and last_ts_raw is not None:
        last_tokens = float(last_tokens_raw)
        last_ts = float(last_ts_raw)
        elapsed = max(0.0, now - last_ts)
        # Refill tokens
        tokens = min(float(capacity), last_tokens + elapsed * fill_rate)
    else:
        tokens = float(capacity)

    if tokens >= 1.0:
        tokens -= 1.0
        is_allowed = True
    else:
        is_allowed = False

    await redis_client.set(key_tokens, str(tokens), ex=window_seconds * 2)
    await redis_client.set(key_last_update, str(now), ex=window_seconds * 2)

    remaining = int(tokens)
    reset_time = int(now + ((capacity - tokens) / fill_rate if fill_rate > 0 else window_seconds))

    return is_allowed, int(capacity - tokens), remaining, reset_time
