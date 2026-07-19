import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


Classification = Literal[
    "accomplisher",
    "leader",
    "dev",
    "engineer",
    "fighter",
    "operator",
]


class PersonalityScores(BaseModel):
    agreeableness: float = Field(ge=0, le=5)
    conscientiousness: float = Field(ge=0, le=5)
    extraversion: float = Field(ge=0, le=5)
    emotional_stability: float = Field(ge=0, le=5)
    openness: float = Field(ge=0, le=5)
    classification: Classification
    confidence: float = Field(ge=0, le=1)
    summary: str = Field(min_length=1, max_length=240)
    rationale: str = Field(min_length=1, max_length=800)


class PersonalityAnalysisResponse(PersonalityScores):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    founder_score: int | None = Field(default=None, ge=0, le=100)
    founder_score_components: dict[str, dict[str, Any]] | None = None
    model: str
    openai_response_id: str | None
    input_tokens: int | None
    output_tokens: int | None
    source_summary: dict[str, int]
    created_at: datetime
