import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.entities import MetadataStatus


class ExtractedStartupMetadata(BaseModel):
    company_name: str = Field(
        min_length=1,
        max_length=255,
        description="The startup's company or product name exactly as presented in the deck.",
    )
    summary_sentences: list[str] = Field(
        min_length=3,
        max_length=3,
        description=(
            "Exactly three concise factual sentences describing the problem, solution, "
            "customer, business, and traction using only information in the pitch deck."
        ),
    )


class StartupMetadataAcceptedResponse(BaseModel):
    message: str = "Pitch deck stored; metadata extraction has started."
    application_id: uuid.UUID
    metadata_id: uuid.UUID
    status: MetadataStatus = MetadataStatus.processing


class StartupMetadataResponse(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    status: MetadataStatus
    company_name: str | None
    summary_sentences: list[str] | None
    deck_filename: str
    deck_content_type: str
    deck_available: bool
    first_slide_available: bool
    model: str | None
    error: str | None
    created_at: datetime
    completed_at: datetime | None

