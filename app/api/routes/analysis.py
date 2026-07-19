import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.entities import PersonalityAnalysis, User
from app.schemas.analysis import PersonalityAnalysisResponse
from app.services.analysis_workflow import analyze_and_store
from app.services.exceptions import IntegrationError
from app.services.founder_score import ensure_founder_score

router = APIRouter()


@router.post(
    "/{user_id}",
    response_model=PersonalityAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
)
async def analyze_user(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> PersonalityAnalysis:
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        return await analyze_and_store(session, user)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except IntegrationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/{user_id}", response_model=list[PersonalityAnalysisResponse])
async def get_user_analyses(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> list[PersonalityAnalysis]:
    if await session.get(User, user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")
    result = await session.scalars(
        select(PersonalityAnalysis)
        .where(PersonalityAnalysis.user_id == user_id)
        .order_by(PersonalityAnalysis.created_at.desc())
    )
    analyses = list(result)
    changed = False
    for analysis in analyses:
        changed = ensure_founder_score(analysis) or changed
    if changed:
        await session.commit()
    return analyses
