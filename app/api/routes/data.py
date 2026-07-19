import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.entities import GitHubData, LinkedInData, TwitterData, User
from app.schemas.scraping import AggregatedDataResponse, PlatformDataResponse

router = APIRouter()


@router.get("/{user_id}", response_model=AggregatedDataResponse)
async def get_all_data(
    user_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> AggregatedDataResponse:
    await _ensure_user(session, user_id)
    github = await _platform_rows(session, GitHubData, user_id)
    linkedin = await _platform_rows(session, LinkedInData, user_id)
    twitter = await _platform_rows(session, TwitterData, user_id)
    return AggregatedDataResponse(
        user_id=user_id,
        github=github,
        linkedin=linkedin,
        twitter=twitter,
    )


@router.get("/{user_id}/github", response_model=list[PlatformDataResponse])
async def get_github_data(
    user_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> list[GitHubData]:
    await _ensure_user(session, user_id)
    return await _platform_rows(session, GitHubData, user_id)


@router.get("/{user_id}/linkedin", response_model=list[PlatformDataResponse])
async def get_linkedin_data(
    user_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> list[LinkedInData]:
    await _ensure_user(session, user_id)
    return await _platform_rows(session, LinkedInData, user_id)


@router.get("/{user_id}/twitter", response_model=list[PlatformDataResponse])
async def get_twitter_data(
    user_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> list[TwitterData]:
    await _ensure_user(session, user_id)
    return await _platform_rows(session, TwitterData, user_id)


async def _ensure_user(session: AsyncSession, user_id: uuid.UUID) -> None:
    if await session.get(User, user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")


async def _platform_rows(
    session: AsyncSession,
    model: type[GitHubData] | type[LinkedInData] | type[TwitterData],
    user_id: uuid.UUID,
):
    result = await session.scalars(
        select(model).where(model.user_id == user_id).order_by(model.scraped_at.desc())
    )
    return list(result)
