import asyncio
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.entities import (
    GitHubData,
    JobStatus,
    LinkedInData,
    LinkedInProfileData,
    ScrapeJob,
    TwitterData,
    User,
)
from app.services.apify import ApifyService
from app.services.github import GitHubService
from app.services.linkedin_cv import derive_cv
from app.services.twitter import TwitterPlaywrightService

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ScrapeTargets:
    github_handle: str | None = None
    linkedin_url: str | None = None
    twitter_handle: str | None = None
    linkedin_options: dict[str, Any] | None = None
    twitter_max_items: int = 20


async def run_scrape_job(job_id: uuid.UUID, user_id: uuid.UUID, targets: ScrapeTargets) -> None:
    tasks: list[asyncio.Task[None]] = []
    if targets.github_handle:
        tasks.append(asyncio.create_task(_scrape_github(job_id, user_id, targets.github_handle)))
    if targets.linkedin_url:
        tasks.append(
            asyncio.create_task(
                _scrape_linkedin(
                    job_id,
                    user_id,
                    targets.linkedin_url,
                    targets.linkedin_options or {},
                )
            )
        )
        tasks.append(
            asyncio.create_task(
                _scrape_linkedin_profile(job_id, user_id, targets.linkedin_url)
            )
        )
    if targets.twitter_handle:
        tasks.append(
            asyncio.create_task(
                _scrape_twitter(
                    job_id, user_id, targets.twitter_handle, targets.twitter_max_items
                )
            )
        )

    results = await asyncio.gather(*tasks, return_exceptions=True)
    failures = [result for result in results if isinstance(result, BaseException)]
    for failure in failures:
        logger.error("Scrape job %s platform failure: %s", job_id, failure)

    async with AsyncSessionLocal() as session:
        job = await session.get(ScrapeJob, job_id)
        if job is None:
            logger.error("Scrape job %s disappeared before completion", job_id)
            return
        job.completed_at = datetime.now(timezone.utc)
        if failures:
            job.status = JobStatus.failed
            job.error = "; ".join(str(failure) for failure in failures)[:4000]
        else:
            job.status = JobStatus.completed
            job.error = None
        await session.commit()


async def _scrape_github(job_id: uuid.UUID, user_id: uuid.UUID, handle: str) -> None:
    payload = await GitHubService().scrape_user(handle)
    await _store(GitHubData, job_id, user_id, payload)


async def _scrape_linkedin(
    job_id: uuid.UUID,
    user_id: uuid.UUID,
    profile_url: str,
    options: dict[str, Any],
) -> None:
    payload = await ApifyService().scrape_linkedin_posts(profile_url, **options)
    await _store(LinkedInData, job_id, user_id, payload)


async def _scrape_linkedin_profile(
    job_id: uuid.UUID,
    user_id: uuid.UUID,
    profile_url: str,
) -> None:
    payload = await ApifyService().scrape_linkedin_profile(profile_url)
    await _store(LinkedInProfileData, job_id, user_id, payload)
    cv = derive_cv(payload)
    async with AsyncSessionLocal() as session:
        user = await session.get(User, user_id)
        if user is None:
            return
        for field, value in cv.items():
            setattr(user, field, value)
        user.cv_scraped_at = datetime.now(timezone.utc)
        await session.commit()


async def _scrape_twitter(
    job_id: uuid.UUID,
    user_id: uuid.UUID,
    handle: str,
    max_items: int,
) -> None:
    payload = await TwitterPlaywrightService().scrape_user(handle, max_items=max_items)
    await _store(TwitterData, job_id, user_id, payload)


async def _store(
    model: type[GitHubData]
    | type[LinkedInData]
    | type[LinkedInProfileData]
    | type[TwitterData],
    job_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: dict[str, Any] | list[Any],
) -> None:
    async with AsyncSessionLocal() as session:
        existing = await session.scalar(
            select(model).where(model.job_id == job_id, model.user_id == user_id)
        )
        if existing is None:
            session.add(model(job_id=job_id, user_id=user_id, payload=payload))
        else:
            existing.payload = payload
            existing.scraped_at = datetime.now(timezone.utc)
        await session.commit()
