"""add activity events table

Revision ID: b7c4d8e1f2a9
Revises: 9f31a1d2c4e0
Create Date: 2026-04-06 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7c4d8e1f2a9"
down_revision: Union[str, Sequence[str], None] = "9f31a1d2c4e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "activity_events",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("action", sa.String(length=20), nullable=False),
        sa.Column("path", sa.String(length=512), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(length=255), nullable=True),
        sa.Column("request_id", sa.String(length=100), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("error_type", sa.String(length=100), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activity_events_id", "activity_events", ["id"], unique=False)
    op.create_index("ix_activity_events_request_id", "activity_events", ["request_id"], unique=False)
    op.create_index("ix_activity_events_user_id", "activity_events", ["user_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_activity_events_user_id", table_name="activity_events")
    op.drop_index("ix_activity_events_request_id", table_name="activity_events")
    op.drop_index("ix_activity_events_id", table_name="activity_events")
    op.drop_table("activity_events")
