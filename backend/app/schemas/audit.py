from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class AuditLogCreate(BaseModel):
    user_id: Optional[str] = None
    username: Optional[str] = None
    action: str
    resource: str
    resource_id: Optional[str] = None
    source_ip: Optional[str] = None
    metadata: Dict[str, Any] = {}


class AuditLogRead(BaseModel):
    id: str
    timestamp: datetime
    user_id: Optional[str] = None
    username: Optional[str] = None
    action: str
    resource: str
    resource_id: Optional[str] = None
    source_ip: Optional[str] = None
    metadata_json: Optional[str] = None

    class Config:
        from_attributes = True
