# Five Quick Wins

Add five professional-grade improvements to Smart Finance Tracker: a dashboard KPI endpoint with cards, automatic posting of due recurring transactions, polished OpenAPI docs with structured error responses, date-range presets plus skeleton loaders, and a full savings-goals feature (model, migration, API, UI). Each ships with tests per the repo's Definition of Done.

## Todos

1. Dashboard KPI endpoint + frontend cards
2. Auto-post recurring transactions on a schedule (startup catch-up + poller)
3. OpenAPI metadata/tags + structured error handlers + api.js update
4. Date-range presets in FilterBar + skeleton loaders
5. Savings goals: model, migration, schemas, repository, endpoints, UI
6. Add backend/Vitest/E2E tests and run full suite
7. Update README.md and docs/PLAN.md

## Scope

Touches both tiers. Backend: [main.py](../backend/main.py), [repository.py](../backend/repository.py), [schemas.py](../backend/schemas.py), [models.py](../backend/models.py), [database.py](../backend/database.py), new Alembic migration. Frontend: [App.jsx](../frontend/src/App.jsx), [api.js](../frontend/src/api.js), [index.css](../frontend/src/index.css), new components.

### 1. Dashboard KPIs (`GET /api/dashboard`)

- `repository.dashboard_summary(db)` computes current-month income/expense/balance, previous-month expense + percent delta, top spending category this month, budget health (count over limit / total), and transaction count. Reuses existing `compute_stats` / `category_breakdown` helpers.
- `schemas.DashboardResponse` (+ nested `MonthComparison`).
- Frontend `DashboardCards.jsx` rendered under the header; `getDashboard()` in `api.js`; refreshed in `refreshAll`.

### 2. Auto-post recurring on schedule

- `repository.post_due_recurring(db, now=None)`: posts every occurrence with `next_date <= now`, creating a `Transaction` per occurrence and advancing `next_date` (capped catch-up loop). Move `_advance_next_date` from `main.py` into `repository.py`.
- In `main.py` `lifespan`: after `run_migrations()`, run a startup catch-up and start an `asyncio` poller every `RECURRING_POLL_SECONDS` (default 3600). Guard: skip entirely when `FINANCE_TESTING == "1"`; skip the poller when `is_e2e_database()` so E2E stays deterministic. Cancel the task on shutdown.

### 3. OpenAPI polish + structured errors

- `FastAPI(...)` gets `description`, `version`, `contact`, `license_info`, and `openapi_tags`; add `tags` + `summary` to each route.
- Exception handlers for `StarletteHTTPException` and `RequestValidationError` returning `{"error": {"code", "message", "details"}}` (validation list goes in `details` via `jsonable_encoder`).
- Update `api.js` error parsing to read the new `body.error` shape while still supporting the old `body.detail` shape.

### 4. Date-range presets + skeletons

- `FilterBar.jsx`: preset buttons (This month, Last 30 days, This year, All time) that set `from`/`to`.
- `Skeleton.jsx` + CSS shimmer; replace the plain "Loading…" text for transactions and charts with skeleton rows/blocks.

### 5. Savings goals

- `models.Goal` (`id`, `name`, `target_amount`, `current_amount` default 0, `target_date` nullable).
- Alembic `002_goals_and_indexes`: create `goals`; add indexes on `transactions(date)`, `(type)`, `(category)` for a small perf/polish win (idempotent, mirroring `001`'s guard style).
- Schemas: `GoalCreate`, `GoalUpdate`, `GoalContribute`, `GoalRead` (with derived `remaining`, `progress_pct`).
- Repository: `list_goals`, `update_goal`, `delete_goal`, `contribute_to_goal`.
- Endpoints: `GET/POST /api/goals`, `PUT/DELETE /api/goals/{id}`, `POST /api/goals/{id}/contribute` (404 for unknown IDs).
- Frontend `GoalPanel.jsx` + `api.js` functions, wired into `App.jsx` `side-panels`.

### Tests (Definition of Done)

- `backend/tests/test_transactions.py`: dashboard shape/values, `post_due_recurring` (due vs future, catch-up, advance), goals CRUD + contribute + 404s, structured 404/422 error shape.
- `frontend/src/validation.test.js` (or co-located): any new pure helpers (e.g. date-preset range builder, goal progress calc) extracted and unit-tested.
- `frontend/e2e/features.spec.js`: dashboard cards visible, date preset narrows list, goal create + contribute shows progress.
- Run `pytest`, `ruff check .`, `npm test`, `npm run build`, `npm run test:e2e`; report pass counts.

### Docs

- Update [README.md](../README.md) (new endpoints, env var `RECURRING_POLL_SECONDS`, goals/dashboard features) and [docs/PLAN.md](PLAN.md) (new entity, endpoints, auto-post note).

### Notable decisions (reasonable defaults, not asking)

- Error body becomes `{"error": {...}}`; `api.js` updated for back-compat so the UI keeps showing messages.
- Scheduler is in-process (`asyncio`), no new dependency; disabled under test/E2E for determinism.
- Goals fund via an explicit "Contribute" action (not auto-linked to transactions) to keep scope tight.
