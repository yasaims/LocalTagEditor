import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

function FileDetail() {
  const { id } = useParams();
  const [file, setFile] = useState(null);
  const api = 'http://localhost:5000';

  useEffect(() => {
    const fetchFile = async () => {
      const res = await fetch(`${api}/files/${id}`);
      const data = await res.json();
      setFile(data);
    };
    fetchFile();
  }, [id]);

  if (!file) return null;

  const preview = () => {
    if (file.type === 'image') {
      return (
        <img
          src={`${api}/files/${file.id}/content`}
          alt={file.path}
          style={{ maxWidth: '400px' }}
        />
      );
    }
    if (file.type === 'video') {
      return <video controls width="400" src={`${api}/files/${file.id}/content`} />;
    }
    if (file.type === 'folder') {
      return <Typography>Folder: {file.path}</Typography>;
    }
    return <a href={file.path}>{file.path}</a>;
  };

  return (
    <Box>
      <Button component={Link} to="/" variant="outlined" sx={{ mb: 2 }}>
        Back
      </Button>
      <Box sx={{ mb: 2 }}>{preview()}</Box>
      <Typography variant="body2">Path: {file.path}</Typography>
    </Box>
  );
}

export default FileDetail;
