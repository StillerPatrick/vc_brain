import uuid
from datetime import datetime
from typing import Any
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.entities import ApplicationStatus, JobStatus
from app.schemas.analysis import PersonalityAnalysisResponse
from app.schemas.metadata import StartupMetadataResponse


class OverallScoreComponent(BaseModel):
    key: str
    label: str
    score: int = Field(ge=0, le=100)
    weight: float = Field(gt=0, le=1)
    contribution: float = Field(ge=0, le=100)


class OverallScore(BaseModel):
    score: int = Field(ge=0, le=100)
    threshold: int = Field(ge=0, le=100)
    verdict: str
    passes_threshold: bool
    rationale: str
    components: list[OverallScoreComponent]


class ApplicationFounderRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    role: str | None = Field(default=None, max_length=255)
    about: str | None = Field(default=None, max_length=4000)
    github: str | None = Field(default=None, max_length=1000)
    linkedin: str | None = Field(default=None, max_length=1000)
    x: str | None = Field(default=None, max_length=1000)

    @field_validator("name", "role", "about", "github", "linkedin", "x")
    @classmethod
    def trim_strings(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @model_validator(mode="after")
    def require_profile(self):
        if not any((self.github, self.linkedin, self.x)):
            raise ValueError("Each founder needs at least one public profile")
        return self


class StartupApplicationRequest(BaseModel):
    company: str = Field(min_length=1, max_length=255)
    one_liner: str | None = Field(default=None, max_length=1000)
    sector: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    deck_filename: str | None = Field(default=None, max_length=512)
    founders: list[ApplicationFounderRequest] = Field(min_length=1, max_length=3)


class ApplicationAcceptedResponse(BaseModel):
    message: str = "Application accepted; founder diligence has started."
    application_id: uuid.UUID
    status: ApplicationStatus = ApplicationStatus.processing


class ApplicationFounderResponse(BaseModel):
    user_id: uuid.UUID
    name: str
    role: str | None
    about: str | None
    github_handle: str | None
    linkedin_url: str | None
    twitter_handle: str | None
    job_id: uuid.UUID | None
    job_status: JobStatus | None
    job_error: str | None
    analysis: PersonalityAnalysisResponse | None
    # LLM-assessed time commitment to this startup
    startup_commitment: str | None = None
    commitment_rationale: str | None = None
    # CV fields derived from the LinkedIn profile scrape (users table)
    headline: str | None = None
    location_text: str | None = None
    country_code: str | None = None
    current_position: str | None = None
    current_company: str | None = None
    years_experience: float | None = None
    highest_degree: str | None = None
    field_of_study: str | None = None
    experience: list[Any] | None = None
    education: list[Any] | None = None
    skills: list[Any] | None = None
    connections_count: int | None = None
    follower_count: int | None = None
    cv_scraped_at: datetime | None = None


class StartupApplicationResponse(BaseModel):
    id: uuid.UUID
    company: str
    one_liner: str | None
    sector: str | None
    location: str | None
    deck_filename: str | None
    status: ApplicationStatus
    team_categorization: dict[str, Any] | None
    error: str | None
    created_at: datetime
    completed_at: datetime | None
    metadata: StartupMetadataResponse | None
    founders: list[ApplicationFounderResponse]
    overall_score: OverallScore | None


def github_handle(value: str | None) -> str | None:
    if not value:
        return None
    parsed = urlparse(value if "://" in value else f"https://github.com/{value}")
    if parsed.netloc.casefold() not in {"github.com", "www.github.com"}:
        raise ValueError("Invalid GitHub profile URL")
    parts = parsed.path.strip("/").split("/")
    return parts[0].lstrip("@") if parts and parts[0] else None


def linkedin_profile_url(value: str | None) -> str | None:
    if not value:
        return None
    candidate = value if "://" in value else f"https://{value}"
    parsed = urlparse(candidate)
    host = parsed.netloc.casefold()
    parts = parsed.path.strip("/").split("/")
    if not (host == "linkedin.com" or host.endswith(".linkedin.com")):
        raise ValueError("Invalid LinkedIn profile URL")
    if len(parts) < 2 or parts[0].casefold() != "in":
        raise ValueError("Invalid LinkedIn profile URL")
    return candidate.rstrip("/") + "/"


def twitter_handle(value: str | None) -> str | None:
    if not value:
        return None
    parsed = urlparse(value if "://" in value else f"https://x.com/{value}")
    if parsed.netloc.casefold() not in {"x.com", "www.x.com", "twitter.com", "www.twitter.com"}:
        raise ValueError("Invalid X profile URL")
    parts = parsed.path.strip("/").split("/")
    return parts[0].lstrip("@") if parts and parts[0] else None
