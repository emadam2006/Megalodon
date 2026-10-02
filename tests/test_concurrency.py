import asyncio

import pytest
from app.ratelimit.limiter import DistributedRateLimiter


@pytest.mark.asyncio
async def test_concurrent_rate_limiting():
    """
    Simulates 100 concurrent requests arriving simultaneously.
    With rate_limit = 10 requests/minute, exactly 10 requests must be allowed,
    and exactly 90 requests must be rejected.
    """
    identifier = "concurrent_client_test_ip"
    policy_name = "test_concurrent_policy"
    limit = 10
    window = 60

    async def make_request():
        return await DistributedRateLimiter.check_rate_limit(
            policy_name=policy_name,
            identifier=identifier,
            limit=limit,
            window_seconds=window,
            algorithm="SLIDING_WINDOW",
        )

    # Launch 100 concurrent async requests
    tasks = [make_request() for _ in range(100)]
    results = await asyncio.gather(*tasks)

    allowed_count = sum(1 for r in results if r.allowed)
    blocked_count = sum(1 for r in results if not r.allowed)

    assert allowed_count == limit, f"Expected exactly {limit} allowed requests, got {allowed_count}"
    assert blocked_count == 90, f"Expected exactly 90 blocked requests, got {blocked_count}"
