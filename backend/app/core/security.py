import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import settings

# Argon2id password hasher with secure memory/time parameters
ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)


def hash_password(password: str) -> str:
    """Hashes a plaintext password using Argon2id."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against an Argon2id hash."""
    try:
        return ph.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def create_access_token(subject: str, roles: list[str] = None, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
        "roles": roles or [],
    }
    return jwt.encode(to_encode, settings.effective_secret_key, algorithm=settings.effective_jwt_algorithm)


def create_refresh_token(subject: str) -> str:
    """Creates a long-lived signed JWT refresh token."""
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    }
    return jwt.encode(to_encode, settings.effective_secret_key, algorithm=settings.effective_jwt_algorithm)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT token signature and expiration."""
    try:
        payload = jwt.decode(
            token,
            settings.effective_secret_key,
            algorithms=[settings.effective_jwt_algorithm]
        )
        return payload
    except jwt.PyJWTError:
        return None


def generate_api_key(prefix: str = "sk_live_") -> Tuple[str, str, str]:
    """
    Generates a secure API key.
    Returns:
        raw_key: The raw key shown ONCE to the user (e.g. sk_live_4f3a...c8)
        key_prefix: First 8 chars after prefix for UI identification
        key_hash: SHA-256 hash stored permanently in the database
    """
    random_part = secrets.token_urlsafe(32)
    raw_key = f"{prefix}{random_part}"
    key_prefix = raw_key[:12]
    key_hash = hash_api_key(raw_key)
    return raw_key, key_prefix, key_hash


def hash_api_key(raw_key: str) -> str:
    """Hashes an API key using SHA-256 for database lookup."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
