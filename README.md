# Smart Finance Tracker

A local-only personal finance tracker for logging income and expenses with real-time balance, filters, analytics charts, budgets, recurring templates, and CSV export. Built as a three-tier app: SQLite database, FastAPI REST API, and a React (Vite) UI. **No authentication** — intended to run on your machine only.

## Features

- Full CRUD for transactions with server-side validation
- **Filters & search** — type, category, date range, text search
- **Pagination** for large transaction lists
- **Analytics** — monthly income vs expense bar chart, category pie chart
- **Predefined categories** — validated dropdowns for income and expense
- **Budgets** — monthly spending limits per category with progress bars
- **Recurring templates** — post scheduled entries on demand (no background scheduler)
- **CSV export** — download filtered transactions
- **Dark mode** — persisted in browser storage
- Toast notifications and delete confirmation dialogs
- Alembic migrations, pytest + Vitest tests, Docker Compose, GitHub Actions CI

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

Tests run against a temporary throwaway SQLite database, so they never touch your real `finance.db`.

### Frontend tests & build

**Prerequisites:** Node dependencies installed. If you completed the frontend first-time setup (`npm install`), this is already done; otherwise run it once:

```powershell
cd frontend
npm install
```

`npm test` runs the **Vitest** unit tests (currently the form-validation logic). Then optionally a production build:

```powershell
npm test
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

Playwright automatically starts the backend (on an isolated `e2e_finance.db`, so your real data is untouched) and the Vite dev server, runs the tests, then shuts them down. You do **not** need the servers running beforehand. For an interactive runner, use `npm run test:e2e:ui`.

## API

Base path: `/api`

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/categories` | Predefined income/expense category lists |
| GET | `/transactions` | Paginated list + filtered stats (`type`, `category`, `from`, `to`, `search`, `page`, `page_size`) |
| GET | `/transactions/export` | CSV export with same filters |
| GET | `/analytics` | Stats, category breakdown, monthly breakdown |
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

Amounts use `Decimal` (12,2) in the database. Invalid input returns HTTP 422; missing IDs return 404.

## Opening the database

The SQLite file is at `backend/finance.db`. Start the backend once before opening it.

- **Cursor / VS Code:** SQLite Viewer extension — click `backend/finance.db`
- **DB Browser for SQLite:** [sqlitebrowser.org](https://sqlitebrowser.org/)
- **API:** http://localhost:8000/docs or http://localhost:8000/api/transactions
