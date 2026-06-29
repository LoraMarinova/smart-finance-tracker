from datetime import datetime
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import database
import models  # noqa: F401
from database import Base
from models import Transaction


def test_get_db_rolls_back_on_exception(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    test_session_local = sessionmaker(
        bind=engine, autoflush=False, autocommit=False
    )
    monkeypatch.setattr(database, "SessionLocal", test_session_local)

    gen = database.get_db()
    db = next(gen)
    db.add(
        Transaction(
            type="expense",
            amount=Decimal("10"),
            category="Groceries",
            date=datetime(2026, 1, 15, 9, 0, 0),
        )
    )

    with pytest.raises(RuntimeError, match="boom"):
        gen.throw(RuntimeError("boom"))

    with test_session_local() as verify:
        count = verify.scalar(select(func.count()).select_from(Transaction))
        assert count == 0
