from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "VC Brain Scraper API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite+aiosqlite:///./vc_brain.db"

    github_token: str | None = None
    github_api_url: str = "https://api.github.com"
    github_graphql_url: str = "https://api.github.com/graphql"
    github_rate_limit_max_wait_seconds: int = 60

    apify_api_token: str | None = None
    linkedin_actor_id: str = "harvestapi/linkedin-profile-posts"

    x_base_url: str = "https://x.com"
    x_auth_token: str | None = None
    x_page_timeout_ms: int = 30_000
    x_max_scrolls: int = 20

    openai_api_key: str | None = None
    openai_model: str = "gpt-5.6-terra"
    openai_timeout_seconds: float = 60.0
    tavily_api_key: str | None = None
    tavily_api_url: str = "https://api.tavily.com"
    research_max_agent_turns: int = 10
    max_pitch_deck_bytes: int = 20 * 1024 * 1024

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    log_level: str = Field(default="INFO")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
