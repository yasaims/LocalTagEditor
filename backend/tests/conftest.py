import pytest

from app import create_app
from database import db, init_database_schema


@pytest.fixture
def app(tmp_path):
    """An application backed by a throwaway SQLite file.

    The schema is built by running the migrations rather than db.create_all(),
    so every test also exercises that the migration chain applies to an empty
    database -- the same thing `flask db upgrade` does in CI.
    """
    db_path = (tmp_path / "test.db").as_posix()
    application = create_app(
        {
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{db_path}",
            "TESTING": True,
        }
    )
    init_database_schema(application)

    yield application

    # Windows will not let pytest remove tmp_path while the file is still open.
    with application.app_context():
        db.session.remove()
        db.engine.dispose()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def register(client):
    """Register a path and return its file id."""

    def _register(path):
        response = client.post("/files", json={"path": str(path)})
        assert response.status_code == 200, response.get_data(as_text=True)
        return response.get_json()["id"]

    return _register


@pytest.fixture
def media_folder(tmp_path):
    """A folder holding media files plus a non-media file, deliberately named so
    that natural sort and lexicographic sort disagree."""
    folder = tmp_path / "media"
    folder.mkdir()
    for name in ("1.jpg", "2.jpg", "10.jpg", "a.mp4", "notes.txt"):
        (folder / name).write_bytes(b"data-" + name.encode())
    return folder
