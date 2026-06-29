import asyncio
import logging
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager, suppress
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, FastAPI, HTTPException, Path, Query, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import Response

from config import settings
from constants import (
    ALL_CATEGORIES,
    APP_VERSION,
    DEFAULT_PAGE_SIZE,
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    MAX_PAGE_SIZE,
)
from database import (
    DBDep,
    SessionLocal,
    check_database_connection,
    is_e2e_database,
    run_migrations,
)
from models import Goal, Transaction
from models import Transaction as TxModel
from repository import (
    _apply_transaction_filters,
    category_breakdown,
    compute_stats,
    contribute_to_goal,
    dashboard_summary,
    delete_budget,
    delete_goal,
    expense_totals_by_category,
    export_transactions_csv,
    list_budgets,
    list_goals,
    list_recurring,
    list_transactions,
    monthly_breakdown,
    post_due_for_template,
    post_due_recurring,
    post_recurring_once,
    total_pages,
    update_goal,
    upsert_budget,
)
from repository import (
    create_goal as repo_create_goal,
)
from repository import (
    create_recurring as repo_create_recurring,
)
from repository import (
    delete_recurring as repo_delete_recurring,
)
from schemas import (
    AnalyticsResponse,
    BudgetCreate,
    BudgetRead,
    BudgetWithSpending,
    CategoriesResponse,
    CategoryBreakdown,
    DashboardResponse,
    ErrorResponse,
    GoalContribute,
    GoalCreate,
    GoalRead,
    GoalUpdate,
    HealthResponse,
    MonthlyBreakdown,
    RecurringCreate,
    RecurringRead,
    TransactionCreate,
    TransactionRead,
    TransactionsResponse,
    TransactionUpdate,
    _validate_category_for_type,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("finance")

_START_MONOTONIC = time.monotonic()

# Reusable OpenAPI documentation for the structured error responses.
ERROR_RESPONSES: dict[int | str, dict[str, object]] = {
    404: {"model": ErrorResponse, "description": "Resource not found"},
    422: {"model": ErrorResponse, "description": "Validation error"},
}

TransactionIdPath = Annotated[int, Path(ge=1, description="The transaction ID")]
BudgetIdPath = Annotated[int, Path(ge=1, description="The budget ID")]
RecurringIdPath = Annotated[int, Path(ge=1, description="The recurring transaction ID")]
GoalIdPath = Annotated[int, Path(ge=1, description="The savings goal ID")]

API_DESCRIPTION = """
Local-only personal finance REST API.

Track income and expenses with filters, search, and pagination; view analytics
and a dashboard of KPIs; manage category budgets, recurring templates (posted
automatically when due), and savings goals; and export filtered data to CSV.
"""

TAGS_METADATA = [
    {"name": "meta", "description": "Health checks and reference data."},
    {
        "name": "transactions",
        "description": "Create, list, filter, and export transactions.",
    },
    {
        "name": "analytics",
        "description": "Aggregated stats, dashboard, and breakdowns.",
    },
    {"name": "budgets", "description": "Per-category spending limits."},
    {"name": "recurring", "description": "Recurring templates, auto-posted when due."},
    {"name": "goals", "description": "Savings goals and contributions."},
]


def _default_date() -> datetime:
    return datetime.now()


async def _recurring_poller() -> None:
    """Periodically post due recurring transactions while the app runs."""
    interval = settings.recurring_poll_seconds
    while True:
        await asyncio.sleep(interval)
        try:
            with SessionLocal() as db:
                count = post_due_recurring(db)
            if count:
                logger.info("Auto-posted %d due recurring transaction(s)", count)
        except Exception:  # pragma: no cover - defensive background guard
            logger.exception("Recurring poller failed")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    run_migrations()

    poller: asyncio.Task[None] | None = None
    if not settings.finance_testing:
        # Catch up anything that fell due while the app was offline.
        with SessionLocal() as db:
            post_due_recurring(db)
        # Keep the background poller off the isolated E2E database so tests stay
        # deterministic; only run it for normal local use.
        if not is_e2e_database():
            poller = asyncio.create_task(_recurring_poller())

    yield

    if poller is not None:
        poller.cancel()
        with suppress(asyncio.CancelledError):
            await poller


app = FastAPI(
    title="Smart Finance Tracker API",
    description=API_DESCRIPTION,
    version=APP_VERSION,
    contact={"name": "Smart Finance Tracker"},
    license_info={"name": "MIT"},
    openapi_tags=TAGS_METADATA,
    lifespan=lifespan,
)


def _error_response(
    status_code: int,
    code: str,
    message: str,
    field: str | None = None,
    details: object = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "field": field,
                "details": details,
            }
        },
    )


_STATUS_CODES = {
    400: "bad_request",
    404: "not_found",
    409: "conflict",
    422: "validation_error",
    500: "internal_error",
}


def _first_invalid_field(errors: list[dict[str, object]]) -> str | None:
    """Best-effort extraction of the offending field name from validation errors."""
    if not errors:
        return None
    loc = errors[0].get("loc") or []
    parts = [
        part
        for part in loc
        if isinstance(part, str) and part not in ("body", "query", "path")
    ]
    return parts[-1] if parts else None


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    code = _STATUS_CODES.get(exc.status_code, "error")
    detail = exc.detail
    message = detail if isinstance(detail, str) else "Request failed"
    details = None if isinstance(detail, str) else detail
    return _error_response(exc.status_code, code, message, details=details)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = jsonable_encoder(exc.errors())
    return _error_response(
        422,
        "validation_error",
        "Validation failed",
        field=_first_invalid_field(errors),
        details=errors,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return _error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "internal_error",
        "An unexpected error occurred",
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s -> %d (%.1f ms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response

router = APIRouter(prefix="/api")


def _goal_read(goal: Goal) -> GoalRead:
    target = goal.target_amount
    current = goal.current_amount
    remaining = target - current
    if remaining < 0:
        remaining = Decimal("0")
    progress = float(min(current / target * 100, Decimal("100"))) if target > 0 else 0.0
    return GoalRead(
        id=goal.id,
        name=goal.name,
        target_amount=target,
        current_amount=current,
        target_date=goal.target_date,
        remaining=remaining,
        progress_pct=progress,
    )


@router.get(
    "/health",
    response_model=HealthResponse,
    tags=["meta"],
    summary="Service health check",
    response_description="Service status, DB connectivity, version, and uptime",
)
def health() -> JSONResponse:
    """Report database connectivity, app version, and uptime.

    Also exposes whether the isolated E2E database is in use. Returns HTTP 503
    with ``status: "degraded"`` when the database check fails.
    """
    db_ok = check_database_connection()
    payload = HealthResponse(
        status="ok" if db_ok else "degraded",
        database="e2e" if is_e2e_database() else "default",
        db_ok=db_ok,
        version=APP_VERSION,
        uptime_seconds=round(time.monotonic() - _START_MONOTONIC, 3),
    )
    status_code = status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=status_code, content=payload.model_dump())


@router.get(
    "/categories",
    response_model=CategoriesResponse,
    tags=["meta"],
    summary="List predefined categories",
)
def get_categories() -> CategoriesResponse:
    return CategoriesResponse(
        income=INCOME_CATEGORIES,
        expense=EXPENSE_CATEGORIES,
        all=ALL_CATEGORIES,
    )


@router.get(
    "/transactions",
    response_model=TransactionsResponse,
    tags=["transactions"],
    summary="List transactions with filters, search, and pagination",
)
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


@router.get(
    "/transactions/export",
    tags=["transactions"],
    summary="Export filtered transactions as CSV",
)
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


@router.get(
    "/analytics",
    response_model=AnalyticsResponse,
    tags=["analytics"],
    summary="Category and monthly breakdowns",
)
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


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    tags=["analytics"],
    summary="Current-month KPIs and month-over-month comparison",
)
def get_dashboard(db: DBDep) -> DashboardResponse:
    return dashboard_summary(db)


@router.post(
    "/transactions",
    status_code=status.HTTP_201_CREATED,
    response_model=TransactionRead,
    tags=["transactions"],
    summary="Create a transaction",
    response_description="The created transaction",
    responses=ERROR_RESPONSES,
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


@router.put(
    "/transactions/{transaction_id}",
    response_model=TransactionRead,
    tags=["transactions"],
    summary="Update a transaction",
    response_description="The updated transaction",
    responses=ERROR_RESPONSES,
)
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
    data = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No fields to update",
        )
    if "category" in data or "type" in data:
        _validate_category_for_type(
            data.get("category", transaction.category),
            data.get("type", transaction.type),
        )
    for field, value in data.items():
        setattr(transaction, field, value)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete(
    "/transactions/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["transactions"],
    summary="Delete a transaction",
    responses={404: ERROR_RESPONSES[404]},
)
def delete_transaction(transaction_id: TransactionIdPath, db: DBDep) -> None:
    transaction = db.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
    db.delete(transaction)
    db.commit()


@router.get(
    "/budgets",
    response_model=list[BudgetWithSpending],
    tags=["budgets"],
    summary="List budgets with spending progress",
)
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


@router.put(
    "/budgets",
    response_model=BudgetRead,
    tags=["budgets"],
    summary="Create or update a category budget",
    response_description="The saved budget",
    responses={422: ERROR_RESPONSES[422]},
)
def set_budget(payload: BudgetCreate, db: DBDep) -> BudgetRead:
    return upsert_budget(db, payload.category, payload.amount)


@router.delete(
    "/budgets/{budget_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["budgets"],
    summary="Delete a budget",
    responses={404: ERROR_RESPONSES[404]},
)
def remove_budget(budget_id: BudgetIdPath, db: DBDep) -> None:
    if not delete_budget(db, budget_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found"
        )


@router.get(
    "/recurring",
    response_model=list[RecurringRead],
    tags=["recurring"],
    summary="List recurring templates",
)
def get_recurring(db: DBDep) -> list[RecurringRead]:
    return list_recurring(db)


@router.post(
    "/recurring",
    status_code=status.HTTP_201_CREATED,
    response_model=RecurringRead,
    tags=["recurring"],
    summary="Create a recurring template",
    response_description="The created recurring template",
    responses={422: ERROR_RESPONSES[422]},
)
def create_recurring(payload: RecurringCreate, db: DBDep) -> RecurringRead:
    recurring = repo_create_recurring(db, payload.model_dump())
    # Post immediately if the new template is already due, so users don't have to
    # wait for the next poll cycle. "Post now" remains for posting early.
    post_due_for_template(db, recurring.id)
    db.refresh(recurring)
    return recurring


@router.delete(
    "/recurring/{recurring_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["recurring"],
    summary="Delete a recurring template",
    responses={404: ERROR_RESPONSES[404]},
)
def delete_recurring(recurring_id: RecurringIdPath, db: DBDep) -> None:
    if not repo_delete_recurring(db, recurring_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found",
        )


@router.post(
    "/recurring/{recurring_id}/post",
    status_code=status.HTTP_201_CREATED,
    response_model=TransactionRead,
    tags=["recurring"],
    summary="Manually post a recurring template now",
    response_description="The posted transaction",
    responses={404: ERROR_RESPONSES[404]},
)
def post_recurring(recurring_id: RecurringIdPath, db: DBDep) -> TransactionRead:
    transaction = post_recurring_once(db, recurring_id)
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found",
        )
    return transaction


@router.get(
    "/goals",
    response_model=list[GoalRead],
    tags=["goals"],
    summary="List savings goals",
)
def get_goals(db: DBDep) -> list[GoalRead]:
    return [_goal_read(goal) for goal in list_goals(db)]


@router.post(
    "/goals",
    status_code=status.HTTP_201_CREATED,
    response_model=GoalRead,
    tags=["goals"],
    summary="Create a savings goal",
    response_description="The created goal",
    responses={422: ERROR_RESPONSES[422]},
)
def create_goal(payload: GoalCreate, db: DBDep) -> GoalRead:
    goal = repo_create_goal(db, payload.model_dump())
    return _goal_read(goal)


@router.put(
    "/goals/{goal_id}",
    response_model=GoalRead,
    tags=["goals"],
    summary="Update a savings goal",
    response_description="The updated goal",
    responses=ERROR_RESPONSES,
)
def edit_goal(goal_id: GoalIdPath, payload: GoalUpdate, db: DBDep) -> GoalRead:
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No fields to update",
        )
    goal = update_goal(db, goal_id, **data)
    if goal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )
    return _goal_read(goal)


@router.delete(
    "/goals/{goal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["goals"],
    summary="Delete a savings goal",
    responses={404: ERROR_RESPONSES[404]},
)
def remove_goal(goal_id: GoalIdPath, db: DBDep) -> None:
    if not delete_goal(db, goal_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )


@router.post(
    "/goals/{goal_id}/contribute",
    response_model=GoalRead,
    tags=["goals"],
    summary="Add a contribution to a savings goal",
    response_description="The updated goal",
    responses=ERROR_RESPONSES,
)
def contribute_goal(
    goal_id: GoalIdPath, payload: GoalContribute, db: DBDep
) -> GoalRead:
    goal = contribute_to_goal(db, goal_id, payload.amount)
    if goal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )
    return _goal_read(goal)


app.include_router(router)
