import csv
import io
import math
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import Select, case, func, or_, select
from sqlalchemy.orm import Session

from constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from models import Budget, Goal, RecurringTransaction, Transaction
from schemas import DashboardResponse, MonthComparison, Stats


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


def advance_next_date(current: datetime, frequency: str) -> datetime:
    if frequency == "weekly":
        return current + timedelta(weeks=1)
    return current + timedelta(days=30)


def _catch_up_template(
    db: Session,
    template: RecurringTransaction,
    now: datetime,
    max_catch_up: int = 120,
) -> int:
    """Post every due occurrence for a single template, advancing its next_date.

    Capped by ``max_catch_up`` to avoid runaway inserts. Does not commit.
    """
    posted = 0
    while template.next_date <= now and posted < max_catch_up:
        db.add(
            Transaction(
                type=template.type,
                amount=template.amount,
                category=template.category,
                description=template.description,
                date=template.next_date,
            )
        )
        template.next_date = advance_next_date(template.next_date, template.frequency)
        posted += 1
    return posted


def post_due_recurring(
    db: Session, now: datetime | None = None, max_catch_up: int = 120
) -> int:
    """Post a transaction for every recurring occurrence that is now due.

    Catches up missed occurrences (e.g. after the app was offline) across all
    templates.
    """
    now = now or datetime.now()
    posted = sum(
        _catch_up_template(db, template, now, max_catch_up)
        for template in db.scalars(select(RecurringTransaction)).all()
    )
    if posted:
        db.commit()
    return posted


def post_due_for_template(
    db: Session,
    template_id: int,
    now: datetime | None = None,
    max_catch_up: int = 120,
) -> int:
    """Post due occurrences for one template (used right after it is created)."""
    template = db.get(RecurringTransaction, template_id)
    if template is None:
        return 0
    posted = _catch_up_template(db, template, now or datetime.now(), max_catch_up)
    if posted:
        db.commit()
    return posted


def _month_bounds(moment: datetime) -> tuple[datetime, datetime]:
    start = datetime(moment.year, moment.month, 1)
    if moment.month == 12:
        nxt = datetime(moment.year + 1, 1, 1)
    else:
        nxt = datetime(moment.year, moment.month + 1, 1)
    return start, nxt


def dashboard_summary(
    db: Session, now: datetime | None = None
) -> DashboardResponse:
    now = now or datetime.now()
    cur_start, cur_end = _month_bounds(now)
    prev_start, prev_end = _month_bounds(cur_start - timedelta(days=1))
    last_micro = timedelta(microseconds=1)

    cur_filter = _apply_transaction_filters(
        select(Transaction), date_from=cur_start, date_to=cur_end - last_micro
    )
    cur_stats = compute_stats(db, cur_filter)

    prev_filter = _apply_transaction_filters(
        select(Transaction), date_from=prev_start, date_to=prev_end - last_micro
    )
    prev_expense = compute_stats(db, prev_filter).total_expense

    change_pct: float | None = None
    if prev_expense > 0:
        change_pct = float(
            (cur_stats.total_expense - prev_expense) / prev_expense * 100
        )

    savings_rate = 0.0
    if cur_stats.total_income > 0:
        savings_rate = float(cur_stats.balance / cur_stats.total_income * 100)

    categories = category_breakdown(
        db, tx_type="expense", date_from=cur_start, date_to=cur_end - last_micro
    )
    top_category = categories[0][0] if categories else None
    top_category_amount = categories[0][1] if categories else Decimal("0")

    budgets = list_budgets(db)
    spent = expense_totals_by_category(
        db, date_from=cur_start, date_to=cur_end - last_micro
    )
    budgets_over = sum(
        1 for b in budgets if spent.get(b.category, Decimal("0")) > b.amount
    )

    tx_count = db.scalar(
        select(func.count()).select_from(cur_filter.subquery())
    ) or 0

    return DashboardResponse(
        month=now.strftime("%Y-%m"),
        income=cur_stats.total_income,
        expense=cur_stats.total_expense,
        balance=cur_stats.balance,
        savings_rate=savings_rate,
        expense_comparison=MonthComparison(
            current=cur_stats.total_expense,
            previous=prev_expense,
            change_pct=change_pct,
        ),
        top_category=top_category,
        top_category_amount=top_category_amount,
        budgets_total=len(budgets),
        budgets_over=budgets_over,
        transaction_count=tx_count,
    )


def list_goals(db: Session) -> list[Goal]:
    return list(db.scalars(select(Goal).order_by(Goal.id)).all())


def update_goal(db: Session, goal_id: int, **fields: object) -> Goal | None:
    goal = db.get(Goal, goal_id)
    if goal is None:
        return None
    for key, value in fields.items():
        setattr(goal, key, value)
    db.commit()
    db.refresh(goal)
    return goal


def delete_goal(db: Session, goal_id: int) -> bool:
    goal = db.get(Goal, goal_id)
    if goal is None:
        return False
    db.delete(goal)
    db.commit()
    return True


def contribute_to_goal(db: Session, goal_id: int, amount: Decimal) -> Goal | None:
    goal = db.get(Goal, goal_id)
    if goal is None:
        return None
    goal.current_amount = goal.current_amount + amount
    db.commit()
    db.refresh(goal)
    return goal
