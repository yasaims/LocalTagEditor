import React, { useState } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

function FileRegister({ onRegistered }) {
  const [path, setPath] = useState('');
  const api = `http://${window.location.hostname}:5000`;

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
    <Stack direction="row" spacing={1}>
      <TextField
        value={path}
        onChange={e => setPath(e.target.value)}
        placeholder="file path"
        size="small"
        sx={{ width: 300 }}
      />
      <Button variant="contained" onClick={register}>
        Register
      </Button>
    </Stack>
  );
}

export default FileRegister;
