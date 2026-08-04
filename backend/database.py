from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate, upgrade
import os

db = SQLAlchemy()
migrate = Migrate()

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), "migrations")


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
