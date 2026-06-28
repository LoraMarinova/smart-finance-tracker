from collections.abc import Generator
from pathlib import Path
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from alembic import command
from alembic.config import Config
from config import settings

# The database file location can be overridden with FINANCE_DB_PATH. This keeps
# end-to-end / throwaway runs from touching the developer's real finance.db.
DB_PATH = (
    Path(settings.finance_db_path).resolve()
    if settings.finance_db_path
    else Path(__file__).resolve().parent / "finance.db"
)
DATABASE_URL = f"sqlite:///{DB_PATH}"


def is_e2e_database() -> bool:
    """True when the app is pointed at the isolated Playwright test database."""
    return settings.finance_db_path is not None


engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def check_database_connection() -> bool:
    """Return True if a trivial query succeeds against the database."""
    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


class Base(DeclarativeBase):
    pass


def run_migrations() -> None:
    """Apply Alembic migrations so the schema stays in sync."""
    if settings.finance_testing:
        return
    alembic_cfg = Config(str(Path(__file__).resolve().parent / "alembic.ini"))
    alembic_cfg.set_main_option("sqlalchemy.url", DATABASE_URL)
    command.upgrade(alembic_cfg, "head")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DBDep = Annotated[Session, Depends(get_db)]
