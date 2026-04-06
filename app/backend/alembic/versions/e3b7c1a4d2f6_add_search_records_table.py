"""add search records table

Revision ID: e3b7c1a4d2f6
Revises: b7c4d8e1f2a9
Create Date: 2026-04-06 00:00:02.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e3b7c1a4d2f6"
down_revision: Union[str, Sequence[str], None] = "b7c4d8e1f2a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "search_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("database", sa.String(length=255), nullable=False),
        sa.Column("query", sa.Text(), nullable=False),
        sa.Column("results", sa.Integer(), nullable=False),
        sa.Column("relevant", sa.Integer(), nullable=False),
        sa.Column("searched_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_search_records_id", "search_records", ["id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_search_records_id", table_name="search_records")
    op.drop_table("search_records")
