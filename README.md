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

## Opening the database

The database is a single SQLite file at `backend/finance.db`. It is created automatically the first time the backend runs, so start the backend at least once before trying to open it. Pick whichever option is most convenient.

### 1. SQLite extension in Cursor / VS Code (GUI)

Install the **SQLite Viewer** extension (or "SQLite" by alexcvzz), then click `backend/finance.db` in the file explorer to browse tables and run queries inside the editor.

### 2. DB Browser for SQLite (dedicated GUI)

Download from [sqlitebrowser.org](https://sqlitebrowser.org/), then `File > Open Database` and select `backend/finance.db`.

### 3. Python (no extra tools required)

From the repo root in PowerShell:

```powershell
python -c "import sqlite3; c=sqlite3.connect('backend/finance.db'); c.row_factory=sqlite3.Row; [print(dict(r)) for r in c.execute('SELECT * FROM transactions ORDER BY date DESC')]"
```

### 4. sqlite3 command-line shell (if installed)

```powershell
sqlite3 backend\finance.db
```

```sql
.tables
.schema transactions
SELECT * FROM transactions;
.quit
```

The `sqlite3` CLI is not bundled with Windows by default; if the command is not found, use one of the options above.

### 5. Through the API (no DB tool needed)

With the backend running, open http://localhost:8000/docs or http://localhost:8000/api/transactions to view the data.
