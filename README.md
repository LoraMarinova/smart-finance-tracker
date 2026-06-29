# Smart Finance Tracker

[![CI](https://github.com/LoraMarinova/smart-finance-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/LoraMarinova/smart-finance-tracker/actions/workflows/ci.yml)

A local-only personal finance tracker for logging income and expenses with real-time balance, filters, analytics charts, budgets, recurring templates, and CSV export. Built as a three-tier app: SQLite database, FastAPI REST API, and a React (Vite) UI. **No authentication** — intended to run on your machine only.

## Features

- Full CRUD for transactions with server-side validation
- **Dashboard** — current-month KPIs: net, savings rate, spend vs. last month, top category, budget health
- **Filters & search** — type, category, date range (with quick presets), text search
- **Pagination** for large transaction lists (10/25/50 per page)
- **Analytics** — monthly income vs expense bar chart, category pie chart
- **Predefined categories** — validated dropdowns for income and expense
- **Budgets** — monthly spending limits per category with progress bars
- **Recurring templates** — auto-posted when due (with manual "Post now" too)
- **Savings goals** — set targets and track contributions with progress bars
- **CSV export** — download filtered transactions
- **Dark mode** — persisted in browser storage
- Skeleton loaders, toast notifications, and delete confirmation dialogs
- Structured JSON error responses and tagged OpenAPI docs
- Alembic migrations, pytest + Vitest + Playwright tests, Docker Compose, GitHub Actions CI

## Tech stack

- Backend: FastAPI, Uvicorn, SQLAlchemy, Pydantic v2, Alembic (Python 3.11+)
- Frontend: React 18 + Vite, Recharts, plain `fetch`
- Database: SQLite (`backend/finance.db`), migrated via Alembic on startup

## Project structure

```
backend/       FastAPI app (main.py, repository.py, models.py, schemas.py, alembic/)
frontend/      React + Vite app (components, api.js, charts, filters)
docs/          Project plan
docker-compose.yml
.github/       CI workflow
```

## Prerequisites

- Python 3.11+ (developed on 3.14)
- Node.js 18+ and npm
- Optional: Docker for one-command startup

## Running the app

Run the backend and frontend in two separate terminals.

### 1. Backend (http://localhost:8000)

**First-time setup** (run once, from the repo root in PowerShell):

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

**Run the backend** (every time):

```powershell
cd backend
.venv\Scripts\activate
uvicorn main:app --reload
```

Interactive API docs: http://localhost:8000/docs

The database schema is created/updated automatically on startup via Alembic migrations, so no manual database setup is needed.

### 2. Frontend (http://localhost:5173)

In a second terminal.

**First-time setup** (run once):

```powershell
cd frontend
npm install
```

**Run the frontend** (every time):

```powershell
cd frontend
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the backend, so start the backend first.

### 3. Stopping the servers

If a server runs in a terminal you can see, click it and press `Ctrl + C`.

If you can't find the terminal, stop the servers by port in PowerShell:

```powershell
# Stop the backend (port 8000)
Get-NetTCPConnection -LocalPort 8000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Stop the frontend (port 5173)
Get-NetTCPConnection -LocalPort 5173 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Verify nothing is still listening (prints nothing when both are stopped):

```powershell
Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue
```

### Docker Compose

```powershell
docker compose up --build
```

Backend: http://localhost:8000 · Frontend: http://localhost:5173

The frontend container proxies `/api` to the backend service via `API_PROXY_TARGET=http://backend:8000` (set in `docker-compose.yml`). Without that variable, the Vite dev server inside the container would point at itself instead of the backend.

## Development

### Backend tests & lint

**Prerequisites:** the backend virtual environment must exist and be activated, and the dev dependencies installed. If you completed the backend first-time setup, you only need to add the dev dependencies once:

```powershell
cd backend
.venv\Scripts\activate
pip install -r requirements-dev.txt
```

> If you never created the venv, run the backend first-time setup first (`python -m venv .venv`, activate, `pip install -r requirements.txt`).

Then run the tests and linter:

```powershell
pytest
ruff check .
```

Run tests with coverage (matches CI, which enforces a minimum):

```powershell
pytest --cov=. --cov-report=term-missing
```

Tests run against a temporary throwaway SQLite database, so they never touch your real `finance.db`. Environment-driven configuration (DB path, recurring poll interval, CORS origins) is centralized in `backend/config.py` (Pydantic `Settings`).

### Frontend tests & build

**Prerequisites:** Node dependencies installed. If you completed the frontend first-time setup (`npm install`), this is already done; otherwise run it once:

```powershell
cd frontend
npm install
```

`npm test` runs the **Vitest** unit tests (form-validation logic and date-range presets). There is also JSDoc-based type checking and coverage:

```powershell
npm test
npm run typecheck      # tsc --checkJs over the pure logic modules (jsconfig.json)
npm run test:coverage  # Vitest with v8 coverage (enforces thresholds)
npm run build
```

### End-to-end (UI) tests with Playwright

Genuine browser-based UI tests live in `frontend/e2e/` and run with **Playwright**. They drive the real app in Chromium — adding, filtering, and deleting transactions, validation, and dark mode.

**Prerequisites (run once):**

- Backend virtual environment created (`backend/.venv`) with `requirements.txt` installed — Playwright starts the backend itself using that interpreter.
- Node dependencies installed (`npm install`).
- Chromium downloaded for Playwright:

```powershell
cd frontend
npx playwright install chromium
```

**Run the E2E tests:**

```powershell
cd frontend
npm run test:e2e
```

Playwright automatically starts **dedicated test servers** on ports **8001** (backend) and **5174** (frontend), using an isolated `e2e_finance.db` — your real `finance.db` on port 8000 is never touched. Each test run clears only the E2E database. You do **not** need (and should not rely on) your normal dev servers being up. For an interactive runner, use `npm run test:e2e:ui`.

GitHub Actions CI runs the same suite in the `e2e` job (Chromium + backend `.venv` + `npm ci`).

> **Important:** E2E tests delete all transactions in the test database before each test. An earlier version could accidentally reuse your dev backend on port 8000 and wipe real data; the config now uses separate ports and refuses to clear data unless the backend reports `database: "e2e"`.

### Code style & pre-commit hooks

Formatting and linting are enforced by [pre-commit](https://pre-commit.com/) (`ruff` lint + format for the backend, Prettier for the frontend, plus baseline file hooks). Enable it once:

```powershell
cd backend
.venv\Scripts\activate
pre-commit install
```

Normalize the whole repo in one pass (optional, one-time): `pre-commit run --all-files`. Frontend formatting alone: `cd frontend; npm run format`.

## API

Base path: `/api`

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/health` | Health check: `status`, `database`, `db_ok`, `version`, `uptime_seconds` (HTTP 503 when the DB check fails) |
| GET | `/categories` | Predefined income/expense category lists |
| GET | `/transactions` | Paginated list + filtered stats (`type`, `category`, `from`, `to`, `search`, `page`, `page_size`) |
| GET | `/transactions/export` | CSV export with same filters |
| GET | `/analytics` | Stats, category breakdown, monthly breakdown |
| GET | `/dashboard` | Current-month KPIs and month-over-month expense comparison |
| POST | `/transactions` | Create transaction |
| PUT | `/transactions/{id}` | Update transaction |
| DELETE | `/transactions/{id}` | Delete transaction |
| GET | `/budgets` | Budgets with spent/remaining for date range |
| PUT | `/budgets` | Set or update a category budget |
| DELETE | `/budgets/{id}` | Remove budget |
| GET | `/recurring` | List recurring templates |
| POST | `/recurring` | Create recurring template |
| POST | `/recurring/{id}/post` | Post one occurrence and advance next date |
| DELETE | `/recurring/{id}` | Delete recurring template |
| GET | `/goals` | List savings goals with progress |
| POST | `/goals` | Create a savings goal |
| PUT | `/goals/{id}` | Update a savings goal |
| POST | `/goals/{id}/contribute` | Add a contribution to a goal |
| DELETE | `/goals/{id}` | Delete a savings goal |

Amounts use `Decimal` (12,2) in the database. Invalid input returns HTTP 422; missing IDs return 404. Errors use a structured shape: `{ "error": { "code", "message", "field", "details" } }` (`field` is set for single-field validation errors). The error models and per-route `404`/`422` responses are documented in the OpenAPI schema at `/docs`. Each request is logged (method, path, status, duration).

### Recurring auto-posting

Recurring templates are posted automatically:

- **On creation** — if a new template's next date is already due, it is posted immediately (so you don't wait for the poller).
- **On startup** — any occurrences that fell due while the app was offline are caught up.
- **While running** — a background poller posts due occurrences every `RECURRING_POLL_SECONDS` (default `3600`).

You can still use the **"Post now"** button to post a template early (before it is due). The poller is disabled for the isolated E2E database to keep tests deterministic.

Configuration is centralized in `backend/config.py` (Pydantic `Settings`); these environment variables override the defaults:

| Env var | Default | Purpose |
| ------- | ------- | ------- |
| `FINANCE_DB_PATH` | `backend/finance.db` | Override the SQLite file location (used by E2E) |
| `FINANCE_TESTING` | `false` | Skip startup migrations/schedulers (set by pytest) |
| `RECURRING_POLL_SECONDS` | `3600` | How often the background poller posts due recurring entries |
| `CORS_ORIGINS` | localhost 5173/5174 | Allowed browser origins |

## Opening / viewing the database

Your data lives in **`backend/finance.db`** (a binary SQLite file). The throwaway
`backend/e2e_finance.db` is only used by Playwright tests and is normally empty —
that is expected, don't confuse it with your real data.

> **Important:** Do **not** open `finance.db` by double-clicking it into a normal
> editor tab. A SQLite file is binary, so a text editor shows garbage and looks
> "empty". Use one of the methods below instead.

### Quickest: view your data from the terminal (always accurate)

```powershell
cd backend
.venv\Scripts\activate
python -c "import sqlite3; [print(r) for r in sqlite3.connect('finance.db').execute('select * from transactions')]"
```

This reads the real file directly and is never cached, so it's the reliable way
to confirm what's stored.

### GUI options

- **Cursor / VS Code — SQLite Viewer extension:** install **SQLite Viewer**, then
  open `backend/finance.db` *through the extension* (not as a text file). If it
  looks empty, click the extension's **refresh** button — the viewer caches and
  does not auto-update when the running backend writes new rows.
- **DB Browser for SQLite:** [sqlitebrowser.org](https://sqlitebrowser.org/) →
  *File ▸ Open Database* ▸ `backend/finance.db` ▸ **Browse Data** tab. Click
  **Refresh** if you had it open while the app was writing.

### Through the running app

- **API:** http://localhost:8000/api/transactions
- **Swagger docs:** http://localhost:8000/docs
- **UI:** http://localhost:5173

> If the UI shows your transactions but a viewer shows the file empty, trust the
> UI/terminal — it's a viewer cache or a binary-opened-as-text issue, not data loss.
