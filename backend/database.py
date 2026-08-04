import os
import sqlite3

from flask_migrate import Migrate, upgrade
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
from sqlalchemy.engine import Engine

db = SQLAlchemy()
migrate = Migrate()

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), "migrations")


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    """SQLite ignores FOREIGN KEY clauses unless this pragma is set per
    connection, which would leave the constraints in the schema unenforced."""
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def init_db(app):
    db_path = os.path.join(os.path.dirname(__file__), "database.db")
    app.config.setdefault("SQLALCHEMY_DATABASE_URI", f"sqlite:///{db_path}")
    app.config.setdefault("SQLALCHEMY_TRACK_MODIFICATIONS", False)
    db.init_app(app)
    # render_as_batch: SQLite cannot ALTER existing columns/constraints in place,
    # so Alembic emulates those changes by rebuilding the table.
    migrate.init_app(app, db, directory=MIGRATIONS_DIR, render_as_batch=True)


def init_database_schema(app):
    """Bring the database up to the latest migration.

    Replaces db.create_all(): the schema is owned by the migration scripts in
    migrations/versions so that existing databases pick up new columns too.
    """
    with app.app_context():
        upgrade(directory=MIGRATIONS_DIR)
