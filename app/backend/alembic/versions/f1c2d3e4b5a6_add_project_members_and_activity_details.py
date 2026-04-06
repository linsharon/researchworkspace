"""add project members and activity details

Revision ID: f1c2d3e4b5a6
Revises: e2c4f6a8b0d1
Create Date: 2026-04-06 12:10:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f1c2d3e4b5a6"
down_revision: Union[str, Sequence[str], None] = "e2c4f6a8b0d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    activity_columns = {column["name"] for column in inspector.get_columns("activity_events")}
    if "details_json" not in activity_columns:
        op.add_column("activity_events", sa.Column("details_json", sa.Text(), nullable=True))

    if not inspector.has_table("project_members"):
        op.create_table(
            "project_members",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("project_id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=255), nullable=False),
            sa.Column("role", sa.String(length=20), nullable=False),
            sa.Column("added_by_user_id", sa.String(length=255), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["added_by_user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("project_id", "user_id", name="uq_project_member_user"),
        )

    existing_indexes = {index["name"] for index in inspector.get_indexes("project_members")}
    if "ix_project_members_id" not in existing_indexes:
        op.create_index("ix_project_members_id", "project_members", ["id"], unique=False)
    if "ix_project_members_project_id" not in existing_indexes:
        op.create_index("ix_project_members_project_id", "project_members", ["project_id"], unique=False)
    if "ix_project_members_user_id" not in existing_indexes:
        op.create_index("ix_project_members_user_id", "project_members", ["user_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("project_members"):
        existing_indexes = {index["name"] for index in inspector.get_indexes("project_members")}
        if "ix_project_members_user_id" in existing_indexes:
            op.drop_index("ix_project_members_user_id", table_name="project_members")
        if "ix_project_members_project_id" in existing_indexes:
            op.drop_index("ix_project_members_project_id", table_name="project_members")
        if "ix_project_members_id" in existing_indexes:
            op.drop_index("ix_project_members_id", table_name="project_members")
        op.drop_table("project_members")

    activity_columns = {column["name"] for column in inspector.get_columns("activity_events")}
    if "details_json" in activity_columns:
        op.drop_column("activity_events", "details_json")