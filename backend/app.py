from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app)

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
    return jsonify({'id': file.id, 'path': file.path})

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
            'tags': [{'id': t.id, 'name': t.name} for t in f.tags]
        })
    return jsonify(result)

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

@app.route('/tags', methods=['GET'])
def list_tags():
    tags = Tag.query.order_by(Tag.name).all()
    return jsonify([{'id': t.id, 'name': t.name} for t in tags])

if __name__ == '__main__':
    app.run(debug=True)
