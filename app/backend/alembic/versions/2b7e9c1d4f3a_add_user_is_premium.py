"""add user is_premium column

Revision ID: 2b7e9c1d4f3a
Revises: 1a2b3c4d5e6f
Create Date: 2026-04-18 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "2b7e9c1d4f3a"
down_revision: Union[str, Sequence[str], None] = "1a2b3c4d5e6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    user_columns = {column["name"] for column in inspector.get_columns("users")}

    if "is_premium" not in user_columns:
        op.add_column("users", sa.Column("is_premium", sa.Boolean(), nullable=False, server_default=sa.false()))

    op.execute(
        sa.text(
            "UPDATE users "
            "SET role = 'admin', is_premium = TRUE "
            "WHERE lower(email) = 'pandalinjingjing@gmail.com'"
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    user_columns = {column["name"] for column in inspector.get_columns("users")}

    if "is_premium" in user_columns:
        op.drop_column("users", "is_premium")
