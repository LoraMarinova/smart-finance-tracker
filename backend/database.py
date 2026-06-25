from collections.abc import Generator
from pathlib import Path
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# The SQLite file lives alongside this module, inside the backend directory.
DB_PATH = Path(__file__).resolve().parent / "finance.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False is required because FastAPI may use the connection
# across different threads when running sync path operations in a threadpool.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def create_db_and_tables() -> None:
    """Create the SQLite file and all tables if they do not exist yet."""
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DBDep = Annotated[Session, Depends(get_db)]
