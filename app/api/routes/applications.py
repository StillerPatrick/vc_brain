import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import delete as sa_delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_session
from app.models.entities import (
    ApplicationFounder,
    ApplicationStatus,
    GitHubData,
    JobStatus,
    LinkedInData,
    LinkedInProfileData,
    MetadataStatus,
    PersonalityAnalysis,
    ScrapeJob,
    StartupApplication,
    StartupMetadata,
    StartupResearchSource,
    TwitterData,
    User,
)
from app.schemas.applications import (
    ApplicationAcceptedResponse,
    ApplicationFounderResponse,
    StartupApplicationRequest,
    StartupApplicationResponse,
    github_handle,
    linkedin_profile_url,
    twitter_handle,
)
from app.schemas.metadata import startup_metadata_response
from app.services.application_workflow import FounderWorkItem, process_application
from app.services.orchestrator import ScrapeTargets
from app.services.startup_metadata import extract_and_store

router = APIRouter()


@router.post(
    "",
    response_model=ApplicationAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_application(
    request: StartupApplicationRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> ApplicationAcceptedResponse:
    application = StartupApplication(
        company=request.company.strip(),
        one_liner=request.one_liner,
        sector=request.sector,
        location=request.location,
        deck_filename=request.deck_filename,
        status=ApplicationStatus.processing,
    )
    session.add(application)
    await session.flush()

    work_items: list[FounderWorkItem] = []
    application_user_ids: set[uuid.UUID] = set()
    for position, member in enumerate(request.founders):
        try:
            github = github_handle(member.github)
            linkedin = linkedin_profile_url(member.linkedin)
            twitter = twitter_handle(member.x)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        user = await _find_existing_user(session, github, linkedin, twitter)
        if user is None:
            user = User(
                display_name=member.name,
                github_handle=github,
                linkedin_url=linkedin,
                twitter_handle=twitter,
            )
            session.add(user)
            await session.flush()
        else:
            conflicts = [
                label
                for label, incoming, existing in (
                    ("GitHub", github, user.github_handle),
                    ("LinkedIn", linkedin, user.linkedin_url),
                    ("X", twitter, user.twitter_handle),
                )
                if incoming and existing and incoming.casefold() != existing.casefold()
            ]
            if conflicts:
                raise HTTPException(
                    status_code=409,
                    detail=f"Founder profiles conflict with an existing user: {', '.join(conflicts)}",
                )
            user.display_name = member.name
            user.github_handle = github or user.github_handle
            user.linkedin_url = linkedin or user.linkedin_url
            user.twitter_handle = twitter or user.twitter_handle

        if user.id in application_user_ids:
            raise HTTPException(
                status_code=409,
                detail="The same founder profile was submitted more than once",
            )
        application_user_ids.add(user.id)

        platforms = [
            platform
            for platform, value in (
                ("github", github),
                ("linkedin", linkedin),
                ("twitter", twitter),
            )
            if value
        ]
        job = ScrapeJob(
            user_id=user.id,
            status=JobStatus.processing,
            platforms=platforms,
        )
        session.add(job)
        await session.flush()

        founder = ApplicationFounder(
            application_id=application.id,
            user_id=user.id,
            scrape_job_id=job.id,
            role=member.role,
            about=member.about,
            position=position,
        )
        session.add(founder)
        await session.flush()
        work_items.append(
            FounderWorkItem(
                founder_id=founder.id,
                user_id=user.id,
                job_id=job.id,
                targets=ScrapeTargets(
                    github_handle=github,
                    linkedin_url=linkedin,
                    twitter_handle=twitter,
                ),
            )
        )

    await session.commit()
    background_tasks.add_task(process_application, application.id, work_items)
    return ApplicationAcceptedResponse(application_id=application.id)


@router.get("", response_model=list[StartupApplicationResponse])
async def list_applications(
    session: AsyncSession = Depends(get_session),
) -> list[StartupApplicationResponse]:
    applications = list(
        await session.scalars(
            select(StartupApplication)
            .options(
                selectinload(StartupApplication.founders).selectinload(
                    ApplicationFounder.user
                ),
                selectinload(StartupApplication.founders).selectinload(
                    ApplicationFounder.scrape_job
                ),
                selectinload(StartupApplication.founders).selectinload(
                    ApplicationFounder.personality_analysis
                ),
                selectinload(StartupApplication.startup_metadata).selectinload(
                    StartupMetadata.research_sources
                ),
            )
            .order_by(StartupApplication.created_at.desc())
            .limit(100)
        )
    )
    return [_application_response(application) for application in applications]


@router.get("/{application_id}", response_model=StartupApplicationResponse)
async def get_application(
    application_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> StartupApplicationResponse:
    application = await session.scalar(
        select(StartupApplication)
        .where(StartupApplication.id == application_id)
        .options(
            selectinload(StartupApplication.founders).selectinload(ApplicationFounder.user),
            selectinload(StartupApplication.founders).selectinload(
                ApplicationFounder.scrape_job
            ),
            selectinload(StartupApplication.founders).selectinload(
                ApplicationFounder.personality_analysis
            ),
            selectinload(StartupApplication.startup_metadata).selectinload(
                StartupMetadata.research_sources
            ),
        )
    )
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return _application_response(application)


@router.delete("/{application_id}")
async def delete_application(
    application_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> dict[str, bool]:
    application = await session.scalar(
        select(StartupApplication)
        .where(StartupApplication.id == application_id)
        .options(selectinload(StartupApplication.founders))
    )
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    user_ids = [founder.user_id for founder in application.founders]
    await session.delete(application)  # ORM cascades founders + metadata
    await session.flush()

    # SQLite doesn't enforce FK cascades here, so clean up per-user data
    # explicitly — but only for users no other application references.
    for user_id in user_ids:
        still_referenced = await session.scalar(
            select(func.count())
            .select_from(ApplicationFounder)
            .where(ApplicationFounder.user_id == user_id)
        )
        if still_referenced:
            continue
        for model in (
            GitHubData,
            LinkedInData,
            LinkedInProfileData,
            TwitterData,
            PersonalityAnalysis,
            ScrapeJob,
        ):
            await session.execute(sa_delete(model).where(model.user_id == user_id))
        await session.execute(sa_delete(User).where(User.id == user_id))

    await session.commit()
    return {"deleted": True}


@router.post(
    "/{application_id}/rerun",
    response_model=ApplicationAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def rerun_application(
    application_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> ApplicationAcceptedResponse:
    """Re-run all scraping, analyses, and deck metadata as if re-applying."""
    application = await session.scalar(
        select(StartupApplication)
        .where(StartupApplication.id == application_id)
        .options(
            selectinload(StartupApplication.founders).selectinload(
                ApplicationFounder.user
            ),
            selectinload(StartupApplication.startup_metadata),
        )
    )
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    work_items: list[FounderWorkItem] = []
    for founder in application.founders:
        user = founder.user
        platforms = [
            platform
            for platform, value in (
                ("github", user.github_handle),
                ("linkedin", user.linkedin_url),
                ("twitter", user.twitter_handle),
            )
            if value
        ]
        job = ScrapeJob(
            user_id=user.id,
            status=JobStatus.processing,
            platforms=platforms,
        )
        session.add(job)
        await session.flush()
        founder.scrape_job_id = job.id
        work_items.append(
            FounderWorkItem(
                founder_id=founder.id,
                user_id=user.id,
                job_id=job.id,
                targets=ScrapeTargets(
                    github_handle=user.github_handle,
                    linkedin_url=user.linkedin_url,
                    twitter_handle=user.twitter_handle,
                ),
            )
        )

    application.status = ApplicationStatus.processing
    application.error = None
    application.completed_at = None
    metadata = application.startup_metadata
    metadata_id = None
    if metadata is not None:
        metadata.status = MetadataStatus.processing
        metadata.research_status = MetadataStatus.processing
        metadata.error = None
        metadata.research_error = None
        metadata.research_started_at = None
        metadata.research_completed_at = None
        metadata.estimated_tam = None
        metadata.estimated_sam = None
        metadata.estimated_som = None
        metadata.market_sizing = None
        metadata.swot_strengths = None
        metadata.swot_weaknesses = None
        metadata.swot_opportunities = None
        metadata.swot_threats = None
        metadata.competitors = None
        metadata.investment_hypotheses = None
        metadata.traction_kpis = None
        metadata.completed_at = None
        metadata_id = metadata.id
        await session.execute(
            sa_delete(StartupResearchSource).where(
                StartupResearchSource.metadata_id == metadata.id
            )
        )

    await session.commit()
    background_tasks.add_task(process_application, application.id, work_items)
    if metadata_id is not None:
        background_tasks.add_task(extract_and_store, metadata_id)
    return ApplicationAcceptedResponse(application_id=application.id)


async def _find_existing_user(
    session: AsyncSession,
    github: str | None,
    linkedin: str | None,
    twitter: str | None,
) -> User | None:
    conditions = []
    if github:
        conditions.append(func.lower(User.github_handle) == github.casefold())
    if linkedin:
        conditions.append(User.linkedin_url == linkedin)
    if twitter:
        conditions.append(func.lower(User.twitter_handle) == twitter.casefold())
    if not conditions:
        return None
    matches = list(await session.scalars(select(User).where(or_(*conditions))))
    unique = {match.id: match for match in matches}
    if len(unique) > 1:
        raise HTTPException(
            status_code=409,
            detail="Submitted profiles resolve to different existing users",
        )
    return next(iter(unique.values()), None)


def _application_response(application: StartupApplication) -> StartupApplicationResponse:
    founders = [
        ApplicationFounderResponse(
            user_id=founder.user.id,
            name=founder.user.display_name or "Unknown founder",
            role=founder.role,
            about=founder.about,
            github_handle=founder.user.github_handle,
            linkedin_url=founder.user.linkedin_url,
            twitter_handle=founder.user.twitter_handle,
            job_id=founder.scrape_job.id if founder.scrape_job else None,
            job_status=founder.scrape_job.status if founder.scrape_job else None,
            job_error=founder.scrape_job.error if founder.scrape_job else None,
            analysis=founder.personality_analysis,
        )
        for founder in application.founders
    ]
    startup_metadata = application.startup_metadata
    metadata_response = (
        startup_metadata_response(startup_metadata) if startup_metadata else None
    )
    return StartupApplicationResponse(
        id=application.id,
        company=application.company,
        one_liner=application.one_liner,
        sector=application.sector,
        location=application.location,
        deck_filename=application.deck_filename,
        status=application.status,
        team_categorization=application.team_categorization,
        error=application.error,
        created_at=application.created_at,
        completed_at=application.completed_at,
        metadata=metadata_response,
        founders=founders,
    )
