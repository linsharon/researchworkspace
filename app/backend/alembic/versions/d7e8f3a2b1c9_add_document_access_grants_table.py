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
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.String(length=255), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=True),
            sa.Column("role", sa.String(length=50), nullable=False, server_default="user"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_users_id", "users", ["id"], unique=False)

    if not inspector.has_table("oidc_states"):
        op.create_table(
            "oidc_states",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("state", sa.String(length=255), nullable=False),
            sa.Column("nonce", sa.String(length=255), nullable=False),
            sa.Column("code_verifier", sa.String(length=255), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("state"),
        )
        op.create_index("ix_oidc_states_id", "oidc_states", ["id"], unique=False)
        op.create_index("ix_oidc_states_state", "oidc_states", ["state"], unique=True)

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

    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("oidc_states"):
        existing_indexes = {index["name"] for index in inspector.get_indexes("oidc_states")}
        if "ix_oidc_states_state" in existing_indexes:
            op.drop_index("ix_oidc_states_state", table_name="oidc_states")
        if "ix_oidc_states_id" in existing_indexes:
            op.drop_index("ix_oidc_states_id", table_name="oidc_states")
        op.drop_table("oidc_states")

    if inspector.has_table("users"):
        existing_indexes = {index["name"] for index in inspector.get_indexes("users")}
        if "ix_users_id" in existing_indexes:
            op.drop_index("ix_users_id", table_name="users")
        op.drop_table("users")
