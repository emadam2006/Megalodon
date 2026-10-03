from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

PASSWORD_SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;':\",.<>?/~`"


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    user_id: Optional[str] = None
    username: Optional[str] = None
    roles: List[str] = []


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=64, strip_whitespace=True)
    password: str = Field(..., min_length=1, max_length=256)


class RefreshRequest(BaseModel):
    refresh_token: str


class RoleRead(BaseModel):
    id: str
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str = Field(
        ...,
        min_length=3,
        max_length=64,
        strip_whitespace=True,
        pattern=r"^[a-zA-Z0-9_\-\.]+$",
        description="Username must be at least 3 characters and contain only letters, numbers, _, -, or ."
    )
    email: str = Field(..., max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(..., min_length=8, max_length=128)
    role_names: list[str] = ["VIEWER"]

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter (A-Z)")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter (a-z)")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number (0-9)")
        if not any(c in PASSWORD_SPECIAL_CHARS for c in v):
            raise ValueError("Password must contain at least one special character (!@#$%^&*...)")
        return v


class UserUpdateMe(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=64, strip_whitespace=True, pattern=r"^[a-zA-Z0-9_\-\.]+$")
    email: Optional[str] = Field(None, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    current_password: Optional[str] = None
    new_password: Optional[str] = None

    @field_validator("new_password")
    @classmethod
    def validate_new_pwd(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter (A-Z)")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter (a-z)")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number (0-9)")
        if not any(c in PASSWORD_SPECIAL_CHARS for c in v):
            raise ValueError("Password must contain at least one special character")
        return v


class UserRead(BaseModel):
    id: str
    username: str
    email: str
    is_active: bool
    is_superuser: bool
    must_change_credentials: bool = False
    roles: List[RoleRead] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ChangeCredentialsRequest(BaseModel):
    current_password: str = Field(..., min_length=1, description="Current user password")
    new_username: str = Field(
        ...,
        min_length=3,
        max_length=64,
        strip_whitespace=True,
        pattern=r"^[a-zA-Z0-9_\-\.]+$",
        description="New username must be at least 3 characters"
    )
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("New password must contain at least one uppercase letter (A-Z)")
        if not any(c.islower() for c in v):
            raise ValueError("New password must contain at least one lowercase letter (a-z)")
        if not any(c.isdigit() for c in v):
            raise ValueError("New password must contain at least one number (0-9)")
        if not any(c in PASSWORD_SPECIAL_CHARS for c in v):
            raise ValueError("New password must contain at least one special character (!@#$%^&*...)")
        return v

    @model_validator(mode="after")
    def validate_passwords(self):
        if self.new_password != self.confirm_password:
            raise ValueError("New password and confirm password do not match")
        if self.current_password == self.new_password:
            raise ValueError("New password must be different from current password")
        return self


class ChangeCredentialsResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead



class APIKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    permissions: str = "*"
    rate_limit: Optional[int] = None
    expires_in_days: Optional[int] = None


class APIKeyResponse(BaseModel):
    id: str
    name: str
    raw_key: str  # Only returned ONCE upon creation
    key_prefix: str
    rate_limit: Optional[int] = None
    permissions: str
    created_at: datetime
    expires_at: Optional[datetime] = None


class APIKeyRead(BaseModel):
    id: str
    name: str
    key_prefix: str
    is_active: bool
    permissions: str
    rate_limit: Optional[int] = None
    usage_count: int
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
