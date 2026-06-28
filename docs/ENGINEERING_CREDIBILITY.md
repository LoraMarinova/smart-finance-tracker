# Engineering Credibility

Raise the project's engineering credibility with reviewer-graded, low-risk improvements: JSDoc-based frontend type checking, a Pydantic Settings config module, centralizing recurring/goals DB access in the repository layer, coverage reporting with a CI badge, and pre-commit hooks. DB indexes were already delivered in migration 002.

## Todos

1. Add jsconfig + JSDoc types + typecheck script (checkJs); fix type errors
2. Add Pydantic Settings (config.py); refactor database.py/main.py env reads
3. Move recurring/goal DB access into repository.py; thin the routes
4. Add pytest-cov + vitest coverage; update CI; add CI badge to README
5. Add pre-commit config (ruff, prettier, baseline hooks) + prettier setup
6. Run all suites + typecheck; restart backend; verify green
7. Update README.md and docs/PLAN.md

## Scope

Scope chosen: JSDoc typing + Pydantic Settings + repository pattern for recurring/goals + coverage reporting/CI badge + pre-commit hooks. Excluded by request: TypeScript migration, OpenAPI client codegen, rate limiting/pagination links. Already done: transaction indexes (migration `002`).

## 1. Frontend type checking via JSDoc + checkJs

- Add `frontend/jsconfig.json` with `checkJs: true`, `allowJs`, `noEmit`, `jsx: react-jsx`, `module/moduleResolution: bundler`, `strict` (or `strictNullChecks`).
- Add devDeps: `typescript`, `@types/react`, `@types/react-dom` (tooling only, not shipped).
- Add JSDoc typedefs to the pure modules first: [validation.js](../frontend/src/validation.js), [datePresets.js](../frontend/src/datePresets.js), [api.js](../frontend/src/api.js) (e.g. `@typedef`/`@param`/`@returns`), then prop typedefs on components as needed.
- Add `"typecheck": "tsc -p jsconfig.json --noEmit"` to [package.json](../frontend/package.json); fix reported errors until clean.
- Fallback if component checking is noisy: narrow `include` to logic modules and use per-file `// @ts-check` (keeps this low-risk).

## 2. Pydantic Settings config module

- Add `pydantic-settings` to [requirements.txt](../backend/requirements.txt).
- New `backend/config.py` with `Settings(BaseSettings)` covering env-driven runtime config: `finance_db_path` (alias `FINANCE_DB_PATH`), `finance_testing`, `recurring_poll_seconds`, and `cors_origins`. Expose a module-level `settings`.
- Refactor [database.py](../backend/database.py) and [main.py](../backend/main.py) to read from `settings` instead of scattered `os.environ.get(...)`; keep `is_e2e_database()` semantics (true when `finance_db_path` is set) and import-time timing so pytest (`FINANCE_TESTING`) and E2E (`FINANCE_DB_PATH`) keep working.
- Keep pure domain constants (categories, page sizes, `APP_VERSION`) in [constants.py](../backend/constants.py).

## 3. Repository pattern for recurring + goals

- `main.py` still does direct `db.add/get/delete` for recurring and goal creation. Move these into [repository.py](../backend/repository.py): add `create_recurring`, `delete_recurring` (bool), `get_recurring`, and `create_goal`; reuse existing `post_due_for_template`, `list_*`, `update_goal`, `delete_goal`, `contribute_to_goal`.
- Thin out the corresponding routes in [main.py](../backend/main.py) to call the repo and raise `HTTPException` on `None`/`False`, matching the transactions/budgets style.

## 4. Coverage reporting + CI badge

- Backend: add `pytest-cov` to [requirements-dev.txt](../backend/requirements-dev.txt); configure `[tool.coverage.run]`/`report` in [pyproject.toml](../backend/pyproject.toml); CI runs `pytest --cov=. --cov-report=term-missing --cov-fail-under=80`.
- Frontend: add `@vitest/coverage-v8` devDep; add `"test:coverage": "vitest run --coverage"` and a coverage block in [vite.config.js](../frontend/vite.config.js) (provider `v8`); CI runs coverage.
- Update [ci.yml](../.github/workflows/ci.yml) to use the coverage commands.
- Badge: add a GitHub Actions CI status badge to [README.md](../README.md) (real, no external service). Note: a coverage-percentage badge needs Codecov/Coveralls; mention as optional rather than wiring an external service.

## 5. Pre-commit hooks

- Add `.pre-commit-config.yaml` at repo root: `ruff` (check --fix) and `ruff-format` via `astral-sh/ruff-pre-commit`; baseline `pre-commit-hooks` (trailing-whitespace, end-of-file-fixer, check-yaml/json); a local frontend hook running Prettier.
- Add `prettier` devDep + `.prettierrc` + `.prettierignore`; add `"format"`/`"format:check"` scripts. One-time `prettier --write` will produce a formatting-only diff (called out below).
- Add `pre-commit` to [requirements-dev.txt](../backend/requirements-dev.txt); document `pre-commit install` in README. Optionally add a `pre-commit run --all-files` check to CI.

## Tests + verification (Definition of Done)

- Run `pytest` + `ruff check .` (+coverage), `npm test` + `npm run build` + new `npm run typecheck`, and `npm run test:e2e`; report counts. No behavior change expected, so existing suites must stay green; add a small test only if a new pure helper is introduced.
- Restart the dev backend after the Settings refactor so config loads cleanly.

## Docs

- Update [README.md](../README.md): CI badge, coverage commands, `npm run typecheck`, pre-commit setup, and a config/env table sourced from `Settings`.
- Update [docs/PLAN.md](PLAN.md): note Settings-based config, repository-layer coverage, and tooling (coverage, pre-commit, typecheck).

## Decisions (reasonable defaults)

- JSDoc + `checkJs` (no file renames); TypeScript added only as a dev tool for type-checking.
- Env-driven config goes in `config.py` `Settings`; domain constants stay in `constants.py`.
- CI status badge now; coverage-% badge left optional to avoid an external service.
- Prettier adoption implies a one-time formatting commit (kept separate from logic changes).
