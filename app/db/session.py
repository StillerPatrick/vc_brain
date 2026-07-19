from collections.abc import AsyncIterator

from sqlalchemy import inspect, text
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
        MetadataStatus,
        PersonalityAnalysis,
        ScrapeJob,
        StartupApplication,
        StartupMetadata,
        TwitterData,
        User,
    )

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.run_sync(_add_personality_summary_column)


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


from app.db.base import Base  # noqa: E402
