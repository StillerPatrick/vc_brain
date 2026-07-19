import re
from collections.abc import AsyncIterator

from sqlalchemy import Float, inspect, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


engine = create_async_engine(settings.database_url, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session


async def create_database_tables() -> None:
    from app.models import (  # noqa: F401
        ApplicationFounder,
        ApplicationStatus,
        GitHubData,
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

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.run_sync(_add_personality_summary_column)
        await connection.run_sync(_add_user_cv_columns)
        await connection.run_sync(_add_startup_metadata_market_size_columns)
        await connection.run_sync(_add_startup_metadata_research_columns)
        await connection.run_sync(_add_founder_commitment_columns)


def _add_personality_summary_column(connection) -> None:
    columns = {
        column["name"]
        for column in inspect(connection).get_columns("personality_analyses")
    }
    if "summary" in columns:
        return
    connection.execute(text("ALTER TABLE personality_analyses ADD COLUMN summary TEXT"))
    connection.execute(
        text(
            "UPDATE personality_analyses "
            "SET summary = substr(rationale, 1, 237) || '…' "
            "WHERE summary IS NULL"
        )
    )


def _add_user_cv_columns(connection) -> None:
    """Idempotently migrate existing users for LinkedIn CV enrichment."""
    columns = {column["name"] for column in inspect(connection).get_columns("users")}
    definitions = {
        "headline": "VARCHAR(512)",
        "location_text": "VARCHAR(255)",
        "country_code": "VARCHAR(8)",
        "current_position": "VARCHAR(255)",
        "current_company": "VARCHAR(255)",
        "years_experience": "FLOAT",
        "highest_degree": "VARCHAR(255)",
        "field_of_study": "VARCHAR(255)",
        "experience": "JSON",
        "education": "JSON",
        "skills": "JSON",
        "connections_count": "INTEGER",
        "follower_count": "INTEGER",
        "cv_scraped_at": "TIMESTAMP",
    }
    for column_name, column_type in definitions.items():
        if column_name not in columns:
            connection.execute(
                text(
                    f"ALTER TABLE users ADD COLUMN {column_name} {column_type}"
                )
            )


def _add_founder_commitment_columns(connection) -> None:
    columns = {
        column["name"]
        for column in inspect(connection).get_columns("application_founders")
    }
    definitions = {
        "startup_commitment": "VARCHAR(32)",
        "commitment_rationale": "TEXT",
    }
    for column_name, column_type in definitions.items():
        if column_name not in columns:
            connection.execute(
                text(
                    f"ALTER TABLE application_founders ADD COLUMN {column_name} "
                    f"{column_type}"
                )
            )


def _add_startup_metadata_market_size_columns(connection) -> None:
    columns = {
        column["name"]: column
        for column in inspect(connection).get_columns("startup_metadata")
    }
    for column_name in ("tam", "sam", "som"):
        if column_name not in columns:
            connection.execute(
                text(f"ALTER TABLE startup_metadata ADD COLUMN {column_name} FLOAT")
            )
        elif columns[column_name]["type"].python_type is not float:
            _convert_market_size_column_to_float(connection, column_name)


def _add_startup_metadata_research_columns(connection) -> None:
    """Small idempotent migration for deployments created before research existed."""
    columns = {
        column["name"]
        for column in inspect(connection).get_columns("startup_metadata")
    }
    definitions = {
        "estimated_tam": "FLOAT",
        "estimated_sam": "FLOAT",
        "estimated_som": "FLOAT",
        "market_sizing": "JSON",
        "market_score": "INTEGER",
        "market_metric": "JSON",
        "product_reality_check": "JSON",
        "product_market_fit_score": "INTEGER",
        "product_market_fit_metric": "JSON",
        "swot_strengths": "JSON",
        "swot_weaknesses": "JSON",
        "swot_opportunities": "JSON",
        "swot_threats": "JSON",
        "competitors": "JSON",
        "investment_hypotheses": "JSON",
        "traction_kpis": "JSON",
        "research_status": "VARCHAR(32)",
        "research_model": "VARCHAR(255)",
        "research_response_id": "VARCHAR(255)",
        "research_error": "TEXT",
        "research_completed_at": "TIMESTAMP",
        "research_started_at": "TIMESTAMP",
    }
    for column_name, column_type in definitions.items():
        if column_name not in columns:
            connection.execute(
                text(
                    f"ALTER TABLE startup_metadata ADD COLUMN {column_name} "
                    f"{column_type}"
                )
            )
    connection.execute(
        text(
            "UPDATE startup_metadata SET research_status = 'processing' "
            "WHERE research_status IS NULL"
        )
    )


def _convert_market_size_column_to_float(connection, column_name: str) -> None:
    temporary_column = f"{column_name}_numeric_migration"
    connection.execute(
        text(f"ALTER TABLE startup_metadata ADD COLUMN {temporary_column} FLOAT")
    )
    rows = connection.execute(
        text(f"SELECT id, {column_name} FROM startup_metadata")
    ).all()
    for row in rows:
        numeric_value = _parse_legacy_market_size(row[1])
        if numeric_value is not None:
            connection.execute(
                text(
                    f"UPDATE startup_metadata SET {temporary_column} = :value "
                    "WHERE CAST(id AS VARCHAR) = :record_id"
                ),
                {"value": numeric_value, "record_id": str(row[0])},
            )
    connection.execute(text(f"ALTER TABLE startup_metadata DROP COLUMN {column_name}"))
    connection.execute(
        text(
            f"ALTER TABLE startup_metadata RENAME COLUMN {temporary_column} "
            f"TO {column_name}"
        )
    )


def _parse_legacy_market_size(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    match = re.search(r"(?i)(\d[\d,]*(?:\.\d+)?)\s*([KMBT])?", str(value))
    if match is None:
        return None
    magnitude = {
        None: 1,
        "K": 1_000,
        "M": 1_000_000,
        "B": 1_000_000_000,
        "T": 1_000_000_000_000,
    }
    suffix = match.group(2).upper() if match.group(2) else None
    return float(match.group(1).replace(",", "")) * magnitude[suffix]


from app.db.base import Base  # noqa: E402
