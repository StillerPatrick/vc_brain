import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.entities import (
    GitHubData,
    LinkedInData,
    PersonalityAnalysis,
    TwitterData,
    User,
)
from app.services.personality import PersonalityAnalysisService, build_compact_evidence


async def analyze_and_store(
    session: AsyncSession,
    user: User,
    *,
    application_context: dict[str, Any] | None = None,
) -> PersonalityAnalysis:
    github_rows = await _platform_rows(session, GitHubData, user.id)
    linkedin_rows = await _platform_rows(session, LinkedInData, user.id)
    twitter_rows = await _platform_rows(session, TwitterData, user.id)
    if not github_rows and not linkedin_rows and not twitter_rows:
        raise ValueError("User has no scraped data to analyze")

    evidence, source_summary = build_compact_evidence(
        user, github_rows, linkedin_rows, twitter_rows
    )
    if application_context:
        evidence["application_context"] = application_context

    run = await PersonalityAnalysisService().analyze_evidence(evidence)
    scores = run.scores
    record = PersonalityAnalysis(
        user_id=user.id,
        agreeableness=scores.agreeableness,
        conscientiousness=scores.conscientiousness,
        extraversion=scores.extraversion,
        emotional_stability=scores.emotional_stability,
        openness=scores.openness,
        classification=scores.classification,
        confidence=scores.confidence,
        summary=scores.summary,
        rationale=scores.rationale,
        model=settings.openai_model,
        openai_response_id=run.response_id,
        input_tokens=run.input_tokens,
        output_tokens=run.output_tokens,
        source_summary=source_summary,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


async def latest_analysis(
    session: AsyncSession, user_id: uuid.UUID
) -> PersonalityAnalysis | None:
    return await session.scalar(
        select(PersonalityAnalysis)
        .where(PersonalityAnalysis.user_id == user_id)
        .order_by(PersonalityAnalysis.created_at.desc())
        .limit(1)
    )


async def _platform_rows(session: AsyncSession, model, user_id: uuid.UUID):
    result = await session.scalars(
        select(model).where(model.user_id == user_id).order_by(model.scraped_at.desc())
    )
    return list(result)
