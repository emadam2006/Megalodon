from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings
from app.core.logging import logger


class Base(DeclarativeBase):
    pass


# Primary database connection engine
_engine = None
_session_maker = None


def get_engine():
    global _engine, _session_maker
    if _engine is None:
        db_url = settings.effective_database_url
        connect_args = {}
        # Support fallback to sqlite for lightweight testing
        if "sqlite" in db_url:
            connect_args = {"check_same_thread": False}

        try:
            _engine = create_async_engine(
                db_url,
                echo=settings.DEBUG,
                future=True,
                pool_pre_ping=True,
                connect_args=connect_args,
            )
        except Exception as e:
            logger.warning(
                f"Failed to create database engine with {db_url}: {e}. Falling back to SQLite."
            )
            fallback_url = "sqlite+aiosqlite:///./megalodon.db"
            _engine = create_async_engine(
                fallback_url,
                echo=settings.DEBUG,
                future=True,
                connect_args={"check_same_thread": False},
            )

        _session_maker = async_sessionmaker(
            bind=_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _engine


def get_session_maker():
    if _session_maker is None:
        get_engine()
    return _session_maker


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session."""
    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initializes schema and tables if they do not exist."""
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Ensure must_change_credentials column exists on existing PostgreSQL tables
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_credentials BOOLEAN DEFAULT TRUE NOT NULL"))
        except Exception as e:
            logger.debug(f"Column check for must_change_credentials: {e}")
    logger.info("Database tables initialized successfully")
