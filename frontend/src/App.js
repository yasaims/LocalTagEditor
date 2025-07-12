import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import FileList from './components/FileList';
import TagSelector from './components/TagSelector';
import FileRegister from './components/FileRegister';
import FileDetail from './components/FileDetail';
import { Routes, Route, Link } from 'react-router-dom';

function App() {
  const [files, setFiles] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const api = `http://${window.location.hostname}:5000`;

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
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Box sx={{ width: 240, p: 2, bgcolor: '#f5f5f5' }}>
        <Typography
          component={Link}
          to="/"
          variant="h5"
          sx={{ textDecoration: 'none', color: 'inherit', mb: 2, display: 'block' }}
        >
          Local Tag Editor
        </Typography>
        <TagSelector tags={tags} selected={selectedTags} onChange={setSelectedTags} />
      </Box>
      <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
        <Routes>
          <Route
            path="/"
            element={(
              <>
                <Box sx={{ mb: 2 }}>
                  <FileRegister onRegistered={fetchFiles} />
                </Box>
                <FileList files={files} refresh={fetchFiles} />
              </>
            )}
          />
          <Route path="/files/:id" element={<FileDetail />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
