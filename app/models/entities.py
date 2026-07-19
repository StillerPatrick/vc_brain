import enum
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class JobStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ApplicationStatus(str, enum.Enum):
    processing = "processing"
    completed = "completed"
    partial = "partial"
    failed = "failed"


class MetadataStatus(str, enum.Enum):
    processing = "processing"
    completed = "completed"
    failed = "failed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    display_name: Mapped[str | None] = mapped_column(String(255))
    github_handle: Mapped[str | None] = mapped_column(String(255), index=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(1024), index=True)
    twitter_handle: Mapped[str | None] = mapped_column(String(255), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    jobs: Mapped[list["ScrapeJob"]] = relationship(back_populates="user")
    github_data: Mapped[list["GitHubData"]] = relationship(back_populates="user")
    linkedin_data: Mapped[list["LinkedInData"]] = relationship(back_populates="user")
    twitter_data: Mapped[list["TwitterData"]] = relationship(back_populates="user")
    personality_analyses: Mapped[list["PersonalityAnalysis"]] = relationship(
        back_populates="user"
    )
    application_memberships: Mapped[list["ApplicationFounder"]] = relationship(
        back_populates="user"
    )


class ScrapeJob(Base):
    __tablename__ = "scrape_jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, native_enum=False), default=JobStatus.pending, index=True
    )
    platforms: Mapped[list[str]] = mapped_column(JSON)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="jobs")
    github_data: Mapped[list["GitHubData"]] = relationship(back_populates="job")
    linkedin_data: Mapped[list["LinkedInData"]] = relationship(back_populates="job")
    twitter_data: Mapped[list["TwitterData"]] = relationship(back_populates="job")


class PlatformDataMixin:
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("scrape_jobs.id", ondelete="CASCADE"), index=True
    )
    payload: Mapped[dict[str, Any] | list[Any]] = mapped_column(JSON)
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class GitHubData(PlatformDataMixin, Base):
    __tablename__ = "github_data"

    user: Mapped[User] = relationship(back_populates="github_data")
    job: Mapped[ScrapeJob] = relationship(back_populates="github_data")


class LinkedInData(PlatformDataMixin, Base):
    __tablename__ = "linkedin_data"

    user: Mapped[User] = relationship(back_populates="linkedin_data")
    job: Mapped[ScrapeJob] = relationship(back_populates="linkedin_data")


class TwitterData(PlatformDataMixin, Base):
    __tablename__ = "twitter_data"

    user: Mapped[User] = relationship(back_populates="twitter_data")
    job: Mapped[ScrapeJob] = relationship(back_populates="twitter_data")


class PersonalityAnalysis(Base):
    __tablename__ = "personality_analyses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    agreeableness: Mapped[float] = mapped_column(Float)
    conscientiousness: Mapped[float] = mapped_column(Float)
    extraversion: Mapped[float] = mapped_column(Float)
    emotional_stability: Mapped[float] = mapped_column(Float)
    openness: Mapped[float] = mapped_column(Float)
    classification: Mapped[str] = mapped_column(String(32), index=True)
    confidence: Mapped[float] = mapped_column(Float)
    summary: Mapped[str] = mapped_column(Text)
    rationale: Mapped[str] = mapped_column(Text)
    model: Mapped[str] = mapped_column(String(255))
    openai_response_id: Mapped[str | None] = mapped_column(String(255))
    input_tokens: Mapped[int | None] = mapped_column(Integer)
    output_tokens: Mapped[int | None] = mapped_column(Integer)
    source_summary: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    user: Mapped[User] = relationship(back_populates="personality_analyses")


class StartupApplication(Base):
    __tablename__ = "startup_applications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company: Mapped[str] = mapped_column(String(255), index=True)
    one_liner: Mapped[str | None] = mapped_column(String(1000))
    sector: Mapped[str | None] = mapped_column(String(255), index=True)
    location: Mapped[str | None] = mapped_column(String(255))
    deck_filename: Mapped[str | None] = mapped_column(String(512))
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus, native_enum=False),
        default=ApplicationStatus.processing,
        index=True,
    )
    team_categorization: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    founders: Mapped[list["ApplicationFounder"]] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="ApplicationFounder.position",
    )
    startup_metadata: Mapped["StartupMetadata | None"] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
        uselist=False,
    )


class StartupMetadata(Base):
    __tablename__ = "startup_metadata"
    __table_args__ = (UniqueConstraint("application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("startup_applications.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[MetadataStatus] = mapped_column(
        Enum(MetadataStatus, native_enum=False),
        default=MetadataStatus.processing,
        index=True,
    )
    company_name: Mapped[str | None] = mapped_column(String(255))
    summary_sentences: Mapped[list[str] | None] = mapped_column(JSON)
    deck_filename: Mapped[str] = mapped_column(String(512))
    deck_content_type: Mapped[str] = mapped_column(String(100), default="application/pdf")
    deck_data: Mapped[bytes] = mapped_column(LargeBinary)
    first_slide_data: Mapped[bytes | None] = mapped_column(LargeBinary)
    first_slide_content_type: Mapped[str | None] = mapped_column(String(100))
    model: Mapped[str | None] = mapped_column(String(255))
    openai_response_id: Mapped[str | None] = mapped_column(String(255))
    input_tokens: Mapped[int | None] = mapped_column(Integer)
    output_tokens: Mapped[int | None] = mapped_column(Integer)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    application: Mapped[StartupApplication] = relationship(
        back_populates="startup_metadata"
    )


class ApplicationFounder(Base):
    __tablename__ = "application_founders"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("startup_applications.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    scrape_job_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("scrape_jobs.id", ondelete="SET NULL"), index=True
    )
    personality_analysis_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("personality_analyses.id", ondelete="SET NULL"), index=True
    )
    role: Mapped[str | None] = mapped_column(String(255))
    about: Mapped[str | None] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer)

    application: Mapped[StartupApplication] = relationship(back_populates="founders")
    user: Mapped[User] = relationship(back_populates="application_memberships")
    scrape_job: Mapped[ScrapeJob | None] = relationship()
    personality_analysis: Mapped[PersonalityAnalysis | None] = relationship()
