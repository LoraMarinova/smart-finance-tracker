import csv
import io
import math
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Select, case, func, or_, select
from sqlalchemy.orm import Session

from constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from models import Budget, RecurringTransaction, Transaction
from schemas import Stats


def _apply_transaction_filters(
    stmt: Select,
    *,
    tx_type: str | None = None,
    category: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
) -> Select:
    if tx_type is not None:
        stmt = stmt.where(Transaction.type == tx_type)
    if category is not None:
        stmt = stmt.where(Transaction.category == category)
    if date_from is not None:
        stmt = stmt.where(Transaction.date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Transaction.date <= date_to)
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Transaction.category.ilike(pattern),
                Transaction.description.ilike(pattern),
            )
        )
    return stmt


def compute_stats(db: Session, stmt: Select | None = None) -> Stats:
    base = select(
        func.coalesce(
            func.sum(case((Transaction.type == "income", Transaction.amount), else_=0)),
            0,
        ).label("total_income"),
        func.coalesce(
            func.sum(
                case((Transaction.type == "expense", Transaction.amount), else_=0)
            ),
            0,
        ).label("total_expense"),
    ).select_from(Transaction)

    if stmt is not None:
        filtered_ids = stmt.with_only_columns(Transaction.id).subquery()
        base = base.where(Transaction.id.in_(select(filtered_ids.c.id)))

    row = db.execute(base).one()
    total_income = Decimal(str(row.total_income))
    total_expense = Decimal(str(row.total_expense))
    return Stats(
        total_income=total_income,
        total_expense=total_expense,
        balance=total_income - total_expense,
    )


def list_transactions(
    db: Session,
    *,
    tx_type: str | None = None,
    category: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> tuple[list[Transaction], int]:
    page_size = min(max(page_size, 1), MAX_PAGE_SIZE)
    page = max(page, 1)

    base = select(Transaction)
    filtered = _apply_transaction_filters(
        base,
        tx_type=tx_type,
        category=category,
        date_from=date_from,
        date_to=date_to,
        search=search,
    )

    total = db.scalar(select(func.count()).select_from(filtered.subquery())) or 0

    rows = db.scalars(
        filtered.order_by(Transaction.date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return list(rows), total


def category_breakdown(
    db: Session,
    *,
    tx_type: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> list[tuple[str, Decimal]]:
    stmt = (
        select(Transaction.category, func.sum(Transaction.amount).label("total"))
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
    )
    stmt = _apply_transaction_filters(
        stmt,
        tx_type=tx_type,
        date_from=date_from,
        date_to=date_to,
    )
    rows = db.execute(stmt).all()
    return [(row.category, Decimal(str(row.total))) for row in rows]


def monthly_breakdown(
    db: Session,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> list[tuple[str, Decimal, Decimal]]:
    month_key = func.strftime("%Y-%m", Transaction.date)
    stmt = (
        select(
            month_key.label("month"),
            func.coalesce(
                func.sum(
                    case((Transaction.type == "income", Transaction.amount), else_=0)
                ),
                0,
            ).label("income"),
            func.coalesce(
                func.sum(
                    case((Transaction.type == "expense", Transaction.amount), else_=0)
                ),
                0,
            ).label("expense"),
        )
        .group_by(month_key)
        .order_by(month_key)
    )
    stmt = _apply_transaction_filters(stmt, date_from=date_from, date_to=date_to)
    rows = db.execute(stmt).all()
    return [
        (row.month, Decimal(str(row.income)), Decimal(str(row.expense))) for row in rows
    ]


def export_transactions_csv(
    db: Session,
    *,
    tx_type: str | None = None,
    category: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
) -> str:
    stmt = select(Transaction).order_by(Transaction.date.desc())
    stmt = _apply_transaction_filters(
        stmt,
        tx_type=tx_type,
        category=category,
        date_from=date_from,
        date_to=date_to,
        search=search,
    )
    transactions = list(db.scalars(stmt).all())

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["id", "type", "amount", "category", "description", "date"])
    for tx in transactions:
        writer.writerow(
            [
                tx.id,
                tx.type,
                str(tx.amount),
                tx.category,
                tx.description or "",
                tx.date.isoformat(),
            ]
        )
    return buffer.getvalue()


def total_pages(total: int, page_size: int) -> int:
    if total == 0:
        return 0
    return math.ceil(total / page_size)


def list_budgets(db: Session) -> list[Budget]:
    return list(db.scalars(select(Budget).order_by(Budget.category)).all())


def upsert_budget(db: Session, category: str, amount: Decimal) -> Budget:
    budget = db.scalar(select(Budget).where(Budget.category == category))
    if budget is None:
        budget = Budget(category=category, amount=amount)
        db.add(budget)
    else:
        budget.amount = amount
    db.commit()
    db.refresh(budget)
    return budget


def delete_budget(db: Session, budget_id: int) -> bool:
    budget = db.get(Budget, budget_id)
    if budget is None:
        return False
    db.delete(budget)
    db.commit()
    return True


def expense_totals_by_category(
    db: Session,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> dict[str, Decimal]:
    rows = category_breakdown(
        db, tx_type="expense", date_from=date_from, date_to=date_to
    )
    return dict(rows)


def list_recurring(db: Session) -> list[RecurringTransaction]:
    return list(
        db.scalars(
            select(RecurringTransaction).order_by(RecurringTransaction.next_date)
        ).all()
    )
