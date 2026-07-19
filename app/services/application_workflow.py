import asyncio
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
    PersonalityAnalysis,
    ScrapeJob,
    StartupApplication,
    User,
)
from app.services.analysis_workflow import analyze_and_store
from app.services.orchestrator import ScrapeTargets, run_scrape_job
from app.services.team import categorize_team


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
        job_failures: list[str] = []
        for founder in application.founders:
            analysis = (
                await session.get(PersonalityAnalysis, founder.personality_analysis_id)
                if founder.personality_analysis_id
                else None
            )
            if analysis:
                analyses.append(analysis)
            if founder.scrape_job_id:
                job = await session.get(ScrapeJob, founder.scrape_job_id)
                if job and job.status == JobStatus.failed:
                    job_failures.append(f"{founder.user_id}: {job.error or 'scrape failed'}")

        application.team_categorization = categorize_team(analyses)
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
