"""add documents search vector fts support

Revision ID: c6f7b2a1d4e8
Revises: f4a9c2d3e6b1
Create Date: 2026-04-06 08:15:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c6f7b2a1d4e8"
down_revision: Union[str, Sequence[str], None] = "f4a9c2d3e6b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_vector tsvector")

    op.execute(
        """
        UPDATE documents
        SET search_vector = to_tsvector(
            'simple',
            coalesce(title, '') || ' ' ||
            coalesce(description, '') || ' ' ||
            coalesce(tags, '')
        )
        """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION documents_search_vector_update() RETURNS trigger AS $$
        BEGIN
            NEW.search_vector := to_tsvector(
                'simple',
                coalesce(NEW.title, '') || ' ' ||
                coalesce(NEW.description, '') || ' ' ||
                coalesce(NEW.tags, '')
            );
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute("DROP TRIGGER IF EXISTS documents_search_vector_trigger ON documents")
    op.execute(
        """
        CREATE TRIGGER documents_search_vector_trigger
        BEFORE INSERT OR UPDATE OF title, description, tags
        ON documents
        FOR EACH ROW EXECUTE FUNCTION documents_search_vector_update()
        """
    )

    op.execute("CREATE INDEX IF NOT EXISTS ix_documents_search_vector ON documents USING GIN (search_vector)")


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute("DROP INDEX IF EXISTS ix_documents_search_vector")
    op.execute("DROP TRIGGER IF EXISTS documents_search_vector_trigger ON documents")
    op.execute("DROP FUNCTION IF EXISTS documents_search_vector_update")
    op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS search_vector")
