from typing import Any, List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # General
    PROJECT_NAME: str = "Megalodon"
    MEGALODON_ENV: str = "production"
    SENTINEL_ENV: Optional[str] = None
    LOG_LEVEL: str = "INFO"
    DEBUG: bool = False

    # Core API
    MEGALODON_API_HOST: str = "0.0.0.0"
    SENTINEL_API_HOST: Optional[str] = None
    MEGALODON_API_PORT: int = 8000
    SENTINEL_API_PORT: Optional[int] = None
    MEGALODON_SECRET_KEY: str = "megalodon_production_secret_key_minimum_32_characters_long"
    SENTINEL_SECRET_KEY: Optional[str] = None
    MEGALODON_JWT_ALGORITHM: str = "HS256"
    SENTINEL_JWT_ALGORITHM: Optional[str] = None
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Gateway & Proxy
    MEGALODON_GATEWAY_HOST: str = "0.0.0.0"
    SENTINEL_GATEWAY_HOST: Optional[str] = None
    MEGALODON_GATEWAY_PORT: int = 8080
    SENTINEL_GATEWAY_PORT: Optional[int] = None
    MEGALODON_TRUSTED_PROXIES: str = "127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
    SENTINEL_TRUSTED_PROXIES: Optional[str] = None

    # Network Agent
    NETWORK_AGENT_HOST: str = "0.0.0.0"
    NETWORK_AGENT_PORT: int = 8001
    NETWORK_DISCOVERY_INTERVAL: int = 10
    NETWORK_AGENT_TOKEN: str = "megalodon_agent_secret_auth_token_for_internal_comms"

    # CORS Allowed Origins
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Database
    POSTGRES_USER: str = "megalodon"
    POSTGRES_PASSWORD: str = "megalodon_production_password_replace_me"
    POSTGRES_DB: str = "megalodon"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: Optional[str] = None

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_URL: Optional[str] = None

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_ENABLED: bool = True
    KAFKA_CLIENT_ID: str = "megalodon-core"

    @property
    def effective_secret_key(self) -> str:
        return self.MEGALODON_SECRET_KEY or self.SENTINEL_SECRET_KEY or "megalodon_production_secret_key_minimum_32_characters_long"

    @property
    def effective_jwt_algorithm(self) -> str:
        return self.MEGALODON_JWT_ALGORITHM or self.SENTINEL_JWT_ALGORITHM or "HS256"

    @property
    def effective_database_url(self) -> str:
        if self.DATABASE_URL:
            # Ensure asyncpg driver for postgresql
            if self.DATABASE_URL.startswith("postgresql://"):
                return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
            return self.DATABASE_URL
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def effective_redis_url(self) -> str:
        if self.REDIS_URL:
            return self.REDIS_URL
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/0"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    @property
    def trusted_proxy_list(self) -> List[str]:
        proxies = self.MEGALODON_TRUSTED_PROXIES or self.SENTINEL_TRUSTED_PROXIES or ""
        return [p.strip() for p in proxies.split(",") if p.strip()]

    @property
    def cors_origin_list(self) -> List[str]:
        if not self.CORS_ALLOWED_ORIGINS:
            return ["http://localhost:3000", "http://127.0.0.1:3000"]
        return [o.strip() for o in self.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()
