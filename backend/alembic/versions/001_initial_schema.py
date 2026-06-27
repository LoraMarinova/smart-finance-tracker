"""Initial schema with transactions, budgets, and recurring transactions."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "001_initial"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Idempotent: only create tables that don't already exist. This keeps the
    # local-only app from crashing on startup when a database created by an
    # earlier run (or an older pre-Alembic version) is already present.
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())

    if "transactions" not in existing:
        op.create_table(
            "transactions",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("type", sa.String(), nullable=False),
            sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
            sa.Column("category", sa.String(), nullable=False),
            sa.Column("description", sa.String(), nullable=True),
            sa.Column(
                "date",
                sa.DateTime(),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
        )
    if "budgets" not in existing:
        op.create_table(
            "budgets",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("category", sa.String(), nullable=False),
            sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("category"),
        )
    if "recurring_transactions" not in existing:
        op.create_table(
            "recurring_transactions",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("type", sa.String(), nullable=False),
            sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
            sa.Column("category", sa.String(), nullable=False),
            sa.Column("description", sa.String(), nullable=True),
            sa.Column("frequency", sa.String(), nullable=False),
            sa.Column("next_date", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )


def downgrade() -> None:
    op.drop_table("recurring_transactions")
    op.drop_table("budgets")
    op.drop_table("transactions")
