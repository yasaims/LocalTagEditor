from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import re
from dotenv import load_dotenv

from database import db, init_db, init_database_schema
from models import File, Tag, FileTag

load_dotenv()

app = Flask(__name__)
init_db(app)
CORS(app)

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
VIDEO_EXTS = {".mp4", ".webm", ".ogg"}


def normalize_path_key(path):
    """Return the uniqueness key for a registered path.

    Collapses the spellings that name the same location -- trailing separators,
    "..", mixed separators, and (on Windows) letter case -- so that they resolve
    to one File row instead of registering separately.
    """
    return os.path.normcase(os.path.normpath(os.path.abspath(path)))


def natural_sort_key(s):
    """Return a key for natural sorting (handles numbers in strings)."""
    return [
        int(text) if text.isdigit() else text.lower() for text in re.split(r"(\d+)", s)
    ]


def classify_path(path):
    if os.path.isdir(path):
        return "folder"
    ext = os.path.splitext(path)[1].lower()
    if ext in IMAGE_EXTS:
        return "image"
    if ext in VIDEO_EXTS:
        return "video"
    return "other"


def find_first_media(folder):
    """Return first image or video file inside folder."""
    if not os.path.isdir(folder):
        return None, None
    for name in sorted(os.listdir(folder), key=natural_sort_key):
        full = os.path.join(folder, name)
        if os.path.isfile(full):
            ext = os.path.splitext(full)[1].lower()
            if ext in IMAGE_EXTS:
                return full, "image"
            if ext in VIDEO_EXTS:
                return full, "video"
    return None, None


def thumbnail_type_for(path):
    t = classify_path(path)
    if t in ("image", "video"):
        return t
    if t == "folder":
        _, media_type = find_first_media(path)
        return media_type
    return None


@app.route("/files", methods=["POST"])
def register_file():
    data = request.get_json()
    path = data.get("path")
    if not path:
        return jsonify({"error": "path required"}), 400
    path = path.strip()
    if not path:
        return jsonify({"error": "path required"}), 400
    path_key = normalize_path_key(path)
    file = File.query.filter_by(path_key=path_key).first()
    if not file:
        file = File(path=path, path_key=path_key)
        db.session.add(file)
        db.session.commit()
    return jsonify({"id": file.id, "path": file.path, "type": classify_path(file.path)})


@app.route("/files", methods=["GET"])
def list_files():
    # Deduplicate case-insensitively to match the NOCASE collation on Tag.name:
    # a repeated tag would otherwise inflate the expected count below and make
    # the filter match nothing.
    tag_names = list({name.casefold(): name for name in request.args.getlist("tag")}.values())
    query = File.query
    if tag_names:
        query = query.join(FileTag).join(Tag).filter(Tag.name.in_(tag_names))
        query = query.group_by(File.id).having(
            db.func.count(db.distinct(Tag.id)) == len(tag_names)
        )
    files = query.all()
    result = []
    for f in files:
        result.append(
            {
                "id": f.id,
                "path": f.path,
                "type": classify_path(f.path),
                "thumbnail_type": thumbnail_type_for(f.path),
                "tags": [{"id": t.id, "name": t.name} for t in f.tags],
            }
        )
    return jsonify(result)


@app.route("/files/<int:file_id>", methods=["GET"])
def get_file(file_id):
    f = File.query.get_or_404(file_id)
    return jsonify(
        {
            "id": f.id,
            "path": f.path,
            "type": classify_path(f.path),
            "thumbnail_type": thumbnail_type_for(f.path),
            "tags": [{"id": t.id, "name": t.name} for t in f.tags],
        }
    )


@app.route("/files/<int:file_id>/tags", methods=["POST"])
def add_tag(file_id):
    data = request.get_json()
    tag_name = data.get("tag")
    if not tag_name:
        return jsonify({"error": "tag required"}), 400
    tag_name = tag_name.strip()
    if not tag_name:
        return jsonify({"error": "tag required"}), 400
    file = File.query.get_or_404(file_id)
    tag = Tag.query.filter_by(name=tag_name).first()
    if not tag:
        tag = Tag(name=tag_name)
        db.session.add(tag)
    if tag not in file.tags:
        file.tags.append(tag)
    db.session.commit()
    return jsonify({"message": "tag added"})


def delete_tag_if_unused(tag_id):
    if not FileTag.query.filter_by(tag_id=tag_id).first():
        Tag.query.filter_by(id=tag_id).delete()


@app.route("/files/<int:file_id>/tags/<int:tag_id>", methods=["DELETE"])
def remove_tag(file_id, tag_id):
    file = File.query.get_or_404(file_id)
    tag = Tag.query.get_or_404(tag_id)
    if tag in file.tags:
        file.tags.remove(tag)
        db.session.flush()
        delete_tag_if_unused(tag_id)
        db.session.commit()
    return jsonify({"message": "tag removed"})


@app.route("/files/<int:file_id>", methods=["DELETE"])
def delete_file(file_id):
    file = File.query.get_or_404(file_id)
    tag_ids = [t.id for t in file.tags]
    # The association rows go with the file (relationship cascade, backed by
    # ON DELETE CASCADE), so only the now-orphaned tags need sweeping.
    db.session.delete(file)
    db.session.flush()
    for tag_id in tag_ids:
        delete_tag_if_unused(tag_id)
    db.session.commit()
    return jsonify({"message": "file deleted"})


@app.route("/files/<int:file_id>/content", methods=["GET"])
def file_content(file_id):
    file = File.query.get_or_404(file_id)
    if os.path.isdir(file.path):
        thumb, _ = find_first_media(file.path)
        if thumb and os.path.exists(thumb):
            return send_file(thumb)
        return jsonify({"error": "file not found"}), 404
    if os.path.exists(file.path):
        return send_file(file.path)
    return jsonify({"error": "file not found"}), 404


@app.route("/files/<int:file_id>/content/<path:filename>", methods=["GET"])
def folder_content_item(file_id, filename):
    file = File.query.get_or_404(file_id)
    if not os.path.isdir(file.path):
        return jsonify({"error": "not a folder"}), 400
    path = os.path.join(file.path, filename)
    abs_base = os.path.abspath(file.path)
    abs_target = os.path.abspath(path)
    if abs_target != abs_base and not abs_target.startswith(abs_base + os.sep):
        return jsonify({"error": "invalid path"}), 400
    if os.path.exists(abs_target):
        return send_file(abs_target)
    return jsonify({"error": "file not found"}), 404


@app.route("/files/<int:file_id>/items", methods=["GET"])
def list_folder_items(file_id):
    file = File.query.get_or_404(file_id)
    if not os.path.isdir(file.path):
        return jsonify([])
    items = []
    for name in sorted(os.listdir(file.path), key=natural_sort_key):
        full = os.path.join(file.path, name)
        t = classify_path(full)
        if t in ("image", "video"):
            items.append({"name": name, "type": t})
    return jsonify(items)


@app.route("/tags", methods=["GET"])
def list_tags():
    tags = Tag.query.order_by(Tag.name).all()
    return jsonify([{"id": t.id, "name": t.name} for t in tags])


if __name__ == "__main__":
    # Apply any pending migrations before serving. Kept out of import time so
    # that the `flask db` CLI can load this module without touching the schema.
    init_database_schema(app)

    # Allow configuring host, port and debug from environment variables
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    app.run(debug=debug, host=host, port=port)
