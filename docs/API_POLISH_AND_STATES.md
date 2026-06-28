# API Polish And States

Finish the "high impact, lower effort" backend and UX polish: complete OpenAPI documentation with a shared error schema, enrich the health endpoint and add request logging, and round out the frontend with side-panel skeletons and friendly per-section error states. Several pieces from items 5, 6, and 8 already shipped; this plan covers only the remaining gaps.

## Todos

1. Add ErrorResponse/ErrorDetail schemas + document responses={404,422} and response_description on routes; add optional error.field
2. Centralize APP_VERSION; expand /api/health (db_ok, version, uptime, status) with HealthResponse
3. Add HTTP request logging middleware via the finance logger
4. Add ListSkeleton + ErrorState; wire side-panel loading skeletons and per-section error/retry in App.jsx + CSS
5. Add backend health/error tests, any FE unit test, and E2E for panel states; run all suites
6. Update README.md and docs/PLAN.md; restart backend to apply

## Scope

Builds on work already merged (`86d22ca`). Backend: [main.py](../backend/main.py), [schemas.py](../backend/schemas.py), [constants.py](../backend/constants.py), [database.py](../backend/database.py). Frontend: [App.jsx](../frontend/src/App.jsx), [index.css](../frontend/src/index.css), panel components, new small shared components.

## Already done (no work needed)

- Per-route `tags` + `summary`; app `title/description/version/contact/license/openapi_tags`.
- Structured errors `{ "error": { code, message, details } }` via handlers for `StarletteHTTPException` and `RequestValidationError`; `api.js` already parses this shape.
- Skeletons for the transactions table, charts, and dashboard cards; empty states in every panel.

## 5 + 6. OpenAPI polish + document the error shape

- Add `ErrorResponse` (and nested `ErrorDetail`) Pydantic models in [schemas.py](../backend/schemas.py) matching the live shape, so docs show the real error body.
- Add a shared `ERROR_RESPONSES = {404: {"model": ErrorResponse, ...}, 422: {...}}` in [main.py](../backend/main.py) and attach `responses=` to routes that can 404/422 (transactions, budgets, recurring, goals create/update/delete/contribute).
- Add `response_description` to the main routes (e.g. "The created transaction").
- Backward-compatible enhancement honoring item 6's `field`: include an optional `field` in the error object for single-field validation failures (derived from the first `RequestValidationError` loc); keep `details` as the full list. Shape becomes `{ error: { code, message, field?, details? } }` (additive, `api.js` unaffected).

## 7. Request logging + real health check

- Centralize `APP_VERSION` in [constants.py](../backend/constants.py); use it for both `FastAPI(version=...)` and health (replaces the hardcoded `"1.0.0"`).
- Capture process start time at import; compute `uptime_seconds`.
- Add `HealthResponse` schema and expand `GET /api/health` to report: `status` ("ok"/"degraded"), `database` ("e2e"/"default", preserved for the E2E guard), `db_ok` (runs `SELECT 1` via a session), `version`, `uptime_seconds`. Return 200 normally; 503 with `status: "degraded"` only if the DB check fails.
- Add an HTTP logging middleware (`@app.middleware("http")`) logging method, path, status, and duration_ms via the existing `finance` logger; configure a basic log format once at startup. No new dependencies.

## 8. Side-panel skeletons + per-section error states

- Add `ListSkeleton` to [Skeleton.jsx](../frontend/src/components/Skeleton.jsx) and a shared `ErrorState` (message + "Retry" button). (Panels already have empty states, so no separate EmptyState component is needed.)
- Track `panelsLoading` in [App.jsx](../frontend/src/App.jsx) so Budgets/Recurring/Goals show a `ListSkeleton` during initial load instead of briefly flashing "No ... yet".
- Replace the single Transactions-only `loadError` line with a top-level `ErrorState` banner (with Retry calling the initial loader) plus keep inline messaging; give Dashboard and Charts simple error fallbacks.
- CSS for `.skeleton` list rows and `.error-state` in [index.css](../frontend/src/index.css), reusing existing tokens.

## Tests (Definition of Done)

- Backend [test_transactions.py](../backend/tests/test_transactions.py): `test_health_reports_version_db_and_uptime` (asserts `version`, `db_ok` true, `uptime_seconds >= 0`, `database` present); extend `test_structured_error_shape` to assert `field` is set for a single-field 422 and that 404 includes `code`/`message`.
- Frontend: if a pure helper is extracted (e.g. uptime/relative-time formatter), unit-test it in a co-located `*.test.js`.
- E2E [features.spec.js](../frontend/e2e/features.spec.js): assert side panels render (skeleton then content) and that empty-state text appears for an empty goals/budgets panel.
- Run `pytest`, `ruff check .`, `npm test`, `npm run build`, `npm run test:e2e`; report counts.

## Docs + servers

- Update [README.md](../README.md) (health fields, logging note) and [docs/PLAN.md](PLAN.md) (richer health, structured-error doc).
- Restart the dev backend (port 8000) after these changes so the new health/logging/docs are live; refresh the browser for the UI states.

## Decisions (reasonable defaults)

- Keep `details` and ADD optional `field` rather than renaming, to avoid breaking the just-shipped error contract and `api.js`.
- Health returns 200 normally and 503 only when the DB check fails, preserving the E2E `database: "e2e"` guard.
- In-process logging/health only; no new dependencies.
