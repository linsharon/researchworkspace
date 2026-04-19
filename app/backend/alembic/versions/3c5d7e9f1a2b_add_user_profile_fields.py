"""add user profile fields

Revision ID: 3c5d7e9f1a2b
Revises: 2b7e9c1d4f3a
Create Date: 2026-04-19 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "3c5d7e9f1a2b"
down_revision: Union[str, Sequence[str], None] = "2b7e9c1d4f3a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    user_columns = {column["name"] for column in inspector.get_columns("users")}

    if "bio" not in user_columns:
        op.add_column("users", sa.Column("bio", sa.Text(), nullable=False, server_default=""))
    if "avatar_url" not in user_columns:
        op.add_column("users", sa.Column("avatar_url", sa.Text(), nullable=False, server_default=""))
    if "is_public" not in user_columns:
        op.add_column("users", sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.true()))
    if "profile_updated_at" not in user_columns:
        op.add_column("users", sa.Column("profile_updated_at", sa.DateTime(timezone=True), nullable=True))

    op.execute(
        sa.text(
            "UPDATE users "
            "SET profile_updated_at = COALESCE(profile_updated_at, last_login, created_at, CURRENT_TIMESTAMP)"
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    user_columns = {column["name"] for column in inspector.get_columns("users")}

    if "profile_updated_at" in user_columns:
        op.drop_column("users", "profile_updated_at")
    if "is_public" in user_columns:
        op.drop_column("users", "is_public")
    if "avatar_url" in user_columns:
        op.drop_column("users", "avatar_url")
    if "bio" in user_columns:
        op.drop_column("users", "bio")