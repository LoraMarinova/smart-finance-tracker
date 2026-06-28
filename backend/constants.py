"""Shared constants for the finance tracker API."""

INCOME_CATEGORIES = (
    "Salary",
    "Freelance",
    "Investments",
    "Gifts",
    "Other Income",
)

EXPENSE_CATEGORIES = (
    "Groceries",
    "Rent",
    "Mortgage",
    "Utilities",
    "Transport",
    "Dining Out",
    "Entertainment",
    "Healthcare",
    "Shopping",
    "Subscriptions",
    "Other Expense",
)

ALL_CATEGORIES = INCOME_CATEGORIES + EXPENSE_CATEGORIES

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 50
