# AGENTS.md

Guidance for AI agents working in this repository.

## Project

Smart Finance Tracker — a local-only, three-tier personal finance app for logging income/expenses with filters, analytics, budgets, recurring templates, and CSV export. No authentication; runs on the developer's machine only. See [README.md](README.md) for setup, run, test, and database instructions, and [docs/PLAN.md](docs/PLAN.md) for the full design.

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

- `GET /health` — app and database status
- `GET /dashboard` — monthly KPIs (savings rate, budget health, top category)
- `GET /transactions` — paginated list + filtered stats (`total_income`, `total_expense`, `balance`)
- `GET /transactions/export` — CSV with same query filters
- `GET /analytics` — category and monthly breakdowns
- `GET /categories` — predefined category lists
- `GET/PUT/DELETE /budgets` — category spending limits
- `GET/POST/DELETE /recurring`, `POST /recurring/{id}/post` — recurring templates
- `GET/POST/PUT/DELETE /goals`, `POST /goals/{id}/contribute` — savings goals

`POST`/`PUT` validate input; `PUT`/`DELETE` return 404 for unknown IDs. Errors use `{ "error": { "code", "message", "field", "details" } }`.

## Conventions

- Core entity: `Transaction` — `id`, `type` ("income" | "expense"), `amount` (Decimal), `category` (from predefined lists), `description` (optional), `date`
- Categories are validated in Pydantic against `constants.py` lists
- Amount must be strictly positive (`gt=0`); invalid input returns HTTP 422
- Refresh UI state after every create/update/delete
- Do not add authentication or multi-user features; this is intentionally single-user and local

### Validation must surface a message in the UI

Every backend validation rule must have a matching, visible message in the frontend — the user should never click a button and have "nothing happen."

- For each required field or constraint enforced in Pydantic (`gt=0`, allowed category, required string, etc.), the corresponding form must show a **relevant, field-level message** before submitting (mirror the pattern in `validation.js` + `TransactionForm.jsx`/`GoalPanel.jsx`: a pure validator returning `{ field: message }`, rendered as `.field-error` with `aria-invalid`).
- Put reusable, pure validators in `frontend/src/validation.js` and unit-test them in `validation.test.js`.
- Also handle server-side rejections: surface the API error message (HTTP 422/404) near the relevant form/panel via a toast or inline error — do not swallow it. The API returns `{ "error": { "code", "message", "details" } }`; `api.js` turns that into a readable message.
- When you add or change a backend constraint, update the matching frontend validation + message (and tests) in the same task.

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
- Frontend UI/E2E tests: Playwright specs in `frontend/e2e/`. Playwright starts dedicated servers on ports **8001/5174** with an isolated `e2e_finance.db` via `FINANCE_DB_PATH`; it must never reuse the dev backend on 8000. Helpers refuse to clear data unless `/api/health` reports `database: "e2e"`.

## Tests for new functionality

When you add or change behavior, **add tests in the same task** and **run them until they pass** before marking work complete.

| Change type | Where to add tests |
|-------------|-------------------|
| API routes, validation, queries, defaults | `backend/tests/test_transactions.py` (or a new `test_<domain>.py` if the feature is a separate domain) |
| Pure JS validation or utilities | `frontend/src/validation.test.js` or a co-located `*.test.js` next to the module |
| User-visible flows (forms, filters, pagination, export) | `frontend/e2e/*.spec.js` (extend an existing spec when it fits) |

Guidelines:

- Put new tests in the **existing file/suite** for that area when one exists; match naming and style (`test_*` in pytest, `describe`/`it` or `test()` in Vitest, `test()` in Playwright).
- Cover the new behavior: at least the happy path, plus validation or edge cases that matter (e.g. invalid input, empty state, limits).
- Run the relevant suite after adding tests (`pytest`, `npm test`, and `npm run test:e2e` when UI behavior changed) and report pass counts including your new tests.
- Do not ship new functionality without tests unless the user explicitly asked for no tests — and then say why in your reply.

## Definition of done

**Never mark work complete without running tests yourself.** Do not claim something works without verifying it.

Run every command below that applies to your changes, then report pass/fail counts in your reply.

### Backend changes (`backend/`)

```powershell
cd backend
.venv\Scripts\activate
pytest
ruff check .
```

### Frontend changes (`frontend/`)

```powershell
cd frontend
npm test
npm run build
```

### UI / E2E / full-stack changes

Also run Playwright when you changed user-facing flows, components wired to the API, or E2E config:

```powershell
cd frontend
npm run test:e2e
```

Prerequisite (once): `npx playwright install chromium`. E2E uses ports **8001/5174** and `e2e_finance.db` only.

### Cross-cutting changes

If you touched **both** backend and frontend, run **all** applicable suites above (pytest, ruff, Vitest, build, and E2E when UI behavior changed).

### Runnable app

When changes affect startup, ports, proxy, or migrations, also verify:

- `http://localhost:8000/api/health` responds
- `http://localhost:5173` returns HTTP 200 (start dev servers if needed, or state that you did not verify live)

### Restart servers so the running app reflects your changes

A long-running dev server can serve **stale code/schema**, which looks like a broken feature even when the code is correct (e.g. a new endpoint 404s, or a new table is missing because a migration never ran). After making changes, restart the relevant server so the user sees them live:

- **Backend (port 8000)** — restart after backend code, new endpoints, new dependencies, or **new Alembic migrations** (migrations only run on startup). Even with `uvicorn --reload`, a fresh start is the reliable way to apply migrations and load new routes.
- **Frontend (port 5173)** — Vite HMR covers most source edits, but restart after changes to `vite.config.js`, the `/api` proxy, env vars, or dependencies. Tell the user to refresh the browser after a backend restart.
- **How to restart (PowerShell):** stop the process by port, then relaunch.

```powershell
# Stop, then start the backend
Get-NetTCPConnection -LocalPort 8000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
cd backend; .venv\Scripts\activate; uvicorn main:app --reload

# Stop, then start the frontend
Get-NetTCPConnection -LocalPort 5173 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
cd frontend; npm run dev
```

Never restart onto the E2E ports (**8001/5174**) or point the dev backend at `e2e_finance.db`.

### If something cannot be tested

- Add or extend a test, **or** run a manual flow and describe exactly how you verified it.
- If verification failed or was skipped, say so explicitly — never imply success.

## Documentation and consistency

When you change behavior, keep the repo accurate and coherent — do not leave stale docs or half-updated code behind.

### Update README.md

Update [README.md](README.md) when your changes affect anything a developer or user needs to know, including:

- setup, run, stop, or test commands
- ports, environment variables, or database paths
- API endpoints, request/response shape, or defaults (e.g. pagination size)
- new features, scripts, or prerequisites
- troubleshooting notes discovered while implementing

Keep edits focused: update the relevant section only; do not rewrite unrelated parts of the README.

Also update [docs/PLAN.md](docs/PLAN.md) when the change is architectural or adds/removes major features.

### Update existing code when necessary

If your change makes old code, tests, or config wrong or misleading, fix those too in the same task — for example:

- constants, defaults, or validation that no longer match
- tests that assert outdated behavior
- E2E helpers or Playwright config affected by API or port changes
- agent/subagent docs (`AGENTS.md`, `.cursor/agents/`) when conventions change

Do not add parallel implementations or leave dead paths; prefer updating the existing pattern in place.
