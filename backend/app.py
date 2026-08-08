import functools
import ipaddress
import os
import re
import socket

from dotenv import load_dotenv
from flask import Blueprint, Flask, current_app, jsonify, request, send_file
from flask_cors import CORS

from database import db, init_database_schema, init_db
from models import File, FileTag, Tag

# Routes hang off a blueprint rather than a module-level app so that create_app()
# can build a fresh application per configuration -- notably a throwaway SQLite
# file for the tests.
api = Blueprint("api", __name__)

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
VIDEO_EXTS = {".mp4", ".webm", ".ogg"}
PDF_EXTS = {".pdf"}
FILE_TYPES = {"folder", "image", "video", "pdf", "other"}


@functools.lru_cache(maxsize=1)
def _local_addresses():
    """IPv4 addresses that belong to this machine, memoised for the process.

    Used to recognise a request as "from this PC" even when it did not come in
    over loopback. The app is routinely run with FLASK_HOST=0.0.0.0 and the
    frontend pointed at REACT_APP_API_URL=http://<PC_IP>:5000 (see
    frontend/.env.example) so it can be reached from a phone on the LAN -- that
    means a browser running on the very same PC also shows up with the PC's LAN
    IP as remote_addr, not 127.0.0.1. Checking loopback alone would lock the
    owner's own PC out of registering files whenever it uses the LAN URL.
    """
    try:
        return set(socket.gethostbyname_ex(socket.gethostname())[2])
    except OSError:
        return set()


def is_local_request():
    """Whether the current request originates from this machine.

    Deliberately ignores X-Forwarded-For and similar headers: this app has no
    reverse proxy in front of it, and any such header is fully attacker-
    controlled, so trusting it would make the check trivially bypassable.
    remote_addr itself can't be spoofed for a TCP connection since the response
    has to route back to the real sender.
    """
    addr = request.remote_addr
    if not addr:
        return False
    try:
        ip = ipaddress.ip_address(addr)
    except ValueError:
        return False
    return ip.is_loopback or addr in _local_addresses()


def write_allowed():
    """Whether file-registry-mutating endpoints are permitted for this request.

    Governed by WRITE_MODE (config, defaulting from the WRITE_MODE env var):
    "local" (default) allows only requests from this machine, "off" disables
    these endpoints entirely, "all" allows any origin (restores pre-existing
    behaviour).
    """
    mode = current_app.config.get("WRITE_MODE", "local")
    if mode == "all":
        return True
    if mode == "off":
        return False
    return is_local_request()


def local_only(view):
    @functools.wraps(view)
    def wrapped(*args, **kwargs):
        if not write_allowed():
            return jsonify({"error": "disabled for remote connections"}), 403
        return view(*args, **kwargs)

    return wrapped


def normalize_path_key(path):
    """Return the uniqueness key for a registered path.

    Collapses the spellings that name the same location -- trailing separators,
    "..", mixed separators, and (on Windows) letter case -- so that they resolve
    to one File row instead of registering separately.
    """
    return os.path.normcase(os.path.normpath(os.path.abspath(path)))


def natural_sort_key(s):
    """Return a key for natural sorting (handles numbers in strings)."""
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r"(\d+)", s)]


def classify_path(path):
    if os.path.isdir(path):
        return "folder"
    ext = os.path.splitext(path)[1].lower()
    if ext in IMAGE_EXTS:
        return "image"
    if ext in VIDEO_EXTS:
        return "video"
    if ext in PDF_EXTS:
        return "pdf"
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


@api.route("/files/browse", methods=["GET"])
@local_only
def browse_file():
    """Open a native picker on the machine running the backend.

    `kind` selects what may be picked: "file" (default) or "folder" -- both are
    registrable, so the frontend offers each.

    Only meaningful when the caller is on the same PC as the backend -- a
    phone hitting this over the LAN would pop the dialog on the server's
    screen, not the phone's.
    """
    kind = request.args.get("kind", "file")
    # Validated before tkinter is touched so a bad request cannot leave a modal
    # dialog waiting on a human (the tests rely on this).
    if kind not in ("file", "folder"):
        return jsonify({"error": "invalid kind"}), 400

    import tkinter as tk
    from tkinter import filedialog

    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    try:
        path = filedialog.askdirectory() if kind == "folder" else filedialog.askopenfilename()
    finally:
        root.destroy()
    # tkinter returns forward-slash paths on Windows even though the rest of
    # the app assumes backslash-separated paths (see FileItem/FileDetail's
    # path.split("\\") display-name logic).
    if path:
        path = os.path.normpath(path)
    return jsonify({"path": path or None})


@api.route("/files", methods=["POST"])
@local_only
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


@api.route("/files", methods=["GET"])
def list_files():
    # Deduplicate case-insensitively to match the NOCASE collation on Tag.name:
    # a repeated tag would otherwise inflate the expected count below and make
    # the filter match nothing.
    tag_names = list({name.casefold(): name for name in request.args.getlist("tag")}.values())
    # Types are OR'd with each other and AND'd with the tag filter. classify_path
    # reads the filesystem rather than a column, so this cannot be pushed into SQL.
    requested_types = request.args.getlist("type")
    types = {t.strip().lower() for t in requested_types} & FILE_TYPES
    query = File.query
    if tag_names:
        query = query.join(FileTag).join(Tag).filter(Tag.name.in_(tag_names))
        query = query.group_by(File.id).having(db.func.count(db.distinct(Tag.id)) == len(tag_names))
    files = query.all()
    result = []
    for f in files:
        file_type = classify_path(f.path)
        if requested_types and file_type not in types:
            continue
        result.append(
            {
                "id": f.id,
                "path": f.path,
                "type": file_type,
                # Computed after the type filter: for folders this lists the
                # directory, so files skipped above skip that cost entirely.
                "thumbnail_type": thumbnail_type_for(f.path),
                "tags": [{"id": t.id, "name": t.name} for t in f.tags],
            }
        )
    return jsonify(result)


@api.route("/files/<int:file_id>", methods=["GET"])
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


@api.route("/files/<int:file_id>/tags", methods=["POST"])
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


@api.route("/files/<int:file_id>/tags/<int:tag_id>", methods=["DELETE"])
def remove_tag(file_id, tag_id):
    file = File.query.get_or_404(file_id)
    tag = Tag.query.get_or_404(tag_id)
    if tag in file.tags:
        file.tags.remove(tag)
        db.session.flush()
        delete_tag_if_unused(tag_id)
        db.session.commit()
    return jsonify({"message": "tag removed"})


@api.route("/files/<int:file_id>", methods=["DELETE"])
@local_only
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


@api.route("/files/<int:file_id>/content", methods=["GET"])
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


@api.route("/files/<int:file_id>/content/<path:filename>", methods=["GET"])
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


@api.route("/files/<int:file_id>/items", methods=["GET"])
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


@api.route("/capabilities", methods=["GET"])
def capabilities():
    return jsonify({"can_manage": write_allowed()})


@api.route("/tags", methods=["GET"])
def list_tags():
    tags = Tag.query.order_by(Tag.name).all()
    return jsonify([{"id": t.id, "name": t.name} for t in tags])


def create_app(config=None):
    """Build an application instance.

    `config` overrides are applied before init_db so that they win over the
    defaults it installs with setdefault -- that is how the tests point the app
    at a temporary database instead of backend/database.db.

    The `flask` CLI discovers this factory by name, so FLASK_APP=app.py keeps
    working for `flask db upgrade` and friends.
    """
    load_dotenv()

    app = Flask(__name__)
    if config:
        app.config.update(config)
    app.config.setdefault("WRITE_MODE", os.getenv("WRITE_MODE", "local"))
    init_db(app)
    CORS(app)
    app.register_blueprint(api)
    return app


if __name__ == "__main__":
    app = create_app()

    # Apply any pending migrations before serving. Kept out of create_app() so
    # that the `flask db` CLI can build the app without touching the schema.
    init_database_schema(app)

    # Allow configuring host, port and debug from environment variables
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    app.run(debug=debug, host=host, port=port)
