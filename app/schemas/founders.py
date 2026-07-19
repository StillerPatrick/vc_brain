import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator

from app.models.entities import JobStatus
from app.schemas.analysis import PersonalityAnalysisResponse


class FounderScoreRequest(BaseModel):
    """Profiles are sufficient; startup and pitch-deck fields are optional by design."""

    name: str | None = Field(default=None, max_length=255)
    github: str | None = Field(default=None, max_length=1000)
    linkedin: str | None = Field(default=None, max_length=1000)
    x: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def require_public_profile(self):
        self.name = self.name.strip() if self.name else None
        self.github = self.github.strip() if self.github else None
        self.linkedin = self.linkedin.strip() if self.linkedin else None
        self.x = self.x.strip() if self.x else None
        if not any((self.github, self.linkedin, self.x)):
            raise ValueError("At least one GitHub, LinkedIn, or X profile is required")
        return self


class FounderScoreAcceptedResponse(BaseModel):
    message: str = "Founder research started; the score will be stored when analysis completes."
    user_id: uuid.UUID
    job_id: uuid.UUID
    status: JobStatus = JobStatus.processing


class FounderScoreResponse(BaseModel):
    user_id: uuid.UUID
    name: str | None
    job_id: uuid.UUID | None
    job_status: JobStatus | None
    job_error: str | None
    analysis: PersonalityAnalysisResponse | None
    founder_score: int | None
    components: dict[str, dict[str, Any]] | None
    updated_at: datetime | None
