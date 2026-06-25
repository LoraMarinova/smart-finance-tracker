# AGENTS.md

Guidance for AI agents working in this repository.

## Project

Smart Finance Tracker — a local-only, three-tier personal finance app for logging income/expenses with a real-time net balance. No authentication; runs on the developer's machine only. See [docs/PLAN.md](docs/PLAN.md) for the full design.

## Tech stack

- Backend: FastAPI + Uvicorn, SQLAlchemy ORM, Pydantic v2 (Python 3.14)
- Frontend: React 18 + Vite, plain `fetch` for HTTP
- Database: SQLite file (`finance.db`), tables auto-created on startup (no migration tool)

## Structure

- `backend/` — `main.py` (app + CRUD endpoints + CORS), `database.py`, `models.py`, `schemas.py`, `requirements.txt`
- `frontend/` — Vite React app: `src/App.jsx`, components, `api.js`
- `docs/` — project plan and notes

## API

Base path `/api/transactions`. The `GET` endpoint returns both the transaction list and computed stats (`total_income`, `total_expense`, `balance`). `POST`/`PUT` validate input; `PUT`/`DELETE` return 404 for unknown IDs.

## Conventions

- The core entity is a `Transaction`: `id`, `type` ("income" | "expense"), `amount`, `category`, `description` (optional), `date`.
- Validation lives in Pydantic schemas: `amount` must be strictly positive (`gt=0`); `type` is restricted to "income"/"expense". Invalid input returns HTTP 422.
- Keep the UI simple and clear — refresh state after every create/update/delete so the balance stays live.
- Do not add authentication or multi-user features; this is intentionally single-user and local.

## Run commands

Backend (from `backend/`):

```powershell
python -m venv .venv; .venv\Scripts\activate; pip install -r requirements.txt; uvicorn main:app --reload
```

Frontend (from `frontend/`):

```powershell
npm install; npm run dev
```

Backend runs on `http://localhost:8000`, frontend dev server on `http://localhost:5173`.
