"""add activity event resource fields

Revision ID: e2c4f6a8b0d1
Revises: d7e8f3a2b1c9
Create Date: 2026-04-06 10:20:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "e2c4f6a8b0d1"
down_revision: Union[str, Sequence[str], None] = "d7e8f3a2b1c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("activity_events", sa.Column("resource_type", sa.String(length=100), nullable=True))
    op.add_column("activity_events", sa.Column("resource_id", sa.String(length=255), nullable=True))
    op.create_index("ix_activity_events_resource_type", "activity_events", ["resource_type"], unique=False)
    op.create_index("ix_activity_events_resource_id", "activity_events", ["resource_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_activity_events_resource_id", table_name="activity_events")
    op.drop_index("ix_activity_events_resource_type", table_name="activity_events")
    op.drop_column("activity_events", "resource_id")
    op.drop_column("activity_events", "resource_type")
