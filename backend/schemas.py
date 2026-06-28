from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from constants import EXPENSE_CATEGORIES, INCOME_CATEGORIES

TransactionType = Literal["income", "expense"]
RecurringFrequency = Literal["weekly", "monthly"]
NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


def _validate_category_for_type(category: str, tx_type: str) -> str:
    allowed = INCOME_CATEGORIES if tx_type == "income" else EXPENSE_CATEGORIES
    if category not in allowed:
        allowed_list = ", ".join(allowed)
        raise ValueError(f"Category must be one of: {allowed_list}")
    return category


class TransactionBase(BaseModel):
    type: TransactionType
    amount: Decimal = Field(gt=0, decimal_places=2)
    category: NonEmptyStr
    description: str | None = None
    date: datetime | None = None

    @field_validator("category")
    @classmethod
    def category_matches_type(cls, category: str, info) -> str:
        tx_type = info.data.get("type")
        if tx_type is not None:
            return _validate_category_for_type(category, tx_type)
        return category


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(TransactionBase):
    pass


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: TransactionType
    amount: Decimal
    category: str
    description: str | None = None
    date: datetime


class Stats(BaseModel):
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal


class TransactionsResponse(BaseModel):
    transactions: list[TransactionRead]
    stats: Stats
    total: int
    page: int
    page_size: int
    total_pages: int


class CategoryBreakdown(BaseModel):
    category: str
    total: Decimal


class MonthlyBreakdown(BaseModel):
    month: str
    income: Decimal
    expense: Decimal


class AnalyticsResponse(BaseModel):
    stats: Stats
    by_category: list[CategoryBreakdown]
    by_month: list[MonthlyBreakdown]


class MonthComparison(BaseModel):
    current: Decimal
    previous: Decimal
    change_pct: float | None = None


class DashboardResponse(BaseModel):
    month: str
    income: Decimal
    expense: Decimal
    balance: Decimal
    savings_rate: float
    expense_comparison: MonthComparison
    top_category: str | None = None
    top_category_amount: Decimal
    budgets_total: int
    budgets_over: int
    transaction_count: int


class BudgetBase(BaseModel):
    category: NonEmptyStr
    amount: Decimal = Field(gt=0, decimal_places=2)

    @field_validator("category")
    @classmethod
    def category_is_expense(cls, category: str) -> str:
        if category not in EXPENSE_CATEGORIES:
            allowed_list = ", ".join(EXPENSE_CATEGORIES)
            raise ValueError(f"Budget category must be one of: {allowed_list}")
        return category


class BudgetCreate(BudgetBase):
    pass


class BudgetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: str
    amount: Decimal


class BudgetWithSpending(BudgetRead):
    spent: Decimal
    remaining: Decimal


class RecurringBase(BaseModel):
    type: TransactionType
    amount: Decimal = Field(gt=0, decimal_places=2)
    category: NonEmptyStr
    description: str | None = None
    frequency: RecurringFrequency
    next_date: datetime

    @field_validator("category")
    @classmethod
    def category_matches_type(cls, category: str, info) -> str:
        tx_type = info.data.get("type")
        if tx_type is not None:
            return _validate_category_for_type(category, tx_type)
        return category


class RecurringCreate(RecurringBase):
    pass


class RecurringRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: TransactionType
    amount: Decimal
    category: str
    description: str | None = None
    frequency: RecurringFrequency
    next_date: datetime


class GoalBase(BaseModel):
    name: NonEmptyStr
    target_amount: Decimal = Field(gt=0, decimal_places=2)
    target_date: datetime | None = None


class GoalCreate(GoalBase):
    current_amount: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)


class GoalUpdate(GoalBase):
    current_amount: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)


class GoalContribute(BaseModel):
    amount: Decimal = Field(gt=0, decimal_places=2)


class GoalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    target_amount: Decimal
    current_amount: Decimal
    target_date: datetime | None = None
    remaining: Decimal
    progress_pct: float


class CategoriesResponse(BaseModel):
    income: tuple[str, ...]
    expense: tuple[str, ...]
    all: tuple[str, ...]
