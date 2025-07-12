import React, { useState } from 'react';

function FileItem({ file, refresh }) {
  const [newTag, setNewTag] = useState('');
  const api = 'http://localhost:5000';

  const addTag = async () => {
    if (!newTag) return;
    await fetch(`${api}/files/${file.id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: newTag })
    });
    setNewTag('');
    refresh();
  };

  const removeTag = async (tagId) => {
    await fetch(`${api}/files/${file.id}/tags/${tagId}`, {
      method: 'DELETE'
    });
    refresh();
  };

  const preview = () => {
    const ext = file.path.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
      return <img src={file.path} alt={file.path} style={{ maxWidth: '200px' }} />;
    }
    if (['mp4', 'webm', 'ogg'].includes(ext)) {
      return <video controls width="200" src={file.path} />;
    }
    return <a href={file.path}>{file.path}</a>;
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '0.5rem', marginBottom: '0.5rem' }}>
      <div>{preview()}</div>
      <div>Path: {file.path}</div>
      <div>
        Tags:
        {file.tags.map(t => (
          <span key={t.id} style={{ marginRight: '0.3rem' }}>
            {t.name}
            <button onClick={() => removeTag(t.id)}>x</button>
          </span>
        ))}
      </div>
      <div>
        <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="new tag" />
        <button onClick={addTag}>Add</button>
      </div>
    </div>
  );
}

export default FileItem;
