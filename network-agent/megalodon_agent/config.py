from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class AgentSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    MEGALODON_API_URL: str = "http://localhost:8000/api/v1/network/discovery"
    SENTINEL_API_URL: Optional[str] = None
    NETWORK_DISCOVERY_INTERVAL: int = 10
    NETWORK_AGENT_TOKEN: str = "megalodon_agent_secret_auth_token_for_internal_comms"
    HOST_PROC_PATH: str = "/proc"
    HOST_SYS_PATH: str = "/sys"

    @property
    def effective_api_url(self) -> str:
        return self.MEGALODON_API_URL or self.SENTINEL_API_URL or "http://localhost:8000/api/v1/network/discovery"


agent_settings = AgentSettings()
