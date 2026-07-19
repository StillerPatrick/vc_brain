from datetime import datetime, timezone

import pymupdf

from app.api.routes import applications, metadata
from app.db.session import AsyncSessionLocal
from app.models.entities import MetadataStatus, StartupMetadata
from app.services.startup_metadata import render_first_slide


def _pdf_bytes() -> bytes:
    document = pymupdf.open()
    page = document.new_page(width=1280, height=720)
    page.insert_text((80, 120), "Acme Robotics", fontsize=42)
    value = document.tobytes()
    document.close()
    return value


async def _no_application_workflow(*_args, **_kwargs) -> None:
    return None


def _create_application(client, monkeypatch) -> str:
    monkeypatch.setattr(applications, "process_application", _no_application_workflow)
    response = client.post(
        "/api/v1/applications",
        json={
            "company": "Applicant supplied name",
            "founders": [
                {
                    "name": "Deck Founder",
                    "github": "deck-metadata-test-founder",
                }
            ],
        },
    )
    assert response.status_code == 202
    return response.json()["application_id"]


def test_pitch_deck_is_stored_and_metadata_is_exposed(client, monkeypatch) -> None:
    application_id = _create_application(client, monkeypatch)

    async def fake_extract_and_store(metadata_id) -> None:
        async with AsyncSessionLocal() as session:
            record = await session.get(StartupMetadata, metadata_id)
            assert record is not None
            record.company_name = "Acme Robotics"
            record.summary_sentences = [
                "Factories lose time when robots require manual reconfiguration.",
                "Acme Robotics provides adaptive control software for industrial robots.",
                "The company sells annual software licenses to manufacturers.",
            ]
            record.first_slide_data = b"\x89PNG\r\n\x1a\npreview"
            record.first_slide_content_type = "image/png"
            record.model = "test-model"
            record.status = MetadataStatus.completed
            record.completed_at = datetime.now(timezone.utc)
            await session.commit()

    monkeypatch.setattr(metadata, "extract_and_store", fake_extract_and_store)
    deck = _pdf_bytes()
    upload = client.post(
        f"/api/v1/metadata/{application_id}",
        files={"deck": ("acme-deck.pdf", deck, "application/pdf")},
    )
    assert upload.status_code == 202

    stored = client.get(f"/api/v1/metadata/{application_id}")
    assert stored.status_code == 200
    body = stored.json()
    assert body["status"] == "completed"
    assert body["company_name"] == "Acme Robotics"
    assert len(body["summary_sentences"]) == 3
    assert body["deck_available"] is True
    assert body["first_slide_available"] is True

    application = client.get(f"/api/v1/applications/{application_id}").json()
    assert application["metadata"]["company_name"] == "Acme Robotics"

    deck_response = client.get(f"/api/v1/metadata/{application_id}/deck")
    assert deck_response.status_code == 200
    assert deck_response.content == deck
    assert deck_response.headers["content-type"] == "application/pdf"

    preview = client.get(f"/api/v1/metadata/{application_id}/first-slide")
    assert preview.status_code == 200
    assert preview.content.startswith(b"\x89PNG")


def test_pitch_deck_upload_rejects_non_pdf(client, monkeypatch) -> None:
    application_id = _create_application(client, monkeypatch)
    response = client.post(
        f"/api/v1/metadata/{application_id}",
        files={"deck": ("notes.txt", b"not a pdf", "text/plain")},
    )
    assert response.status_code == 415
    assert response.json()["detail"] == "Pitch deck must be a PDF file"


def test_first_slide_renderer_returns_png() -> None:
    preview = render_first_slide(_pdf_bytes())
    assert preview.startswith(b"\x89PNG\r\n\x1a\n")

