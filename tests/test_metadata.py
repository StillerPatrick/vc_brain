from datetime import datetime, timezone

import pymupdf
from sqlalchemy import Float, create_engine, inspect, text

from app.api.routes import applications, metadata
from app.db.session import (
    AsyncSessionLocal,
    _add_startup_metadata_market_size_columns,
    _add_startup_metadata_research_columns,
    _parse_legacy_market_size,
)
from app.models.entities import (
    MetadataStatus,
    StartupMetadata,
    StartupResearchSource,
)
from app.services.startup_metadata import render_first_slide
from app.services.market_research import SourceSnapshot, _crucial_sources
from app.schemas.metadata import StartupResearchResult


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
            record.tam = 12_000_000_000
            record.sam = 3_500_000_000
            record.som = 180_000_000
            record.estimated_tam = 10_000_000_000
            record.estimated_sam = 2_500_000_000
            record.estimated_som = 75_000_000
            record.swot_strengths = [
                {
                    "text": "The product targets costly factory downtime.",
                    "source_urls": ["https://example.com/industry"],
                }
            ]
            record.swot_weaknesses = []
            record.swot_opportunities = []
            record.swot_threats = []
            record.competitors = [
                {
                    "name": "RobotOS",
                    "website_url": "https://example.com/robotos",
                    "differentiation": "An incumbent automation platform.",
                    "threat": "high",
                    "source_urls": ["https://example.com/industry"],
                }
            ]
            record.investment_hypotheses = [
                {
                    "text": "Factories will pay to reduce reconfiguration time.",
                    "source_urls": ["https://example.com/industry"],
                }
            ]
            record.traction_kpis = [
                {
                    "text": "The company reports ten factory customers.",
                    "trust": "reported",
                    "confidence": 70,
                    "source_urls": ["https://example.com/industry"],
                }
            ]
            record.research_status = MetadataStatus.completed
            session.add(
                StartupResearchSource(
                    metadata_id=record.id,
                    url="https://example.com/industry",
                    title="Industrial automation statistics",
                    domain="example.com",
                    favicon_url="https://example.com/favicon.ico",
                    excerpt="Industry evidence used by the research agent.",
                    supports=["TAM", "Strength"],
                    position=0,
                )
            )
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
    assert body["tam"] == 12_000_000_000
    assert body["sam"] == 3_500_000_000
    assert body["som"] == 180_000_000
    assert body["estimated_tam"] == 10_000_000_000
    assert body["research_status"] == "completed"
    assert body["swot_strengths"][0]["text"].startswith("The product")
    assert body["research_sources"][0]["domain"] == "example.com"
    assert body["research_sources"][0]["supports"] == ["TAM", "Strength"]
    assert body["competitors"][0]["name"] == "RobotOS"
    assert body["investment_hypotheses"][0]["text"].startswith("Factories")
    assert body["traction_kpis"][0]["confidence"] == 70
    assert body["deck_available"] is True
    assert body["first_slide_available"] is True

    application = client.get(f"/api/v1/applications/{application_id}").json()
    assert application["metadata"]["company_name"] == "Acme Robotics"
    assert application["metadata"]["tam"] == 12_000_000_000
    assert application["metadata"]["estimated_tam"] == 10_000_000_000
    assert application["metadata"]["research_sources"][0]["title"] == (
        "Industrial automation statistics"
    )

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


def test_market_sizes_use_numeric_columns_and_legacy_values_are_normalized() -> None:
    assert isinstance(StartupMetadata.__table__.c.tam.type, Float)
    assert isinstance(StartupMetadata.__table__.c.sam.type, Float)
    assert isinstance(StartupMetadata.__table__.c.som.type, Float)
    assert _parse_legacy_market_size("$1.5B global market") == 1_500_000_000
    assert _parse_legacy_market_size("EUR 250M") == 250_000_000


def test_market_size_migration_converts_text_columns_to_numbers() -> None:
    migration_engine = create_engine("sqlite://")
    with migration_engine.begin() as connection:
        connection.execute(
            text(
                "CREATE TABLE startup_metadata ("
                "id VARCHAR PRIMARY KEY, tam TEXT, sam TEXT, som TEXT)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO startup_metadata (id, tam, sam, som) "
                "VALUES ('deck-1', '$2B market', '500M', NULL)"
            )
        )
        _add_startup_metadata_market_size_columns(connection)

        column_types = {
            column["name"]: column["type"]
            for column in inspect(connection).get_columns("startup_metadata")
        }
        row = connection.execute(
            text("SELECT tam, sam, som FROM startup_metadata WHERE id = 'deck-1'")
        ).one()

    assert all(isinstance(column_types[name], Float) for name in ("tam", "sam", "som"))
    assert row == (2_000_000_000, 500_000_000, None)


def test_research_migration_adds_separate_analysis_columns() -> None:
    migration_engine = create_engine("sqlite://")
    with migration_engine.begin() as connection:
        connection.execute(
            text("CREATE TABLE startup_metadata (id VARCHAR PRIMARY KEY)")
        )
        connection.execute(text("INSERT INTO startup_metadata (id) VALUES ('deck-1')"))
        _add_startup_metadata_research_columns(connection)
        columns = {
            column["name"]
            for column in inspect(connection).get_columns("startup_metadata")
        }
        status_value = connection.execute(
            text(
                "SELECT research_status FROM startup_metadata WHERE id = 'deck-1'"
            )
        ).scalar_one()

    assert {
        "estimated_tam",
        "estimated_sam",
        "estimated_som",
        "swot_strengths",
        "swot_weaknesses",
        "swot_opportunities",
        "swot_threats",
        "competitors",
        "investment_hypotheses",
        "traction_kpis",
        "research_status",
    }.issubset(columns)
    assert status_value == "processing"


def test_final_research_keeps_only_cited_tavily_sources() -> None:
    result = StartupResearchResult.model_validate(
        {
            "tam": {
                "value_usd": 1_000_000,
                "rationale": "One million buyers at one dollar each.",
                "source_urls": ["https://example.com/evidence"],
            },
            "sam": {
                "value_usd": 500_000,
                "rationale": "Half of the sourced market is serviceable.",
                "source_urls": ["https://example.com/evidence"],
            },
            "som": {
                "value_usd": 25_000,
                "rationale": "A conservative five percent serviceable share.",
                "source_urls": ["https://example.com/evidence"],
            },
            "strengths": [
                {
                    "text": "The market has documented demand.",
                    "source_urls": ["https://example.com/evidence"],
                }
            ],
            "weaknesses": [
                {
                    "text": "The startup has limited public proof.",
                    "source_urls": ["https://example.com/evidence"],
                }
            ],
            "opportunities": [
                {
                    "text": "Demand is expanding.",
                    "source_urls": ["https://example.com/evidence"],
                }
            ],
            "threats": [
                {
                    "text": "Incumbents serve the same buyers.",
                    "source_urls": ["https://example.com/evidence"],
                }
            ],
            "competitors": [
                {
                    "name": "Example incumbent",
                    "website_url": "https://example.com/competitor",
                    "differentiation": "It already sells to the same buyers.",
                    "threat": "high",
                    "source_urls": ["https://example.com/evidence"],
                }
            ],
            "investment_hypotheses": [
                {
                    "text": "Buyers will switch for a measurable cost reduction.",
                    "source_urls": ["https://example.com/evidence"],
                },
                {
                    "text": "The company can reach buyers efficiently.",
                    "source_urls": ["https://example.com/evidence"],
                },
            ],
            "traction_kpis": [
                {
                    "text": "The company reports early customer adoption.",
                    "trust": "reported",
                    "confidence": 60,
                    "source_urls": ["https://example.com/evidence"],
                }
            ],
        }
    )
    available = {
        "https://example.com/evidence": SourceSnapshot(
            url="https://example.com/evidence",
            title="Market evidence",
            domain="example.com",
            favicon_url="https://example.com/favicon.ico",
            excerpt="Evidence",
            supports=[],
        ),
        "https://example.com/unused": SourceSnapshot(
            url="https://example.com/unused",
            title="Unused result",
            domain="example.com",
            favicon_url=None,
            excerpt=None,
            supports=[],
        ),
    }

    sources = _crucial_sources(result, available)

    assert [source.url for source in sources] == ["https://example.com/evidence"]
    assert sources[0].supports == [
        "Competitor",
        "Hypothesis",
        "Opportunity",
        "SAM",
        "SOM",
        "Strength",
        "TAM",
        "Threat",
        "Traction",
        "Weakness",
    ]
