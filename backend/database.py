from flask_sqlalchemy import SQLAlchemy
import os

db = SQLAlchemy()


def init_db(app):
    db_path = os.path.join(os.path.dirname(__file__), "database.db")
    app.config.setdefault("SQLALCHEMY_DATABASE_URI", f"sqlite:///{db_path}")
    app.config.setdefault("SQLALCHEMY_TRACK_MODIFICATIONS", False)
    db.init_app(app)


def init_database_schema(app):
    with app.app_context():
        db.create_all()
