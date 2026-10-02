from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------- IP Policies ----------------
class IPPolicyCreate(BaseModel):
    ip_or_cidr: str = Field(..., description="IPv4, IPv6 or CIDR (e.g. 1.2.3.4, 10.0.0.0/8, 2001:db8::/32)")
    action: str = Field("BLOCK", description="ALLOW, BLOCK, TEMPORARY_BLOCK, PERMANENT_BLOCK")
    duration_minutes: Optional[int] = Field(None, description="For TEMPORARY_BLOCK, duration in minutes")
    reason: Optional[str] = None


class IPPolicyRead(BaseModel):
    id: str
    ip_or_cidr: str
    action: str
    expires_at: Optional[datetime] = None
    reason: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------------- Rate Limiting ----------------
class RateLimitPolicyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    algorithm: str = Field("SLIDING_WINDOW", description="FIXED_WINDOW, SLIDING_WINDOW, TOKEN_BUCKET")
    target_type: str = Field("IP", description="IP, API_KEY, USER, ROUTE, GLOBAL")
    rate_limit: int = Field(..., ge=1, description="Maximum requests per window")
    window_seconds: int = Field(60, ge=1, description="Window time in seconds")
    burst_capacity: int = Field(0, ge=0, description="Burst capacity for token bucket")


class RateLimitPolicyRead(BaseModel):
    id: str
    name: str
    algorithm: str
    target_type: str
    rate_limit: int
    window_seconds: int
    burst_capacity: int
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------- Security Rules ----------------
class RuleCondition(BaseModel):
    field: str = Field(..., description="ip, cidr, method, path, route, status, request_rate, api_key, user, user_agent, header, query_param, interface, port")
    operator: str = Field("equals", description="equals, not_equals, contains, starts_with, regex, greater_than, less_than, in_cidr")
    value: str = Field(..., description="Condition matching target")
    header_name: Optional[str] = None  # When field == 'header'


class SecurityRuleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    description: Optional[str] = None
    priority: int = Field(100, ge=1, le=1000)
    conditions: List[RuleCondition] = []
    action: str = Field(..., description="ALLOW, BLOCK, RATE_LIMIT, TEMPORARY_BLOCK, RETURN_STATUS, CREATE_ALERT, LOG_EVENT")
    action_parameters: Optional[Dict[str, Any]] = None
    is_enabled: bool = True


class SecurityRuleRead(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    priority: int
    conditions_json: str
    action: str
    action_parameters_json: Optional[str] = None
    is_enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------------- Security Events & Alerts ----------------
class SecurityEventCreate(BaseModel):
    event_type: str
    severity: str = "MEDIUM"
    client_ip: str
    request_path: str
    method: str
    details: Dict[str, Any] = {}
    rule_id: Optional[str] = None


class SecurityEventRead(BaseModel):
    id: str
    event_type: str
    severity: str
    client_ip: str
    request_path: str
    method: str
    details_json: str
    rule_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AlertCreate(BaseModel):
    title: str
    description: str
    severity: str = "WARNING"
    source: str = "megalodon-core"
    metadata: Dict[str, Any] = {}


class AlertUpdate(BaseModel):
    status: str = Field(..., description="OPEN, ACKNOWLEDGED, RESOLVED")


class AlertRead(BaseModel):
    id: str
    title: str
    description: str
    severity: str
    status: str
    source: str
    metadata_json: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
