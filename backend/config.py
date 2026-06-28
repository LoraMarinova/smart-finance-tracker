"""Centralized, environment-driven runtime configuration.

Domain constants (categories, page sizes, app version) stay in ``constants.py``;
this module only holds settings that can change per environment.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    # Override the SQLite file location; used by the isolated E2E database.
    finance_db_path: str | None = None
    # True under pytest so startup work (migrations, schedulers) is skipped.
    finance_testing: bool = False
    # How often the background poller posts due recurring transactions.
    recurring_poll_seconds: int = 3600
    # Browser origins allowed by CORS.
    cors_origins: list[str] = DEFAULT_CORS_ORIGINS


settings = Settings()
