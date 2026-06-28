# AGENTS.md

Guidance for AI agents working in this repository.

## Project

Smart Finance Tracker — a local-only, three-tier personal finance app for logging income/expenses with filters, analytics, budgets, recurring templates, and CSV export. No authentication; runs on the developer's machine only. See [docs/PLAN.md](docs/PLAN.md) for the full design.

## Tech stack

- Backend: FastAPI + Uvicorn, SQLAlchemy ORM, Pydantic v2, Alembic (Python 3.14)
- Frontend: React 18 + Vite, Recharts, plain `fetch` for HTTP
- Database: SQLite file (`finance.db`), schema via Alembic migrations on startup
- DevOps: pytest, Vitest, ruff, Docker Compose, GitHub Actions CI

## Structure

- `backend/` — `main.py` (app + routes), `repository.py` (queries/aggregates), `database.py`, `models.py`, `schemas.py`, `constants.py`, `alembic/`, `tests/`
- `frontend/` — Vite React app: `src/App.jsx`, `components/`, `api.js`, `validation.js`
- `docs/` — project plan and notes

## API

Base path `/api`. Key endpoints:

- `GET /transactions` — paginated list + filtered stats (`total_income`, `total_expense`, `balance`)
- `GET /transactions/export` — CSV with same query filters
- `GET /analytics` — category and monthly breakdowns
- `GET /categories` — predefined category lists
- `GET/PUT/DELETE /budgets` — category spending limits
- `GET/POST/DELETE /recurring`, `POST /recurring/{id}/post` — recurring templates

`POST`/`PUT` validate input; `PUT`/`DELETE` return 404 for unknown IDs.

## Conventions

- Core entity: `Transaction` — `id`, `type` ("income" | "expense"), `amount` (Decimal), `category` (from predefined lists), `description` (optional), `date`
- Categories are validated in Pydantic against `constants.py` lists
- Amount must be strictly positive (`gt=0`); invalid input returns HTTP 422
- Refresh UI state after every create/update/delete
- Do not add authentication or multi-user features; this is intentionally single-user and local

## Run commands

Backend (from `backend/`):

```powershell
python -m venv .venv; .venv\Scripts\activate; pip install -r requirements.txt; uvicorn main:app --reload
```

Frontend (from `frontend/`):

```powershell
npm install; npm run dev
```

Docker: `docker compose up --build` from repo root.

Backend runs on `http://localhost:8000`, frontend dev server on `http://localhost:5173`.

## Tests

```powershell
cd backend; pip install -r requirements-dev.txt; pytest; ruff check .
cd frontend; npm test            # Vitest unit tests (validation logic)
cd frontend; npm run test:e2e    # Playwright UI/E2E tests (needs: npx playwright install chromium)
```

- Backend unit/integration tests: pytest + FastAPI `TestClient` in `backend/tests/`.
- Frontend unit tests: Vitest in `frontend/src/**` (scoped to `src/`, excludes `e2e/`).
- Frontend UI/E2E tests: Playwright specs in `frontend/e2e/`. Playwright launches the backend (on an isolated `e2e_finance.db` via `FINANCE_DB_PATH`) and the Vite dev server automatically; it relies on `backend/.venv` existing.

## Definition of done

- ALWAYS test your changes before telling the user the work is done. Do not claim something works without verifying it.
- Backend changes: run `pytest` and `ruff check .` (from `backend/`) and confirm both pass.
- Frontend changes: run `npm test` and `npm run build` (from `frontend/`) and confirm both pass.
- If a change can't be covered by existing tests, add a test or run the relevant command/flow to verify it manually, and say exactly how you verified it.
- If verification fails or is skipped for any reason, say so explicitly instead of implying success.
