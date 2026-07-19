import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, model_validator

from app.models.entities import MetadataStatus, StartupMetadata


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
    tam: float | None = Field(
        description=(
            "The Total Addressable Market as an absolute numeric amount, expanding "
            "abbreviations such as 1.5B to 1500000000. Null if not stated."
        ),
    )
    sam: float | None = Field(
        description=(
            "The Serviceable Addressable Market as an absolute numeric amount, "
            "expanding abbreviations. Null if not stated."
        ),
    )
    som: float | None = Field(
        description=(
            "The Serviceable Obtainable Market as an absolute numeric amount, "
            "expanding abbreviations. Null if not stated."
        ),
    )


class SourcedInsight(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    source_urls: list[HttpUrl] = Field(min_length=1, max_length=5)
    impact: Literal["high", "medium", "low"] = "medium"


class MarketEstimate(BaseModel):
    value_usd: float | None = Field(default=None, ge=0)
    rationale: str = Field(min_length=1, max_length=2000)
    source_urls: list[HttpUrl] = Field(default_factory=list, max_length=8)


class MetricComponent(BaseModel):
    key: str
    label: str
    score: float = Field(ge=0)
    max_score: int = Field(gt=0)
    explanation: str


class MarketMetric(BaseModel):
    score: int = Field(ge=0, le=100)
    investment_amount_eur: int = Field(gt=0)
    investment_threshold: int = Field(ge=0, le=100)
    worth_investing: bool
    rationale: str
    components: list[MetricComponent]


class MethodologySource(BaseModel):
    title: str
    url: HttpUrl


class ProductRealityCheck(BaseModel):
    innovation: str = Field(min_length=1, max_length=1000)
    rationale: str = Field(min_length=1, max_length=1000)
    score: int = Field(ge=0, le=100)
    source_urls: list[HttpUrl] = Field(min_length=1, max_length=5)


class ProductMarketFitMetric(BaseModel):
    score: int = Field(ge=0, le=100)
    threshold: int = Field(ge=0, le=100)
    verdict: Literal["Strong fit evidence", "Promising, not proven", "Fit unproven"]
    passes_threshold: bool
    rationale: str
    components: list[MetricComponent]
    methodology_sources: list[MethodologySource]


class ResearchedCompetitor(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    website_url: HttpUrl
    differentiation: str = Field(min_length=1, max_length=1000)
    threat: Literal["high", "medium", "low"]
    source_urls: list[HttpUrl] = Field(min_length=1, max_length=5)


class InvestmentHypothesis(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    source_urls: list[HttpUrl] = Field(min_length=1, max_length=5)


class TractionKPI(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    trust: Literal["verified", "reported", "contradicted"]
    confidence: int = Field(ge=0, le=100)
    source_urls: list[HttpUrl] = Field(min_length=1, max_length=5)


class StartupResearchResult(BaseModel):
    tam: MarketEstimate
    sam: MarketEstimate
    som: MarketEstimate
    strengths: list[SourcedInsight] = Field(min_length=1, max_length=2)
    weaknesses: list[SourcedInsight] = Field(min_length=1, max_length=2)
    opportunities: list[SourcedInsight] = Field(min_length=1, max_length=2)
    threats: list[SourcedInsight] = Field(min_length=1, max_length=2)
    competitors: list[ResearchedCompetitor] = Field(min_length=1, max_length=3)
    investment_hypotheses: list[InvestmentHypothesis] = Field(
        min_length=2, max_length=3
    )
    traction_kpis: list[TractionKPI] = Field(default_factory=list, max_length=6)
    reality_check: ProductRealityCheck

    @model_validator(mode="after")
    def require_sourced_market_estimates(self):
        for label, estimate in (("TAM", self.tam), ("SAM", self.sam), ("SOM", self.som)):
            if estimate.value_usd is None or estimate.value_usd <= 0:
                raise ValueError(f"{label} must contain a positive USD estimate")
            if not estimate.source_urls:
                raise ValueError(f"{label} must cite at least one source")
            if len(estimate.rationale.split()) > 35:
                raise ValueError(f"{label} rationale must be at most 35 words")
        for quadrant in (
            self.strengths,
            self.weaknesses,
            self.opportunities,
            self.threats,
        ):
            if any(len(item.text.split()) > 25 for item in quadrant):
                raise ValueError("Each SWOT item must be at most 25 words")
        if any(
            len(item.differentiation.split()) > 25 for item in self.competitors
        ):
            raise ValueError("Competitor differentiation must be at most 25 words")
        if any(
            len(item.text.split()) > 30 for item in self.investment_hypotheses
        ):
            raise ValueError("Each investment hypothesis must be at most 30 words")
        if len(self.reality_check.rationale.split()) > 40:
            raise ValueError("Reality-check rationale must be at most 40 words")
        return self


class StartupResearchSourceResponse(BaseModel):
    id: uuid.UUID
    url: str
    title: str
    domain: str
    favicon_url: str | None
    excerpt: str | None
    supports: list[str]
    accessed_at: datetime


class StartupMetadataAcceptedResponse(BaseModel):
    message: str = "Pitch deck stored; metadata extraction has started."
    application_id: uuid.UUID
    metadata_id: uuid.UUID
    status: MetadataStatus = MetadataStatus.processing


class StartupResearchAcceptedResponse(BaseModel):
    message: str = "Startup web research has started."
    application_id: uuid.UUID
    metadata_id: uuid.UUID
    status: MetadataStatus = MetadataStatus.processing


class StartupMetadataResponse(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    status: MetadataStatus
    company_name: str | None
    summary_sentences: list[str] | None
    tam: float | None
    sam: float | None
    som: float | None
    estimated_tam: float | None
    estimated_sam: float | None
    estimated_som: float | None
    market_sizing: dict[str, MarketEstimate] | None
    market_score: int | None
    market_metric: MarketMetric | None
    product_reality_check: ProductRealityCheck | None
    product_market_fit_score: int | None
    product_market_fit_metric: ProductMarketFitMetric | None
    swot_strengths: list[SourcedInsight] | None
    swot_weaknesses: list[SourcedInsight] | None
    swot_opportunities: list[SourcedInsight] | None
    swot_threats: list[SourcedInsight] | None
    competitors: list[ResearchedCompetitor] | None
    investment_hypotheses: list[InvestmentHypothesis] | None
    traction_kpis: list[TractionKPI] | None
    research_status: MetadataStatus
    research_model: str | None
    research_error: str | None
    research_completed_at: datetime | None
    research_started_at: datetime | None
    research_sources: list[StartupResearchSourceResponse]
    deck_filename: str
    deck_content_type: str
    deck_available: bool
    first_slide_available: bool
    model: str | None
    error: str | None
    created_at: datetime
    completed_at: datetime | None


def startup_metadata_response(record: StartupMetadata) -> StartupMetadataResponse:
    return StartupMetadataResponse(
        id=record.id,
        application_id=record.application_id,
        status=record.status,
        company_name=record.company_name,
        summary_sentences=record.summary_sentences,
        tam=record.tam,
        sam=record.sam,
        som=record.som,
        estimated_tam=record.estimated_tam,
        estimated_sam=record.estimated_sam,
        estimated_som=record.estimated_som,
        market_sizing=record.market_sizing,
        market_score=record.market_score,
        market_metric=record.market_metric,
        product_reality_check=record.product_reality_check,
        product_market_fit_score=record.product_market_fit_score,
        product_market_fit_metric=record.product_market_fit_metric,
        swot_strengths=record.swot_strengths,
        swot_weaknesses=record.swot_weaknesses,
        swot_opportunities=record.swot_opportunities,
        swot_threats=record.swot_threats,
        competitors=record.competitors,
        investment_hypotheses=record.investment_hypotheses,
        traction_kpis=record.traction_kpis,
        research_status=record.research_status,
        research_model=record.research_model,
        research_error=record.research_error,
        research_completed_at=record.research_completed_at,
        research_started_at=record.research_started_at,
        research_sources=[
            StartupResearchSourceResponse(
                id=source.id,
                url=source.url,
                title=source.title,
                domain=source.domain,
                favicon_url=source.favicon_url,
                excerpt=source.excerpt,
                supports=source.supports,
                accessed_at=source.accessed_at,
            )
            for source in record.research_sources
        ],
        deck_filename=record.deck_filename,
        deck_content_type=record.deck_content_type,
        deck_available=bool(record.deck_data),
        first_slide_available=record.first_slide_data is not None,
        model=record.model,
        error=record.error,
        created_at=record.created_at,
        completed_at=record.completed_at,
    )
