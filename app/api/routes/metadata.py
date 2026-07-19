import uuid
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
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session
from app.models.entities import MetadataStatus, StartupApplication, StartupMetadata
from app.schemas.metadata import (
    StartupMetadataAcceptedResponse,
    StartupMetadataResponse,
)
from app.services.startup_metadata import extract_and_store


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
        record.deck_filename = filename
        record.deck_content_type = "application/pdf"
        record.deck_data = pdf_data
        record.first_slide_data = None
        record.first_slide_content_type = None
        record.company_name = None
        record.summary_sentences = None
        record.model = None
        record.openai_response_id = None
        record.input_tokens = None
        record.output_tokens = None
        record.completed_at = None

    record.status = MetadataStatus.processing
    record.error = None
    application.deck_filename = filename
    await session.commit()
    await session.refresh(record)

    background_tasks.add_task(extract_and_store, record.id)
    return StartupMetadataAcceptedResponse(
        application_id=application_id,
        metadata_id=record.id,
    )


@router.get("/{application_id}", response_model=StartupMetadataResponse)
async def get_startup_metadata(
    application_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> StartupMetadataResponse:
    record = await _metadata_for_application(session, application_id)
    return metadata_response(record)


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
        select(StartupMetadata).where(
            StartupMetadata.application_id == application_id
        )
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Startup metadata not found")
    return record


def metadata_response(record: StartupMetadata) -> StartupMetadataResponse:
    return StartupMetadataResponse(
        id=record.id,
        application_id=record.application_id,
        status=record.status,
        company_name=record.company_name,
        summary_sentences=record.summary_sentences,
        deck_filename=record.deck_filename,
        deck_content_type=record.deck_content_type,
        deck_available=bool(record.deck_data),
        first_slide_available=record.first_slide_data is not None,
        model=record.model,
        error=record.error,
        created_at=record.created_at,
        completed_at=record.completed_at,
    )

