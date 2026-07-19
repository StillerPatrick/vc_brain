import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import Response
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.session import get_session
from app.models.entities import (
    MetadataStatus,
    StartupApplication,
    StartupMetadata,
    StartupResearchSource,
)
from app.schemas.metadata import (
    StartupMetadataAcceptedResponse,
    StartupMetadataResponse,
    StartupResearchAcceptedResponse,
    startup_metadata_response,
)
from app.services.startup_metadata import extract_and_store, research_and_store


router = APIRouter()


@router.post(
    "/{application_id}",
    response_model=StartupMetadataAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_pitch_deck(
    application_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    deck: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
) -> StartupMetadataAcceptedResponse:
    application = await session.get(StartupApplication, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    filename = Path(deck.filename or "").name
    if not filename or Path(filename).suffix.casefold() != ".pdf":
        raise HTTPException(status_code=415, detail="Pitch deck must be a PDF file")
    if deck.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Pitch deck must be a PDF file")

    pdf_data = await deck.read(settings.max_pitch_deck_bytes + 1)
    await deck.close()
    if len(pdf_data) > settings.max_pitch_deck_bytes:
        max_mb = settings.max_pitch_deck_bytes // (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"Pitch deck exceeds the {max_mb} MB upload limit",
        )
    if b"%PDF-" not in pdf_data[:1024]:
        raise HTTPException(status_code=415, detail="Uploaded file is not a valid PDF")

    record = await session.scalar(
        select(StartupMetadata).where(
            StartupMetadata.application_id == application_id
        )
    )
    if record is None:
        record = StartupMetadata(
            application_id=application_id,
            deck_filename=filename,
            deck_content_type="application/pdf",
            deck_data=pdf_data,
        )
        session.add(record)
    else:
        await session.execute(
            delete(StartupResearchSource).where(
                StartupResearchSource.metadata_id == record.id
            )
        )
        record.deck_filename = filename
        record.deck_content_type = "application/pdf"
        record.deck_data = pdf_data
        record.first_slide_data = None
        record.first_slide_content_type = None
        record.company_name = None
        record.summary_sentences = None
        record.tam = None
        record.sam = None
        record.som = None
        record.estimated_tam = None
        record.estimated_sam = None
        record.estimated_som = None
        record.market_sizing = None
        record.market_score = None
        record.market_metric = None
        record.product_reality_check = None
        record.product_market_fit_score = None
        record.product_market_fit_metric = None
        record.swot_strengths = None
        record.swot_weaknesses = None
        record.swot_opportunities = None
        record.swot_threats = None
        record.competitors = None
        record.investment_hypotheses = None
        record.traction_kpis = None
        record.research_model = None
        record.research_response_id = None
        record.research_error = None
        record.research_completed_at = None
        record.research_started_at = None
        record.model = None
        record.openai_response_id = None
        record.input_tokens = None
        record.output_tokens = None
        record.completed_at = None

    record.status = MetadataStatus.processing
    record.research_status = MetadataStatus.processing
    record.error = None
    application.deck_filename = filename
    await session.commit()
    await session.refresh(record)

    background_tasks.add_task(extract_and_store, record.id)
    return StartupMetadataAcceptedResponse(
        application_id=application_id,
        metadata_id=record.id,
    )


@router.post(
    "/{application_id}/research",
    response_model=StartupResearchAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def restart_startup_research(
    application_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> StartupResearchAcceptedResponse:
    record = await _metadata_for_application(session, application_id)
    if not record.company_name or not record.summary_sentences:
        raise HTTPException(
            status_code=409,
            detail="Pitch deck metadata must finish extracting before research starts",
        )

    await session.execute(
        delete(StartupResearchSource).where(
            StartupResearchSource.metadata_id == record.id
        )
    )
    record.estimated_tam = None
    record.estimated_sam = None
    record.estimated_som = None
    record.market_sizing = None
    record.market_score = None
    record.market_metric = None
    record.product_reality_check = None
    record.product_market_fit_score = None
    record.product_market_fit_metric = None
    record.swot_strengths = None
    record.swot_weaknesses = None
    record.swot_opportunities = None
    record.swot_threats = None
    record.competitors = None
    record.investment_hypotheses = None
    record.traction_kpis = None
    record.research_model = None
    record.research_response_id = None
    record.research_error = None
    record.research_started_at = datetime.now(timezone.utc)
    record.research_completed_at = None
    record.research_status = MetadataStatus.processing
    record.status = MetadataStatus.processing
    record.error = None
    record.completed_at = None
    await session.commit()

    background_tasks.add_task(research_and_store, record.id)
    return StartupResearchAcceptedResponse(
        application_id=application_id,
        metadata_id=record.id,
    )


@router.get("/{application_id}", response_model=StartupMetadataResponse)
async def get_startup_metadata(
    application_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> StartupMetadataResponse:
    record = await _metadata_for_application(session, application_id)
    return startup_metadata_response(record)


@router.get("/{application_id}/deck", response_class=Response)
async def get_pitch_deck(
    application_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> Response:
    record = await _metadata_for_application(session, application_id)
    filename = quote(record.deck_filename)
    return Response(
        content=record.deck_data,
        media_type=record.deck_content_type,
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{filename}",
            "Cache-Control": "private, max-age=60",
        },
    )


@router.get("/{application_id}/first-slide", response_class=Response)
async def get_first_slide(
    application_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> Response:
    record = await _metadata_for_application(session, application_id)
    if record.first_slide_data is None:
        if record.status == MetadataStatus.processing:
            raise HTTPException(status_code=425, detail="First slide is still processing")
        raise HTTPException(status_code=404, detail="First slide preview is unavailable")
    return Response(
        content=record.first_slide_data,
        media_type=record.first_slide_content_type or "image/png",
        headers={"Cache-Control": "private, max-age=60"},
    )


async def _metadata_for_application(
    session: AsyncSession, application_id: uuid.UUID
) -> StartupMetadata:
    record = await session.scalar(
        select(StartupMetadata)
        .where(StartupMetadata.application_id == application_id)
        .options(selectinload(StartupMetadata.research_sources))
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Startup metadata not found")
    return record
