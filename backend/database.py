import os
from collections.abc import Generator
from pathlib import Path
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from alembic import command
from alembic.config import Config

# The database file location can be overridden with FINANCE_DB_PATH. This keeps
# end-to-end / throwaway runs from touching the developer's real finance.db.
_DB_PATH_ENV = os.environ.get("FINANCE_DB_PATH")
DB_PATH = (
    Path(_DB_PATH_ENV).resolve()
    if _DB_PATH_ENV
    else Path(__file__).resolve().parent / "finance.db"
)
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def run_migrations() -> None:
    """Apply Alembic migrations so the schema stays in sync."""
    if os.environ.get("FINANCE_TESTING") == "1":
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
