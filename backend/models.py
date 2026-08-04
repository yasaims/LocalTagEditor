from datetime import UTC, datetime

from database import db


class File(db.Model):
    __tablename__ = "files"
    id = db.Column(db.Integer, primary_key=True)
    # As typed by the user; kept verbatim because the UI derives the display
    # name from it and because it is what gets opened on disk.
    path = db.Column(db.String, unique=True, nullable=False)
    # Normalised form of `path` (see normalize_path_key in app.py). Uniqueness
    # lives here so that "C:\a", "C:\a\" and "c:\A" cannot register twice.
    path_key = db.Column(db.String, unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC))
    tags = db.relationship("Tag", secondary="file_tags", backref="files")


class Tag(db.Model):
    __tablename__ = "tags"
    id = db.Column(db.Integer, primary_key=True)
    # NOCASE so that "Anime" and "anime" are one tag rather than two, both for
    # the UNIQUE constraint and for lookups by name.
    name = db.Column(db.String(collation="NOCASE"), unique=True, nullable=False)


class FileTag(db.Model):
    __tablename__ = "file_tags"
    # ON DELETE CASCADE keeps the association clean without the routes having
    # to sweep it by hand. Requires PRAGMA foreign_keys=ON (see database.py).
    file_id = db.Column(db.Integer, db.ForeignKey("files.id", ondelete="CASCADE"), primary_key=True)
    tag_id = db.Column(db.Integer, db.ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)

    # The composite primary key indexes (file_id, tag_id), which cannot serve
    # lookups keyed on tag_id alone -- i.e. tag filtering and delete_tag_if_unused.
    __table_args__ = (db.Index("ix_file_tags_tag_id", "tag_id"),)
