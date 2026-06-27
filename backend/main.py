from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, FastAPI, HTTPException, Path, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from constants import (
    ALL_CATEGORIES,
    DEFAULT_PAGE_SIZE,
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    MAX_PAGE_SIZE,
)
from database import DBDep, run_migrations
from models import RecurringTransaction, Transaction
from models import Transaction as TxModel
from repository import (
    _apply_transaction_filters,
    category_breakdown,
    compute_stats,
    delete_budget,
    expense_totals_by_category,
    export_transactions_csv,
    list_budgets,
    list_recurring,
    list_transactions,
    monthly_breakdown,
    total_pages,
    upsert_budget,
)
from schemas import (
    AnalyticsResponse,
    BudgetCreate,
    BudgetRead,
    BudgetWithSpending,
    CategoriesResponse,
    CategoryBreakdown,
    MonthlyBreakdown,
    RecurringCreate,
    RecurringRead,
    TransactionCreate,
    TransactionRead,
    TransactionsResponse,
    TransactionUpdate,
)

TransactionIdPath = Annotated[int, Path(ge=1, description="The transaction ID")]
BudgetIdPath = Annotated[int, Path(ge=1, description="The budget ID")]
RecurringIdPath = Annotated[int, Path(ge=1, description="The recurring transaction ID")]


def _default_date() -> datetime:
    return datetime.now()


def _advance_next_date(current: datetime, frequency: str) -> datetime:
    if frequency == "weekly":
        return current + timedelta(weeks=1)
    return current + timedelta(days=30)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    run_migrations()
    yield


app = FastAPI(title="Smart Finance Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/api", tags=["finance"])


@router.get("/categories", response_model=CategoriesResponse)
def get_categories() -> CategoriesResponse:
    return CategoriesResponse(
        income=INCOME_CATEGORIES,
        expense=EXPENSE_CATEGORIES,
        all=ALL_CATEGORIES,
    )


@router.get("/transactions", response_model=TransactionsResponse)
def get_transactions(
    db: DBDep,
    type: str | None = Query(None, pattern="^(income|expense)$"),
    category: str | None = None,
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
    search: str | None = Query(None, max_length=200),
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
) -> TransactionsResponse:
    from sqlalchemy import select

    filter_stmt = select(TxModel)
    filter_stmt = _apply_transaction_filters(
        filter_stmt,
        tx_type=type,
        category=category,
        date_from=from_date,
        date_to=to_date,
        search=search,
    )

    transactions, total = list_transactions(
        db,
        tx_type=type,
        category=category,
        date_from=from_date,
        date_to=to_date,
        search=search,
        page=page,
        page_size=page_size,
    )
    stats = compute_stats(db, filter_stmt)
    pages = total_pages(total, page_size)

    return TransactionsResponse(
        transactions=transactions,
        stats=stats,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=pages,
    )


@router.get("/transactions/export")
def export_transactions(
    db: DBDep,
    type: str | None = Query(None, pattern="^(income|expense)$"),
    category: str | None = None,
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
    search: str | None = Query(None, max_length=200),
) -> PlainTextResponse:
    csv_data = export_transactions_csv(
        db,
        tx_type=type,
        category=category,
        date_from=from_date,
        date_to=to_date,
        search=search,
    )
    return PlainTextResponse(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="transactions.csv"'},
    )


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(
    db: DBDep,
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
) -> AnalyticsResponse:
    from sqlalchemy import select

    filter_stmt = _apply_transaction_filters(
        select(TxModel),
        date_from=from_date,
        date_to=to_date,
    )
    stats = compute_stats(db, filter_stmt)

    by_category = [
        CategoryBreakdown(category=cat, total=total)
        for cat, total in category_breakdown(
            db, tx_type="expense", date_from=from_date, date_to=to_date
        )
    ]
    by_month = [
        MonthlyBreakdown(month=month, income=income, expense=expense)
        for month, income, expense in monthly_breakdown(
            db, date_from=from_date, date_to=to_date
        )
    ]

    return AnalyticsResponse(stats=stats, by_category=by_category, by_month=by_month)


@router.post(
    "/transactions",
    status_code=status.HTTP_201_CREATED,
    response_model=TransactionRead,
)
def create_transaction(payload: TransactionCreate, db: DBDep) -> TransactionRead:
    data = payload.model_dump()
    if data.get("date") is None:
        data["date"] = _default_date()
    transaction = Transaction(**data)
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.put("/transactions/{transaction_id}", response_model=TransactionRead)
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
        data["date"] = _default_date()
    for field, value in data.items():
        setattr(transaction, field, value)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: TransactionIdPath, db: DBDep) -> None:
    transaction = db.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
    db.delete(transaction)
    db.commit()


@router.get("/budgets", response_model=list[BudgetWithSpending])
def get_budgets(
    db: DBDep,
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
) -> list[BudgetWithSpending]:
    budgets = list_budgets(db)
    spent_by_category = expense_totals_by_category(
        db, date_from=from_date, date_to=to_date
    )

    result: list[BudgetWithSpending] = []
    for budget in budgets:
        spent = spent_by_category.get(budget.category, Decimal("0"))
        result.append(
            BudgetWithSpending(
                id=budget.id,
                category=budget.category,
                amount=budget.amount,
                spent=spent,
                remaining=budget.amount - spent,
            )
        )
    return result


@router.put("/budgets", response_model=BudgetRead)
def set_budget(payload: BudgetCreate, db: DBDep) -> BudgetRead:
    return upsert_budget(db, payload.category, payload.amount)


@router.delete("/budgets/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_budget(budget_id: BudgetIdPath, db: DBDep) -> None:
    if not delete_budget(db, budget_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found"
        )


@router.get("/recurring", response_model=list[RecurringRead])
def get_recurring(db: DBDep) -> list[RecurringRead]:
    return list_recurring(db)


@router.post(
    "/recurring",
    status_code=status.HTTP_201_CREATED,
    response_model=RecurringRead,
)
def create_recurring(payload: RecurringCreate, db: DBDep) -> RecurringRead:
    recurring = RecurringTransaction(**payload.model_dump())
    db.add(recurring)
    db.commit()
    db.refresh(recurring)
    return recurring


@router.delete("/recurring/{recurring_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring(recurring_id: RecurringIdPath, db: DBDep) -> None:
    recurring = db.get(RecurringTransaction, recurring_id)
    if recurring is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found",
        )
    db.delete(recurring)
    db.commit()


@router.post(
    "/recurring/{recurring_id}/post",
    status_code=status.HTTP_201_CREATED,
    response_model=TransactionRead,
)
def post_recurring(recurring_id: RecurringIdPath, db: DBDep) -> TransactionRead:
    recurring = db.get(RecurringTransaction, recurring_id)
    if recurring is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found",
        )

    transaction = Transaction(
        type=recurring.type,
        amount=recurring.amount,
        category=recurring.category,
        description=recurring.description,
        date=recurring.next_date,
    )
    db.add(transaction)
    recurring.next_date = _advance_next_date(recurring.next_date, recurring.frequency)
    db.commit()
    db.refresh(transaction)
    return transaction


app.include_router(router)
