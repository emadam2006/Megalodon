from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.auth import User
from app.models.security import IPPolicy
from app.repositories.security_repo import security_repo
from app.schemas.security import IPPolicyCreate, IPPolicyRead
from app.services.audit_service import audit_service

router = APIRouter(prefix="/ip-policies", tags=["IP Policies"])


@router.get("", response_model=List[IPPolicyRead])
async def list_ip_policies(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR", "VIEWER"])),
):
    policies = await security_repo.ip_policy_repo.get_all(db)
    return policies


@router.post("", response_model=IPPolicyRead, status_code=status.HTTP_201_CREATED)
async def create_ip_policy(
    req: IPPolicyCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    expires_at = None
    action = req.action.upper()
    if action == "TEMPORARY_BLOCK" and req.duration_minutes:
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=req.duration_minutes)

    policy = IPPolicy(
        ip_or_cidr=req.ip_or_cidr.strip(),
        action=action,
        expires_at=expires_at,
        reason=req.reason,
        created_by=user.username,
    )
    created = await security_repo.ip_policy_repo.create(db, policy)

    await audit_service.record_action(
        db=db,
        action="CREATE_IP_POLICY",
        resource="IPPolicy",
        resource_id=created.id,
        user_id=user.id,
        username=user.username,
        metadata={"ip_or_cidr": created.ip_or_cidr, "action": created.action},
    )

    return created


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ip_policy(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    policy = await security_repo.ip_policy_repo.get_by_id(db, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    await security_repo.ip_policy_repo.delete(db, policy_id)

    await audit_service.record_action(
        db=db,
        action="DELETE_IP_POLICY",
        resource="IPPolicy",
        resource_id=policy_id,
        user_id=user.id,
        username=user.username,
        metadata={"ip_or_cidr": policy.ip_or_cidr, "action": policy.action},
    )
