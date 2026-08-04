"""tag name NOCASE and file_tags ON DELETE CASCADE

Revision ID: caadca2ea79d
Revises: 205bd1ec88a1
Create Date: 2026-08-04 17:31:58.473447

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'caadca2ea79d'
down_revision = '205bd1ec88a1'
branch_labels = None
depends_on = None


# The original foreign keys were unnamed, so batch mode cannot drop them by
# name until a naming convention gives them one.
NAMING_CONVENTION = {
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
}
FK_FILE = "fk_file_tags_file_id_files"
FK_TAG = "fk_file_tags_tag_id_tags"


def _merge_case_duplicate_tags(conn):
    """Collapse tags that differ only in case or surrounding whitespace, so the
    NOCASE unique constraint below can be applied."""
    rows = conn.execute(sa.text("SELECT id, name FROM tags ORDER BY id")).fetchall()
    survivors = {}
    for tag_id, name in rows:
        stripped = name.strip()
        key = stripped.casefold()
        survivor = survivors.get(key)
        if survivor is None:
            survivors[key] = tag_id
            if stripped != name:
                conn.execute(
                    sa.text("UPDATE tags SET name = :name WHERE id = :id"),
                    {"name": stripped, "id": tag_id},
                )
            continue
        # Repoint this tag's files at the survivor, ignoring the ones that
        # already carry it, then drop the leftovers and the tag itself.
        conn.execute(
            sa.text(
                "UPDATE OR IGNORE file_tags SET tag_id = :survivor "
                "WHERE tag_id = :dup"
            ),
            {"survivor": survivor, "dup": tag_id},
        )
        conn.execute(
            sa.text("DELETE FROM file_tags WHERE tag_id = :dup"), {"dup": tag_id}
        )
        conn.execute(sa.text("DELETE FROM tags WHERE id = :dup"), {"dup": tag_id})


def upgrade():
    _merge_case_duplicate_tags(op.get_bind())

    # UNIQUE (name) picks up the column's collation, so this makes both the
    # constraint and lookups by name case-insensitive.
    with op.batch_alter_table('tags', schema=None) as batch_op:
        batch_op.alter_column(
            'name',
            existing_type=sa.String(),
            type_=sa.String(collation='NOCASE'),
            existing_nullable=False,
        )

    with op.batch_alter_table(
        'file_tags', schema=None, naming_convention=NAMING_CONVENTION
    ) as batch_op:
        batch_op.drop_constraint(FK_FILE, type_='foreignkey')
        batch_op.drop_constraint(FK_TAG, type_='foreignkey')
        batch_op.create_foreign_key(
            FK_FILE, 'files', ['file_id'], ['id'], ondelete='CASCADE'
        )
        batch_op.create_foreign_key(
            FK_TAG, 'tags', ['tag_id'], ['id'], ondelete='CASCADE'
        )


def downgrade():
    with op.batch_alter_table(
        'file_tags', schema=None, naming_convention=NAMING_CONVENTION
    ) as batch_op:
        batch_op.drop_constraint(FK_FILE, type_='foreignkey')
        batch_op.drop_constraint(FK_TAG, type_='foreignkey')
        batch_op.create_foreign_key(FK_FILE, 'files', ['file_id'], ['id'])
        batch_op.create_foreign_key(FK_TAG, 'tags', ['tag_id'], ['id'])

    with op.batch_alter_table('tags', schema=None) as batch_op:
        batch_op.alter_column(
            'name',
            existing_type=sa.String(collation='NOCASE'),
            type_=sa.String(),
            existing_nullable=False,
        )
