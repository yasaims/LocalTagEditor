import React, { useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

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
    <Paper sx={{ p: 1, mb: 1 }}>
      <Box sx={{ mb: 1 }}>{preview()}</Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Path: {file.path}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap">
        {file.tags.map(t => (
          <Chip
            key={t.id}
            label={t.name}
            onDelete={() => removeTag(t.id)}
          />
        ))}
      </Stack>
      <Stack direction="row" spacing={1}>
        <TextField
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          placeholder="new tag"
          size="small"
        />
        <Button variant="outlined" onClick={addTag}>Add</Button>
      </Stack>
    </Paper>
  );
}

export default FileItem;
