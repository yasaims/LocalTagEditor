import React, { useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import FileList from './components/FileList';
import TagSelector from './components/TagSelector';
import FileRegister from './components/FileRegister';

function App() {
  const [files, setFiles] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const api = 'http://localhost:5000';

  const fetchFiles = async () => {
    const params = selectedTags.map(t => `tag=${encodeURIComponent(t)}`).join('&');
    const res = await fetch(`${api}/files?${params}`);
    const data = await res.json();
    setFiles(data);
  };

  const fetchTags = async () => {
    const res = await fetch(`${api}/tags`);
    const data = await res.json();
    setTags(data.map(t => t.name));
  };

  useEffect(() => { fetchTags(); }, []);
  useEffect(() => { fetchFiles(); }, [selectedTags]);

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Local Tag Editor
      </Typography>
      <Box sx={{ mb: 2 }}>
        <FileRegister onRegistered={fetchFiles} />
      </Box>
      <TagSelector tags={tags} selected={selectedTags} onChange={setSelectedTags} />
      <FileList files={files} refresh={fetchFiles} />
    </Container>
  );
}

export default App;
