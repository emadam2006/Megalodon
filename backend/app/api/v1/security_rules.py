import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.auth import User
from app.models.security import SecurityRule
from app.repositories.security_repo import security_repo
from app.schemas.security import SecurityRuleCreate, SecurityRuleRead
from app.services.audit_service import audit_service

router = APIRouter(prefix="/security-rules", tags=["Security Rules"])


@router.get("", response_model=List[SecurityRuleRead])
async def list_security_rules(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR", "VIEWER"])),
):
    return await security_repo.list_security_rules(db)


@router.post("", response_model=SecurityRuleRead, status_code=status.HTTP_201_CREATED)
async def create_security_rule(
    req: SecurityRuleCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    rule = SecurityRule(
        name=req.name,
        description=req.description,
        priority=req.priority,
        conditions_json=json.dumps([c.model_dump() for c in req.conditions]),
        action=req.action.upper(),
        action_parameters_json=json.dumps(req.action_parameters or {}),
        is_enabled=req.is_enabled,
    )
    created = await security_repo.rule_repo.create(db, rule)

    await audit_service.record_action(
        db=db,
        action="CREATE_SECURITY_RULE",
        resource="SecurityRule",
        resource_id=created.id,
        user_id=user.id,
        username=user.username,
        metadata={"name": created.name, "action": created.action, "priority": created.priority},
    )

    return created


@router.patch("/{rule_id}/toggle", response_model=SecurityRuleRead)
async def toggle_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    rule = await security_repo.rule_repo.get_by_id(db, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule.is_enabled = not rule.is_enabled
    await db.commit()
    await db.refresh(rule)

    await audit_service.record_action(
        db=db,
        action="TOGGLE_SECURITY_RULE",
        resource="SecurityRule",
        resource_id=rule.id,
        user_id=user.id,
        username=user.username,
        metadata={"name": rule.name, "is_enabled": rule.is_enabled},
    )

    return rule


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_security_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
):
    rule = await security_repo.rule_repo.get_by_id(db, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    await security_repo.rule_repo.delete(db, rule_id)

    await audit_service.record_action(
        db=db,
        action="DELETE_SECURITY_RULE",
        resource="SecurityRule",
        resource_id=rule_id,
        user_id=user.id,
        username=user.username,
        metadata={"name": rule.name},
    )
