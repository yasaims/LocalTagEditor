import React, { useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { Link } from 'react-router-dom';

function FileItem({ file, refresh }) {
  const [newTag, setNewTag] = useState('');
  const api = 'http://localhost:5000';

  const deleteItem = async () => {
    if (!window.confirm('Delete this entry?')) return;
    await fetch(`${api}/files/${file.id}`, { method: 'DELETE' });
    refresh();
  };

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
    if (file.thumbnail_type === 'image') {
      return (
        <img
          src={`${api}/files/${file.id}/content`}
          alt={file.path}
          style={{ maxWidth: '200px' }}
        />
      );
    }
    if (file.thumbnail_type === 'video') {
      return <video controls width="200" src={`${api}/files/${file.id}/content`} />;
    }
    if (file.type === 'folder') {
      return <Typography>Folder: {file.path}</Typography>;
    }
    return <a href={file.path}>{file.path}</a>;
  };

  const name = file.path.split('/').pop();

  return (
    <Paper sx={{ p: 1, mb: 1 }}>
      <Box sx={{ position: 'relative', mb: 1 }}>
        <Box component={Link} to={`/files/${file.id}`} sx={{ display: 'block' }}>
          {preview()}
        </Box>
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'rgba(0,0,0,0.6)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1,
            py: 0.5,
          }}
        >
          <Typography variant="subtitle2" noWrap>
            {name}
          </Typography>
          <Box
            onClick={deleteItem}
            sx={{
              ml: 1,
              bgcolor: 'red',
              color: 'white',
              borderRadius: '50%',
              width: 20,
              height: 20,
              lineHeight: '20px',
              textAlign: 'center',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            x
          </Box>
        </Box>
      </Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Path: {file.path} ({file.type})
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
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
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
