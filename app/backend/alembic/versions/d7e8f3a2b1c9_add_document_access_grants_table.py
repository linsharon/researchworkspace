"""add document access grants table

Revision ID: d7e8f3a2b1c9
Revises: c6f7b2a1d4e8
Create Date: 2026-04-06 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d7e8f3a2b1c9"
down_revision: Union[str, Sequence[str], None] = "c6f7b2a1d4e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create document_access_grants table."""
    op.create_table(
        "document_access_grants",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("document_id", sa.String(36), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("grantee_user_id", sa.String(255), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("granted_by_user_id", sa.String(255), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("access_level", sa.String(20), nullable=False, server_default="read"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("document_id", "grantee_user_id", name="uq_document_access_grant_user"),
    )


def downgrade() -> None:
    """Drop document_access_grants table."""
    op.drop_table("document_access_grants")
