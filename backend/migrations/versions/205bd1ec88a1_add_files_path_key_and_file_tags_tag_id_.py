"""add files.path_key and file_tags.tag_id index

Revision ID: 205bd1ec88a1
Revises: 3e1b17cda419
Create Date: 2026-08-04 17:21:18.668357

"""
import os

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '205bd1ec88a1'
down_revision = '3e1b17cda419'
branch_labels = None
depends_on = None


def _normalize(path):
    """Mirror of normalize_path_key in app.py, duplicated to keep this
    migration independent of the application module."""
    return os.path.normcase(os.path.normpath(os.path.abspath(path)))


def _backfill_path_key(conn):
    """Fill path_key for existing rows, merging paths that turn out to name
    the same location (e.g. "C:\\a" and "C:\\a\\" registered separately)."""
    rows = conn.execute(sa.text("SELECT id, path FROM files ORDER BY id")).fetchall()
    survivors = {}
    for file_id, path in rows:
        key = _normalize(path)
        survivor = survivors.get(key)
        if survivor is None:
            survivors[key] = file_id
            conn.execute(
                sa.text("UPDATE files SET path_key = :key WHERE id = :id"),
                {"key": key, "id": file_id},
            )
            continue
        # Duplicate: move its tags onto the survivor, ignoring rows the
        # survivor already has, then drop the leftovers and the row itself.
        conn.execute(
            sa.text(
                "UPDATE OR IGNORE file_tags SET file_id = :survivor "
                "WHERE file_id = :dup"
            ),
            {"survivor": survivor, "dup": file_id},
        )
        conn.execute(
            sa.text("DELETE FROM file_tags WHERE file_id = :dup"), {"dup": file_id}
        )
        conn.execute(sa.text("DELETE FROM files WHERE id = :dup"), {"dup": file_id})


def upgrade():
    with op.batch_alter_table('file_tags', schema=None) as batch_op:
        batch_op.create_index('ix_file_tags_tag_id', ['tag_id'], unique=False)

    # Added nullable so existing rows survive the ALTER; tightened below.
    with op.batch_alter_table('files', schema=None) as batch_op:
        batch_op.add_column(sa.Column('path_key', sa.String(), nullable=True))

    _backfill_path_key(op.get_bind())

    with op.batch_alter_table('files', schema=None) as batch_op:
        batch_op.alter_column('path_key', existing_type=sa.String(), nullable=False)
        batch_op.create_unique_constraint('uq_files_path_key', ['path_key'])


def downgrade():
    with op.batch_alter_table('files', schema=None) as batch_op:
        batch_op.drop_constraint('uq_files_path_key', type_='unique')
        batch_op.drop_column('path_key')

    with op.batch_alter_table('file_tags', schema=None) as batch_op:
        batch_op.drop_index('ix_file_tags_tag_id')
