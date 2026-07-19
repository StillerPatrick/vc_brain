import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.entities import JobStatus, ScrapeJob, User
from app.schemas.scraping import (
    GitHubScrapeRequest,
    LinkedInScrapeRequest,
    ScrapeAcceptedResponse,
    ScrapeAllRequest,
    TwitterScrapeRequest,
)
from app.services.orchestrator import ScrapeTargets, run_scrape_job

router = APIRouter()


@router.post(
    "/github",
    response_model=ScrapeAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def scrape_github(
    request: GitHubScrapeRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> ScrapeAcceptedResponse:
    user, job = await _create_user_and_job(
        session,
        user_id=request.user_id,
        display_name=request.display_name,
        platforms=["github"],
        github_handle=request.handle,
    )
    background_tasks.add_task(
        run_scrape_job,
        job.id,
        user.id,
        ScrapeTargets(github_handle=request.handle),
    )
    return ScrapeAcceptedResponse(job_id=job.id)


@router.post(
    "/linkedin",
    response_model=ScrapeAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def scrape_linkedin(
    request: LinkedInScrapeRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> ScrapeAcceptedResponse:
    profile_url = str(request.profile_url)
    user, job = await _create_user_and_job(
        session,
        user_id=request.user_id,
        display_name=request.display_name,
        platforms=["linkedin"],
        linkedin_url=profile_url,
    )
    background_tasks.add_task(
        run_scrape_job,
        job.id,
        user.id,
        ScrapeTargets(
            linkedin_url=profile_url,
            linkedin_options={
                "max_posts": request.max_posts,
                "include_reposts": request.include_reposts,
                "max_comments": request.max_comments,
                "max_reactions": request.max_reactions,
            },
        ),
    )
    return ScrapeAcceptedResponse(job_id=job.id)


@router.post(
    "/twitter",
    response_model=ScrapeAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def scrape_twitter(
    request: TwitterScrapeRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> ScrapeAcceptedResponse:
    user, job = await _create_user_and_job(
        session,
        user_id=request.user_id,
        display_name=request.display_name,
        platforms=["twitter"],
        twitter_handle=request.handle,
    )
    background_tasks.add_task(
        run_scrape_job,
        job.id,
        user.id,
        ScrapeTargets(twitter_handle=request.handle, twitter_max_items=request.max_items),
    )
    return ScrapeAcceptedResponse(job_id=job.id)


@router.post(
    "/all",
    response_model=ScrapeAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def scrape_all(
    request: ScrapeAllRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> ScrapeAcceptedResponse:
    linkedin_url = str(request.linkedin_url)
    user, job = await _create_user_and_job(
        session,
        user_id=request.user_id,
        display_name=request.display_name,
        platforms=["github", "linkedin", "twitter"],
        github_handle=request.github_handle,
        linkedin_url=linkedin_url,
        twitter_handle=request.twitter_handle,
    )
    background_tasks.add_task(
        run_scrape_job,
        job.id,
        user.id,
        ScrapeTargets(
            github_handle=request.github_handle,
            linkedin_url=linkedin_url,
            twitter_handle=request.twitter_handle,
            linkedin_options={"max_posts": request.linkedin_max_posts},
            twitter_max_items=request.twitter_max_items,
        ),
    )
    return ScrapeAcceptedResponse(job_id=job.id)


async def _create_user_and_job(
    session: AsyncSession,
    *,
    user_id: uuid.UUID | None,
    display_name: str | None,
    platforms: list[str],
    github_handle: str | None = None,
    linkedin_url: str | None = None,
    twitter_handle: str | None = None,
) -> tuple[User, ScrapeJob]:
    if user_id is None:
        user = User(display_name=display_name)
        session.add(user)
    else:
        user = await session.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        if display_name is not None:
            user.display_name = display_name

    if github_handle is not None:
        user.github_handle = github_handle
    if linkedin_url is not None:
        user.linkedin_url = linkedin_url
    if twitter_handle is not None:
        user.twitter_handle = twitter_handle

    job = ScrapeJob(user=user, status=JobStatus.processing, platforms=platforms)
    session.add(job)
    await session.commit()
    await session.refresh(user)
    await session.refresh(job)
    return user, job
