import pytest
from app.ratelimit.limiter import DistributedRateLimiter


@pytest.mark.asyncio
async def test_sliding_window_rate_limiting():
    identifier = "test_client_ip_1"
    policy_name = "test_policy_sliding"
    limit = 5
    window = 10

    # First 5 requests must be allowed
    for i in range(limit):
        res = await DistributedRateLimiter.check_rate_limit(
            policy_name=policy_name,
            identifier=identifier,
            limit=limit,
            window_seconds=window,
            algorithm="SLIDING_WINDOW",
        )
        assert res.allowed is True
        assert res.remaining == limit - (i + 1)

    # 6th request must be rejected
    rejected_res = await DistributedRateLimiter.check_rate_limit(
        policy_name=policy_name,
        identifier=identifier,
        limit=limit,
        window_seconds=window,
        algorithm="SLIDING_WINDOW",
    )
    assert rejected_res.allowed is False
    assert rejected_res.remaining == 0
    assert rejected_res.retry_after > 0


@pytest.mark.asyncio
async def test_fixed_window_rate_limiting():
    identifier = "test_client_ip_2"
    policy_name = "test_policy_fixed"
    limit = 3
    window = 60

    # 3 allowed
    for _ in range(limit):
        res = await DistributedRateLimiter.check_rate_limit(
            policy_name=policy_name,
            identifier=identifier,
            limit=limit,
            window_seconds=window,
            algorithm="FIXED_WINDOW",
        )
        assert res.allowed is True

    # 4th blocked
    rejected = await DistributedRateLimiter.check_rate_limit(
        policy_name=policy_name,
        identifier=identifier,
        limit=limit,
        window_seconds=window,
        algorithm="FIXED_WINDOW",
    )
    assert rejected.allowed is False


@pytest.mark.asyncio
async def test_token_bucket_burst_capacity():
    identifier = "test_client_ip_3"
    policy_name = "test_policy_tb"
    limit = 2
    window = 60
    burst = 4

    # With burst=4, should allow 4 requests
    for _i in range(burst):
        res = await DistributedRateLimiter.check_rate_limit(
            policy_name=policy_name,
            identifier=identifier,
            limit=limit,
            window_seconds=window,
            algorithm="TOKEN_BUCKET",
            burst_capacity=burst,
        )
        assert res.allowed is True

    # 5th request blocked
    rejected = await DistributedRateLimiter.check_rate_limit(
        policy_name=policy_name,
        identifier=identifier,
        limit=limit,
        window_seconds=window,
        algorithm="TOKEN_BUCKET",
        burst_capacity=burst,
    )
    assert rejected.allowed is False
