from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, FastAPI, HTTPException, Path, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from database import DBDep, create_db_and_tables
from models import Transaction
from schemas import (
    Stats,
    TransactionCreate,
    TransactionRead,
    TransactionsResponse,
    TransactionUpdate,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    create_db_and_tables()
    yield


app = FastAPI(title="Smart Finance Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

TransactionIdPath = Annotated[int, Path(ge=1, description="The transaction ID")]


def _compute_stats(transactions: list[Transaction]) -> Stats:
    total_income = sum(t.amount for t in transactions if t.type == "income")
    total_expense = sum(t.amount for t in transactions if t.type == "expense")
    return Stats(
        total_income=total_income,
        total_expense=total_expense,
        balance=total_income - total_expense,
    )


@router.get("")
def list_transactions(db: DBDep) -> TransactionsResponse:
    transactions = list(
        db.scalars(select(Transaction).order_by(Transaction.date.desc())).all()
    )
    return TransactionsResponse(
        transactions=transactions,
        stats=_compute_stats(transactions),
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreate, db: DBDep) -> TransactionRead:
    data = payload.model_dump()
    if data.get("date") is None:
        data["date"] = datetime.now()
    transaction = Transaction(**data)
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.put("/{transaction_id}")
def update_transaction(
    transaction_id: TransactionIdPath,
    payload: TransactionUpdate,
    db: DBDep,
) -> TransactionRead:
    transaction = db.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
    data = payload.model_dump()
    if data.get("date") is None:
        data["date"] = datetime.now()
    for field, value in data.items():
        setattr(transaction, field, value)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: TransactionIdPath, db: DBDep) -> None:
    transaction = db.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
    db.delete(transaction)
    db.commit()


app.include_router(router)
