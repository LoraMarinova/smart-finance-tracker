# Advanced Wow Features

Add two reviewer-impressing analytics features with no ML and no new runtime dependencies: server-computed financial insights/anomaly detection, and a cumulative balance (net-worth) trend line chart. Date-range presets from this list already shipped; multi-currency is excluded.

## Todos

1. Add InsightItem/InsightsResponse schemas + compute_insights in repository.py
2. Add GET /api/insights route; api.js getInsights; InsightsPanel + App wiring
3. Add cumulativeBalance helper + Balance-over-time LineChart in ChartsPanel
4. CSS for insight badges and the new chart card
5. Add backend insights tests, cumulativeBalance unit test, and E2E; run all suites
6. Update README.md and docs/PLAN.md; restart backend

## Scope

Remaining "wow" items: insights/anomaly detection and a balance-over-time line chart. Excluded: multi-currency (by request) and date-range presets (already shipped in [FilterBar.jsx](../frontend/src/components/FilterBar.jsx) + [datePresets.js](../frontend/src/datePresets.js)).

## 1. Insights / anomaly detection (`GET /api/insights`)

Pure computation over existing data, current month vs last month.

- Schemas in [schemas.py](../backend/schemas.py): `InsightItem { severity: "info"|"warning"|"success", message: str, category: str | None, value: Decimal | None }` and `InsightsResponse { items: list[InsightItem], month: str }`.
- `repository.compute_insights(db, now=None)` in [repository.py](../backend/repository.py), reusing `compute_stats`, `category_breakdown`, `expense_totals_by_category`, `list_budgets`, `_month_bounds`. Rules:
  - Category month-over-month spike: for each expense category with last-month spend > 0, if change >= +25% -> warning ("You spent N% more on X this month"), <= -25% -> info.
  - Unusual large expense: flag the current-month expense whose amount exceeds 2.5x that category's average expense (warning, includes amount + date).
  - Budget threshold: per budget, >= 90% used -> warning, over budget -> warning.
  - Savings rate: income > 0 -> success/warning ("You saved N% of income this month").
  - Empty state: no current-month transactions -> single info item.
- Route in [main.py](../backend/main.py): `GET /api/insights` (tag `analytics`, `response_model=InsightsResponse`).
- Frontend: `getInsights()` in [api.js](../frontend/src/api.js); new `InsightsPanel.jsx` rendering severity-styled items with an empty state; wire into [App.jsx](../frontend/src/App.jsx) (state + `refreshInsights`, include in `refreshAll` and initial load, plus `panelsLoading`/skeleton); place above Analytics.

## 2. Net-worth / balance-over-time line chart

Cumulative balance trend complementing the existing bar + pie.

- Frontend-derived (no API change): add a pure helper `cumulativeBalance(byMonth)` in a small module (e.g. [analytics.js](../frontend/src/analytics.js)) that returns `[{ month, balance }]` as a running sum of `income - expense` from `analytics.by_month`.
- [ChartsPanel.jsx](../frontend/src/components/ChartsPanel.jsx): add a Recharts `LineChart` "Balance over time" using `useMemo(cumulativeBalance, [by_month])`; reflects the selected date range (labelled as such). Recharts is already a dependency.
- CSS for insight badges and the new chart card in [index.css](../frontend/src/index.css), reusing existing tokens.

## Tests (Definition of Done)

- Backend [test_transactions.py](../backend/tests/test_transactions.py): `test_insights_*` - seed income/expense across this/last month and assert expected severities/messages (category spike, large expense, budget >= 90%, savings rate, empty-state).
- Frontend unit: unit-test `cumulativeBalance` (running sum, empty input) in a co-located `*.test.js`.
- E2E [features.spec.js](../frontend/e2e/features.spec.js): insights panel shows an item with seeded data; "Balance over time" line chart appears when expense data exists.
- Run `pytest`, `ruff check .`, `npm test`, `npm run build`, `npm run test:e2e`; report counts.

## Docs + servers

- Update [README.md](../README.md) (new `/api/insights` endpoint, insights + net-worth chart features) and [docs/PLAN.md](PLAN.md) (new endpoint, frontend features).
- Restart the dev backend (port 8000) so the new endpoint is live; refresh the browser.

## Decisions (reasonable defaults)

- Insights computed server-side, no ML; thresholds: 25% category change, 90% budget, large expense > 2.5x category average (easy to tune in one place).
- Balance line is frontend-derived cumulative from `by_month` (reflects the selected range). A true all-time net-worth series via a dedicated backend timeline is a possible follow-up.
- No new runtime dependencies.
