# Finance Tracker

A local-only personal finance app: FastAPI + SQLite REST API with full CRUD, filters, analytics, budgets, and recurring templates, plus a React (Vite) UI with charts, export, and dark mode.

No auth — runs locally on the developer's machine.

```mermaid
flowchart LR
  UI[React + Vite UI] -->|fetch JSON| API[FastAPI REST API]
  API -->|SQLAlchemy + Alembic| DB[(SQLite finance.db)]
```

## Tech stack

- Backend: FastAPI, Uvicorn, SQLAlchemy, Pydantic v2, Alembic (Python 3.14)
- Frontend: React 18 + Vite, Recharts, plain `fetch`
- DB: SQLite file (`finance.db`), Alembic migrations on startup
- Quality: pytest, Vitest, ruff, Docker Compose, GitHub Actions

## Project layout

- `backend/` — FastAPI app
  - `main.py` — app, CORS, API routes
  - `repository.py` — SQL queries and aggregates
  - `constants.py` — predefined categories
  - `database.py` — engine, session, migration runner
  - `models.py` — Transaction, Budget, RecurringTransaction
  - `schemas.py` — Pydantic models + validation
  - `alembic/` — database migrations
  - `tests/` — pytest suite
- `frontend/` — Vite React app
  - `BalanceSummary`, `TransactionForm`, `TransactionList`, `FilterBar`, `ChartsPanel`, `BudgetPanel`, `RecurringPanel`
  - `api.js`, `validation.js`
- `docker-compose.yml` — one-command local stack
- `.github/workflows/ci.yml` — CI pipeline

## Database

### Transaction

- `id`, `type` ("income" | "expense"), `amount` (Numeric 12,2), `category`, `description` (optional), `date`

### Budget

- `id`, `category` (unique), `amount` — monthly limit per expense category

### RecurringTransaction

- `id`, `type`, `amount`, `category`, `description`, `frequency` ("weekly" | "monthly"), `next_date`

## API endpoints

- `GET /api/categories` — income/expense category lists
- `GET /api/transactions` — paginated list + filtered stats; query: `type`, `category`, `from`, `to`, `search`, `page`, `page_size`
- `GET /api/transactions/export` — CSV download with same filters
- `GET /api/analytics` — stats, expense-by-category, monthly income/expense
- `POST/PUT/DELETE /api/transactions` — CRUD
- `GET/PUT/DELETE /api/budgets` — budget management
- `GET/POST/DELETE /api/recurring`, `POST /api/recurring/{id}/post` — recurring templates

## Validation

- `amount` strictly positive, stored as Decimal
- `type` restricted to `"income"` / `"expense"`
- `category` must match predefined list for the transaction type
- Invalid input → HTTP 422

## Frontend features

- Balance summary (income, expense, net)
- Analytics charts (monthly bar, category pie)
- Transaction form with category dropdown
- Filters, search, pagination, CSV export
- Budget progress bars
- Recurring templates with manual "Post now"
- Toast notifications, delete confirmations, dark mode

## Run instructions

See [README.md](../README.md).

## Notes

- Single-user, local-only — no authentication by design
- Recurring entries are posted manually (no cron/scheduler)
- Delete old `finance.db` when upgrading from pre-Alembic versions
