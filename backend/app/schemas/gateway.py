from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class BackendServiceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    upstream_url: str = Field(..., description="Target URL, e.g. http://10.0.0.5:8080")
    health_check_path: str = "/health"
    is_active: bool = True
    timeout_seconds: float = 30.0
    weight: int = 100


class BackendServiceCreate(BackendServiceBase):
    pass


class BackendServiceUpdate(BaseModel):
    name: Optional[str] = None
    upstream_url: Optional[str] = None
    health_check_path: Optional[str] = None
    is_active: Optional[bool] = None
    timeout_seconds: Optional[float] = None
    weight: Optional[int] = None


class BackendServiceRead(BackendServiceBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RouteBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    path_prefix: str = Field(..., description="Path matching prefix, e.g. /api/users")
    methods: str = Field(default="ALL", description="Comma-separated or ALL: GET,POST,PUT,DELETE")
    backend_service_id: str
    strip_prefix: bool = False
    auth_required: bool = False
    rate_limit_policy_id: Optional[str] = None


class RouteCreate(RouteBase):
    pass


class RouteUpdate(BaseModel):
    name: Optional[str] = None
    path_prefix: Optional[str] = None
    methods: Optional[str] = None
    backend_service_id: Optional[str] = None
    strip_prefix: Optional[bool] = None
    auth_required: Optional[bool] = None
    rate_limit_policy_id: Optional[str] = None


class RouteRead(RouteBase):
    id: str
    created_at: datetime
    updated_at: datetime
    backend_service: Optional[BackendServiceRead] = None

    class Config:
        from_attributes = True


class GatewayConfigRead(BaseModel):
    key: str
    value_json: str
    description: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True
