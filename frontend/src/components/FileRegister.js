import React, { useState } from 'react';

function FileRegister({ onRegistered }) {
  const [path, setPath] = useState('');
  const api = 'http://localhost:5000';

  const register = async () => {
    if (!path) return;
    await fetch(`${api}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    setPath('');
    onRegistered();
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <input value={path} onChange={e => setPath(e.target.value)} placeholder="file path" style={{ width: '300px' }} />
      <button onClick={register}>Register</button>
    </div>
  );
}

export default FileRegister;
