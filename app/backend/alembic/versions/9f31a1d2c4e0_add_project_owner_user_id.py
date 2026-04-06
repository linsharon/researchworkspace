"""add project owner user id

Revision ID: 9f31a1d2c4e0
Revises: a0da2fc2e882
Create Date: 2026-04-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9f31a1d2c4e0"
down_revision: Union[str, Sequence[str], None] = "a0da2fc2e882"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("projects", sa.Column("owner_user_id", sa.String(length=255), nullable=True))
    op.create_index("ix_projects_owner_user_id", "projects", ["owner_user_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_projects_owner_user_id", table_name="projects")
    op.drop_column("projects", "owner_user_id")
