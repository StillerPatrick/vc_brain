import asyncio
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import AsyncSessionLocal
from app.models.entities import (
    ApplicationFounder,
    ApplicationStatus,
    JobStatus,
    MetadataStatus,
    PersonalityAnalysis,
    ScrapeJob,
    StartupApplication,
    StartupMetadata,
    User,
)
from app.services.analysis_workflow import analyze_and_store
from app.services.commitment import assess_startup_commitment
from app.services.exceptions import IntegrationError
from app.services.orchestrator import ScrapeTargets, run_scrape_job
from app.services.team import categorize_team
from app.services.team_score import adjust_team_score, base_score, compute_score_components

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class FounderWorkItem:
    founder_id: uuid.UUID
    user_id: uuid.UUID
    job_id: uuid.UUID
    targets: ScrapeTargets


async def process_application(
    application_id: uuid.UUID, work_items: list[FounderWorkItem]
) -> None:
    scrape_results = await asyncio.gather(
        *(
            run_scrape_job(item.job_id, item.user_id, item.targets)
            for item in work_items
        ),
        return_exceptions=True,
    )

    analysis_results = await asyncio.gather(
        *(_analyze_founder(item.founder_id) for item in work_items),
        return_exceptions=True,
    )
    analysis_errors = [
        str(result)
        for result in [*scrape_results, *analysis_results]
        if isinstance(result, Exception)
    ]
    await _finalize_application(application_id, analysis_errors)


async def _analyze_founder(founder_id: uuid.UUID) -> uuid.UUID:
    async with AsyncSessionLocal() as session:
        founder = await session.get(ApplicationFounder, founder_id)
        if founder is None:
            raise RuntimeError(f"Application founder {founder_id} disappeared")
        user = await session.get(User, founder.user_id)
        if user is None:
            raise RuntimeError(f"Founder user {founder.user_id} disappeared")

        # Commitment needs the LinkedIn CV; without it there is no signal.
        # The CV scrape has already finished here (all scrape jobs are awaited
        # before analysis), but the deck-based company assessment runs
        # concurrently — wait for it so the prompt sees its output.
        if user.cv_scraped_at is not None:
            application = await session.get(StartupApplication, founder.application_id)
            company_name, summary = await _await_company_assessment(
                session, founder.application_id
            )
            try:
                assessment = await assess_startup_commitment(
                    company=company_name
                    or (application.company if application else ""),
                    summary=summary
                    or (application.one_liner if application else None),
                    user=user,
                )
                founder.startup_commitment = assessment.commitment
                founder.commitment_rationale = assessment.rationale
                await session.commit()
            except IntegrationError as exc:
                logger.warning(
                    "Commitment assessment failed for founder %s: %s", founder_id, exc
                )

        analysis = await analyze_and_store(
            session,
            user,
            application_context={
                "role": founder.role,
                "founder_supplied_about": founder.about,
            },
        )
        founder.personality_analysis_id = analysis.id
        await session.commit()
        return analysis.id


async def _await_company_assessment(
    session, application_id: uuid.UUID
) -> tuple[str | None, str | None]:
    """Block until the deck-based company assessment finishes (when one is
    running) and return its extracted company name and summary. No metadata
    row means no deck was uploaded — return immediately. Times out after
    ~3 minutes and falls back to the submitted fields."""
    for _ in range(60):
        row = (
            await session.execute(
                select(
                    StartupMetadata.status,
                    StartupMetadata.company_name,
                    StartupMetadata.summary_sentences,
                ).where(StartupMetadata.application_id == application_id)
            )
        ).first()
        if row is None:
            return None, None
        status, company_name, sentences = row
        if status != MetadataStatus.processing:
            return company_name, " ".join(sentences) if sentences else None
        await asyncio.sleep(3)
    logger.warning(
        "Company assessment for application %s still running after timeout; "
        "assessing commitment from submitted fields",
        application_id,
    )
    return None, None


async def _finalize_application(
    application_id: uuid.UUID, analysis_errors: list[str]
) -> None:
    async with AsyncSessionLocal() as session:
        application = await session.scalar(
            select(StartupApplication)
            .where(StartupApplication.id == application_id)
            .options(selectinload(StartupApplication.founders))
        )
        if application is None:
            return

        analyses: list[PersonalityAnalysis] = []
        founder_contexts: list[dict] = []
        job_failures: list[str] = []
        for founder in application.founders:
            analysis = (
                await session.get(PersonalityAnalysis, founder.personality_analysis_id)
                if founder.personality_analysis_id
                else None
            )
            if analysis:
                analyses.append(analysis)
                founder_contexts.append(
                    {
                        "role": founder.role,
                        "archetype": analysis.classification,
                        "cv_summary": analysis.summary,
                        "commitment": founder.startup_commitment,
                    }
                )
            if founder.scrape_job_id:
                job = await session.get(ScrapeJob, founder.scrape_job_id)
                if job and job.status == JobStatus.failed:
                    job_failures.append(f"{founder.user_id}: {job.error or 'scrape failed'}")

        categorization = categorize_team(analyses)
        if analyses:
            components = compute_score_components(categorization, analyses)
            base = base_score(components)
            try:
                adjusted = await adjust_team_score(
                    company=application.company,
                    base=base,
                    components=components,
                    founders=founder_contexts,
                )
                score, rationale = adjusted.score, adjusted.rationale
            except IntegrationError as exc:
                logger.warning(
                    "Team score adjustment failed for application %s: %s",
                    application_id,
                    exc,
                )
                score, rationale = base, None
            categorization.update(
                {
                    "team_score": score,
                    "team_score_base": base,
                    "team_score_components": components,
                    "team_score_rationale": rationale,
                }
            )
        application.team_categorization = categorization
        errors = job_failures + analysis_errors
        if len(analyses) == len(application.founders) and not job_failures:
            application.status = ApplicationStatus.completed
        elif analyses:
            application.status = ApplicationStatus.partial
        else:
            application.status = ApplicationStatus.failed
        application.error = "; ".join(errors)[:4000] if errors else None
        application.completed_at = datetime.now(timezone.utc)
        await session.commit()
