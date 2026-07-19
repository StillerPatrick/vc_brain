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

    # CV fields derived from the LinkedIn profile scrape (raw payload lives in
    # linkedin_profile_data). Updated in place on re-scrape.
    headline: Mapped[str | None] = mapped_column(String(512))
    location_text: Mapped[str | None] = mapped_column(String(255))
    country_code: Mapped[str | None] = mapped_column(String(8))
    current_position: Mapped[str | None] = mapped_column(String(255))
    current_company: Mapped[str | None] = mapped_column(String(255))
    years_experience: Mapped[float | None] = mapped_column(Float)
    highest_degree: Mapped[str | None] = mapped_column(String(255))
    field_of_study: Mapped[str | None] = mapped_column(String(255))
    experience: Mapped[list[Any] | None] = mapped_column(JSON)
    education: Mapped[list[Any] | None] = mapped_column(JSON)
    skills: Mapped[list[Any] | None] = mapped_column(JSON)
    connections_count: Mapped[int | None] = mapped_column(Integer)
    follower_count: Mapped[int | None] = mapped_column(Integer)
    cv_scraped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    jobs: Mapped[list["ScrapeJob"]] = relationship(back_populates="user")
    github_data: Mapped[list["GitHubData"]] = relationship(back_populates="user")
    linkedin_data: Mapped[list["LinkedInData"]] = relationship(back_populates="user")
    linkedin_profile_data: Mapped[list["LinkedInProfileData"]] = relationship(
        back_populates="user"
    )
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
    linkedin_profile_data: Mapped[list["LinkedInProfileData"]] = relationship(
        back_populates="job"
    )
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


class LinkedInProfileData(PlatformDataMixin, Base):
    __tablename__ = "linkedin_profile_data"

    user: Mapped[User] = relationship(back_populates="linkedin_profile_data")
    job: Mapped[ScrapeJob] = relationship(back_populates="linkedin_profile_data")


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
    tam: Mapped[float | None] = mapped_column(Float)
    sam: Mapped[float | None] = mapped_column(Float)
    som: Mapped[float | None] = mapped_column(Float)
    estimated_tam: Mapped[float | None] = mapped_column(Float)
    estimated_sam: Mapped[float | None] = mapped_column(Float)
    estimated_som: Mapped[float | None] = mapped_column(Float)
    market_sizing: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    market_score: Mapped[int | None] = mapped_column(Integer)
    market_metric: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    product_reality_check: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    product_market_fit_score: Mapped[int | None] = mapped_column(Integer)
    product_market_fit_metric: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    swot_strengths: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    swot_weaknesses: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    swot_opportunities: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    swot_threats: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    competitors: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    investment_hypotheses: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    traction_kpis: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    research_status: Mapped[MetadataStatus] = mapped_column(
        Enum(MetadataStatus, native_enum=False),
        default=MetadataStatus.processing,
        index=True,
    )
    research_model: Mapped[str | None] = mapped_column(String(255))
    research_response_id: Mapped[str | None] = mapped_column(String(255))
    research_error: Mapped[str | None] = mapped_column(Text)
    research_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    research_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
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
    research_sources: Mapped[list["StartupResearchSource"]] = relationship(
        back_populates="startup_metadata",
        cascade="all, delete-orphan",
        order_by="StartupResearchSource.position",
    )


class StartupResearchSource(Base):
    __tablename__ = "startup_research_sources"
    __table_args__ = (UniqueConstraint("metadata_id", "url"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    metadata_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("startup_metadata.id", ondelete="CASCADE"), index=True
    )
    url: Mapped[str] = mapped_column(String(2048))
    title: Mapped[str] = mapped_column(String(512))
    domain: Mapped[str] = mapped_column(String(255))
    favicon_url: Mapped[str | None] = mapped_column(String(2048))
    excerpt: Mapped[str | None] = mapped_column(Text)
    supports: Mapped[list[str]] = mapped_column(JSON)
    position: Mapped[int] = mapped_column(Integer)
    accessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    startup_metadata: Mapped[StartupMetadata] = relationship(
        back_populates="research_sources"
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
    # LLM-assessed time commitment to this startup: full_time | part_time | side_project
    startup_commitment: Mapped[str | None] = mapped_column(String(32))
    commitment_rationale: Mapped[str | None] = mapped_column(Text)

    application: Mapped[StartupApplication] = relationship(back_populates="founders")
    user: Mapped[User] = relationship(back_populates="application_memberships")
    scrape_job: Mapped[ScrapeJob | None] = relationship()
    personality_analysis: Mapped[PersonalityAnalysis | None] = relationship()
