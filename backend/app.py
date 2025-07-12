from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os
import re

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app)

IMAGE_EXTS = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
VIDEO_EXTS = {'.mp4', '.webm', '.ogg'}

def natural_sort_key(s):
    """Return a key for natural sorting (handles numbers in strings)."""
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def classify_path(path):
    if os.path.isdir(path):
        return 'folder'
    ext = os.path.splitext(path)[1].lower()
    if ext in IMAGE_EXTS:
        return 'image'
    if ext in VIDEO_EXTS:
        return 'video'
    return 'other'

def find_first_media(folder):
    """Return first image or video file inside folder."""
    if not os.path.isdir(folder):
        return None, None
    for name in sorted(os.listdir(folder), key=natural_sort_key):
        full = os.path.join(folder, name)
        if os.path.isfile(full):
            ext = os.path.splitext(full)[1].lower()
            if ext in IMAGE_EXTS:
                return full, 'image'
            if ext in VIDEO_EXTS:
                return full, 'video'
    return None, None

def thumbnail_type_for(path):
    t = classify_path(path)
    if t in ('image', 'video'):
        return t
    if t == 'folder':
        _, media_type = find_first_media(path)
        return media_type
    return None

class File(db.Model):
    __tablename__ = 'files'
    id = db.Column(db.Integer, primary_key=True)
    path = db.Column(db.String, unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    tags = db.relationship('Tag', secondary='file_tags', backref='files')

class Tag(db.Model):
    __tablename__ = 'tags'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, unique=True, nullable=False)

class FileTag(db.Model):
    __tablename__ = 'file_tags'
    file_id = db.Column(db.Integer, db.ForeignKey('files.id'), primary_key=True)
    tag_id = db.Column(db.Integer, db.ForeignKey('tags.id'), primary_key=True)

# Initialize database
if not os.path.exists('database.db'):
    with app.app_context():
        db.create_all()

@app.route('/files', methods=['POST'])
def register_file():
    data = request.get_json()
    path = data.get('path')
    if not path:
        return jsonify({'error': 'path required'}), 400
    file = File.query.filter_by(path=path).first()
    if not file:
        file = File(path=path)
        db.session.add(file)
        db.session.commit()
    return jsonify({'id': file.id, 'path': file.path, 'type': classify_path(file.path)})

@app.route('/files', methods=['GET'])
def list_files():
    tag_names = request.args.getlist('tag')
    query = File.query
    if tag_names:
        query = query.join(FileTag).join(Tag).filter(Tag.name.in_(tag_names))
        query = query.group_by(File.id).having(db.func.count(Tag.id) == len(tag_names))
    files = query.all()
    result = []
    for f in files:
        result.append({
            'id': f.id,
            'path': f.path,
            'type': classify_path(f.path),
            'thumbnail_type': thumbnail_type_for(f.path),
            'tags': [{'id': t.id, 'name': t.name} for t in f.tags]
        })
    if len(tag_names) == 1 and len(result) == 0:
        tag = Tag.query.filter_by(name=tag_names[0]).first()
        if tag:
            FileTag.query.filter_by(tag_id=tag.id).delete()
            db.session.delete(tag)
            db.session.commit()
    return jsonify(result)

@app.route('/files/<int:file_id>', methods=['GET'])
def get_file(file_id):
    f = File.query.get_or_404(file_id)
    return jsonify({
        'id': f.id,
        'path': f.path,
        'type': classify_path(f.path),
        'thumbnail_type': thumbnail_type_for(f.path),
        'tags': [{'id': t.id, 'name': t.name} for t in f.tags]
    })

@app.route('/files/<int:file_id>/tags', methods=['POST'])
def add_tag(file_id):
    data = request.get_json()
    tag_name = data.get('tag')
    if not tag_name:
        return jsonify({'error': 'tag required'}), 400
    file = File.query.get_or_404(file_id)
    tag = Tag.query.filter_by(name=tag_name).first()
    if not tag:
        tag = Tag(name=tag_name)
        db.session.add(tag)
    if tag not in file.tags:
        file.tags.append(tag)
    db.session.commit()
    return jsonify({'message': 'tag added'})

@app.route('/files/<int:file_id>/tags/<int:tag_id>', methods=['DELETE'])
def remove_tag(file_id, tag_id):
    file = File.query.get_or_404(file_id)
    tag = Tag.query.get_or_404(tag_id)
    if tag in file.tags:
        file.tags.remove(tag)
        db.session.commit()
    return jsonify({'message': 'tag removed'})

@app.route('/files/<int:file_id>', methods=['DELETE'])
def delete_file(file_id):
    file = File.query.get_or_404(file_id)
    FileTag.query.filter_by(file_id=file_id).delete()
    db.session.delete(file)
    db.session.commit()
    return jsonify({'message': 'file deleted'})

@app.route('/files/<int:file_id>/content', methods=['GET'])
def file_content(file_id):
    file = File.query.get_or_404(file_id)
    if os.path.isdir(file.path):
        thumb, _ = find_first_media(file.path)
        if thumb and os.path.exists(thumb):
            return send_file(thumb)
        return jsonify({'error': 'file not found'}), 404
    if os.path.exists(file.path):
        return send_file(file.path)
    return jsonify({'error': 'file not found'}), 404

@app.route('/files/<int:file_id>/content/<path:filename>', methods=['GET'])
def folder_content_item(file_id, filename):
    file = File.query.get_or_404(file_id)
    if not os.path.isdir(file.path):
        return jsonify({'error': 'not a folder'}), 400
    path = os.path.join(file.path, filename)
    abs_base = os.path.abspath(file.path)
    abs_target = os.path.abspath(path)
    if not abs_target.startswith(abs_base):
        return jsonify({'error': 'invalid path'}), 400
    if os.path.exists(abs_target):
        return send_file(abs_target)
    return jsonify({'error': 'file not found'}), 404

@app.route('/files/<int:file_id>/items', methods=['GET'])
def list_folder_items(file_id):
    file = File.query.get_or_404(file_id)
    if not os.path.isdir(file.path):
        return jsonify([])
    items = []
    for name in sorted(os.listdir(file.path), key=natural_sort_key):
        full = os.path.join(file.path, name)
        t = classify_path(full)
        if t in ('image', 'video'):
            items.append({'name': name, 'type': t})
    return jsonify(items)

@app.route('/tags', methods=['GET'])
def list_tags():
    tags = Tag.query.order_by(Tag.name).all()
    return jsonify([{'id': t.id, 'name': t.name} for t in tags])

if __name__ == '__main__':
    app.run(debug=True)
