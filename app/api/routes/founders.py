import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.entities import JobStatus, PersonalityAnalysis, ScrapeJob, User
from app.schemas.applications import github_handle, linkedin_profile_url, twitter_handle
from app.schemas.founders import (
    FounderScoreAcceptedResponse,
    FounderScoreRequest,
    FounderScoreResponse,
)
from app.services.founder_workflow import process_founder_score
from app.services.founder_score import ensure_founder_score
from app.services.orchestrator import ScrapeTargets

router = APIRouter()


@router.post("/score", response_model=FounderScoreAcceptedResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_founder_score(
    request: FounderScoreRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> FounderScoreAcceptedResponse:
    try:
        github = github_handle(request.github)
        linkedin = linkedin_profile_url(request.linkedin)
        twitter = twitter_handle(request.x)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not any((github, linkedin, twitter)):
        raise HTTPException(status_code=422, detail="At least one valid public profile is required")

    conditions = []
    if github:
        conditions.append(User.github_handle.ilike(github))
    if linkedin:
        conditions.append(User.linkedin_url == linkedin)
    if twitter:
        conditions.append(User.twitter_handle.ilike(twitter))
    matches = list(await session.scalars(select(User).where(or_(*conditions))))
    unique = {match.id: match for match in matches}
    if len(unique) > 1:
        raise HTTPException(status_code=409, detail="Submitted profiles resolve to different existing users")
    user = next(iter(unique.values()), None)
    if user is None:
        user = User(display_name=request.name)
        session.add(user)
    elif request.name:
        user.display_name = request.name
    user.github_handle = github or user.github_handle
    user.linkedin_url = linkedin or user.linkedin_url
    user.twitter_handle = twitter or user.twitter_handle

    platforms = [name for name, value in (("github", github), ("linkedin", linkedin), ("twitter", twitter)) if value]
    job = ScrapeJob(user=user, status=JobStatus.processing, platforms=platforms)
    session.add(job)
    await session.commit()
    await session.refresh(user)
    await session.refresh(job)
    background_tasks.add_task(
        process_founder_score,
        job.id,
        user.id,
        ScrapeTargets(github_handle=github, linkedin_url=linkedin, twitter_handle=twitter),
    )
    return FounderScoreAcceptedResponse(user_id=user.id, job_id=job.id)


@router.get("/{user_id}/score", response_model=FounderScoreResponse)
async def get_founder_score(
    user_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> FounderScoreResponse:
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    job = await session.scalar(
        select(ScrapeJob).where(ScrapeJob.user_id == user_id).order_by(ScrapeJob.created_at.desc()).limit(1)
    )
    analysis = await session.scalar(
        select(PersonalityAnalysis)
        .where(PersonalityAnalysis.user_id == user_id)
        .order_by(PersonalityAnalysis.created_at.desc())
        .limit(1)
    )
    if analysis is not None and ensure_founder_score(analysis):
        await session.commit()
    return FounderScoreResponse(
        user_id=user.id,
        name=user.display_name,
        job_id=job.id if job else None,
        job_status=job.status if job else None,
        job_error=job.error if job else None,
        analysis=analysis,
        founder_score=analysis.founder_score if analysis else None,
        components=analysis.founder_score_components if analysis else None,
        updated_at=analysis.created_at if analysis else None,
    )
