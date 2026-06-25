# Smart Finance Tracker

A simple, local-only personal finance tracker for logging income and expenses with a real-time net balance. Built as a classic three-tier app: SQLite database, FastAPI REST API, and a React (Vite) UI. No authentication — intended to run on your machine only.

## Features

- Full CRUD for transactions (create, read, update, delete)
- Automatic, real-time totals: total income, total expense, and net balance
- Strict server-side validation (amount must be a positive number; type must be income/expense)

## Tech stack

- Backend: FastAPI, Uvicorn, SQLAlchemy, Pydantic v2 (Python 3.14)
- Frontend: React 18 + Vite
- Database: SQLite (`backend/finance.db`, created automatically on first run)

## Project structure

```
backend/      FastAPI app (database.py, models.py, schemas.py, main.py, requirements.txt)
frontend/     React + Vite app (src/components, src/api.js, src/App.jsx)
docs/         Project plan
```

## Prerequisites

- Python 3.11+ (developed on 3.14)
- Node.js 18+ and npm

## Running the app

Run the backend and frontend in two separate terminals.

### 1. Backend (http://localhost:8000)

From the repo root, in PowerShell:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Interactive API docs are available at http://localhost:8000/docs.

### 2. Frontend (http://localhost:5173)

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` requests to the backend at http://localhost:8000, so make sure the backend is running.

## API

Base path: `/api/transactions`

| Method | Path                     | Description                                              |
| ------ | ------------------------ | ------------------------------------------------------- |
| GET    | `/api/transactions`      | List all transactions (newest first) + computed stats   |
| POST   | `/api/transactions`      | Create a transaction (validated)                        |
| PUT    | `/api/transactions/{id}` | Update a transaction by id (404 if not found)           |
| DELETE | `/api/transactions/{id}` | Delete a transaction by id (404 if not found)           |

The `GET` response has the shape:

```json
{
  "transactions": [
    { "id": 1, "type": "income", "amount": 1000.0, "category": "Salary", "description": "", "date": "2026-01-01T00:00:00" }
  ],
  "stats": { "total_income": 1000.0, "total_expense": 0.0, "balance": 1000.0 }
}
```

### Transaction fields

| Field         | Type     | Notes                                  |
| ------------- | -------- | -------------------------------------- |
| `id`          | integer  | Primary key (auto-generated)           |
| `type`        | string   | `"income"` or `"expense"`              |
| `amount`      | number   | Must be strictly positive (`> 0`)      |
| `category`    | string   | Required, non-empty                    |
| `description` | string   | Optional                               |
| `date`        | datetime | Optional; defaults to the current time |

Invalid input returns HTTP 422 with details.
