from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.auth import User
from app.models.security import RateLimitPolicy
from app.repositories.security_repo import security_repo
from app.schemas.security import RateLimitPolicyCreate, RateLimitPolicyRead
from app.services.audit_service import audit_service

router = APIRouter(prefix="/rate-limits", tags=["Rate Limiting"])


@router.get("", response_model=List[RateLimitPolicyRead])
async def list_rate_limit_policies(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR", "VIEWER"])),
):
    return await security_repo.rate_limit_repo.get_all(db)


@router.post("", response_model=RateLimitPolicyRead, status_code=status.HTTP_201_CREATED)
async def create_rate_limit_policy(
    req: RateLimitPolicyCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    policy = RateLimitPolicy(
        name=req.name,
        algorithm=req.algorithm.upper(),
        target_type=req.target_type.upper(),
        rate_limit=req.rate_limit,
        window_seconds=req.window_seconds,
        burst_capacity=req.burst_capacity,
    )
    created = await security_repo.rate_limit_repo.create(db, policy)

    await audit_service.record_action(
        db=db,
        action="CREATE_RATE_LIMIT_POLICY",
        resource="RateLimitPolicy",
        resource_id=created.id,
        user_id=user.id,
        username=user.username,
        metadata={"name": created.name, "algorithm": created.algorithm, "limit": created.rate_limit},
    )

    return created


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rate_limit_policy(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    policy = await security_repo.rate_limit_repo.get_by_id(db, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Rate limit policy not found")

    await security_repo.rate_limit_repo.delete(db, policy_id)

    await audit_service.record_action(
        db=db,
        action="DELETE_RATE_LIMIT_POLICY",
        resource="RateLimitPolicy",
        resource_id=policy_id,
        user_id=user.id,
        username=user.username,
        metadata={"name": policy.name},
    )
