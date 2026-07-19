"""Background workflow for a founder without an attached startup."""

import logging
import uuid
from datetime import datetime, timezone

from app.db.session import AsyncSessionLocal
from app.models.entities import JobStatus, ScrapeJob, User
from app.services.analysis_workflow import analyze_and_store
from app.services.orchestrator import ScrapeTargets, run_scrape_job

logger = logging.getLogger(__name__)


async def process_founder_score(
    job_id: uuid.UUID, user_id: uuid.UUID, targets: ScrapeTargets
) -> None:
    """Collect public data first, then produce the individual founder score."""
    scrape_failures = await run_scrape_job(
        job_id, user_id, targets, finalize_job=False
    )
    async with AsyncSessionLocal() as session:
        job = await session.get(ScrapeJob, job_id)
        user = await session.get(User, user_id)
        if job is None or user is None:
            return
        try:
            await analyze_and_store(session, user)
            job.status = JobStatus.failed if scrape_failures else JobStatus.completed
            job.completed_at = datetime.now(timezone.utc)
            await session.commit()
        except Exception as exc:  # Background task must record a retrievable failure.
            logger.exception("Founder score analysis failed for user %s", user_id)
            job.status = JobStatus.failed
            existing_error = f"{job.error}; " if job.error else ""
            job.error = f"{existing_error}{exc}"[:4000]
            job.completed_at = datetime.now(timezone.utc)
            await session.commit()
