from datetime import datetime, timezone
from database import db


class File(db.Model):
    __tablename__ = "files"
    id = db.Column(db.Integer, primary_key=True)
    path = db.Column(db.String, unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    tags = db.relationship("Tag", secondary="file_tags", backref="files")


class Tag(db.Model):
    __tablename__ = "tags"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, unique=True, nullable=False)


class FileTag(db.Model):
    __tablename__ = "file_tags"
    file_id = db.Column(db.Integer, db.ForeignKey("files.id"), primary_key=True)
    tag_id = db.Column(db.Integer, db.ForeignKey("tags.id"), primary_key=True)
