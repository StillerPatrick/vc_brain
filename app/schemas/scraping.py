import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from app.models.entities import JobStatus


class UserTargetBase(BaseModel):
    user_id: uuid.UUID | None = None
    display_name: str | None = Field(default=None, max_length=255)


class GitHubScrapeRequest(UserTargetBase):
    handle: str = Field(min_length=1, max_length=255)

    @field_validator("handle")
    @classmethod
    def normalize_handle(cls, value: str) -> str:
        return value.strip().lstrip("@")


class LinkedInScrapeRequest(UserTargetBase):
    profile_url: HttpUrl
    max_posts: int = Field(default=10, ge=1, le=100)
    include_reposts: bool = False
    max_comments: int = Field(default=10, ge=0, le=100)
    max_reactions: int = Field(default=10, ge=0, le=100)


class TwitterScrapeRequest(UserTargetBase):
    handle: str = Field(min_length=1, max_length=255)
    max_items: int = Field(default=20, ge=1, le=200)

    @field_validator("handle")
    @classmethod
    def normalize_handle(cls, value: str) -> str:
        return value.strip().lstrip("@")


class ScrapeAllRequest(BaseModel):
    user_id: uuid.UUID | None = None
    display_name: str | None = Field(default=None, max_length=255)
    github_handle: str = Field(min_length=1, max_length=255)
    linkedin_url: HttpUrl
    twitter_handle: str = Field(min_length=1, max_length=255)
    linkedin_max_posts: int = Field(default=10, ge=1, le=100)
    twitter_max_items: int = Field(default=20, ge=1, le=200)

    @field_validator("github_handle", "twitter_handle")
    @classmethod
    def normalize_handle(cls, value: str) -> str:
        return value.strip().lstrip("@")


class ScrapeAcceptedResponse(BaseModel):
    message: str = "Data scraping actively started and will be stored."
    job_id: uuid.UUID
    status: Literal["processing"] = "processing"


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    status: JobStatus
    platforms: list[str]
    error: str | None
    created_at: datetime
    completed_at: datetime | None


class PlatformDataResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    job_id: uuid.UUID
    payload: dict[str, Any] | list[Any]
    scraped_at: datetime


class AggregatedDataResponse(BaseModel):
    user_id: uuid.UUID
    github: list[PlatformDataResponse]
    linkedin: list[PlatformDataResponse]
    twitter: list[PlatformDataResponse]
