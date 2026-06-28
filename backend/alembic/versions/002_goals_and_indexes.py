"""Add savings goals table and transaction indexes."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "002_goals_and_indexes"
down_revision: str | Sequence[str] | None = "001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Idempotent like the initial migration: tolerate databases that already
    # have some of these objects from an earlier run.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "goals" not in existing_tables:
        op.create_table(
            "goals",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column(
                "target_amount", sa.Numeric(precision=12, scale=2), nullable=False
            ),
            sa.Column(
                "current_amount",
                sa.Numeric(precision=12, scale=2),
                server_default="0",
                nullable=False,
            ),
            sa.Column("target_date", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )

    if "transactions" in existing_tables:
        existing_indexes = {
            ix["name"] for ix in inspector.get_indexes("transactions")
        }
        for index_name, column in (
            ("ix_transactions_date", "date"),
            ("ix_transactions_type", "type"),
            ("ix_transactions_category", "category"),
        ):
            if index_name not in existing_indexes:
                op.create_index(index_name, "transactions", [column])


def downgrade() -> None:
    for index_name in (
        "ix_transactions_category",
        "ix_transactions_type",
        "ix_transactions_date",
    ):
        op.drop_index(index_name, table_name="transactions")
    op.drop_table("goals")
