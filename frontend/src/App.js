import React, { useCallback, useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import FileList from './components/FileList';
import TagSelector from './components/TagSelector';
import FileRegister from './components/FileRegister';
import FileDetail from './components/FileDetail';
import { Routes, Route, Link } from 'react-router-dom';

// Allow overriding the API URL so the app can be accessed from other devices.
// Read once at module scope: it is baked in at build time, so it is not a value
// that can change while rendering and does not belong in a dependency list.
const api = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [files, setFiles] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isSmall = useMediaQuery('(max-width:600px)');

  // Both are memoised so the effects below can depend on them directly.
  // fetchFiles' identity changes only when the filter does, which is exactly
  // when the list needs refetching.
  const fetchFiles = useCallback(async () => {
    const params = selectedTags.map(t => `tag=${encodeURIComponent(t)}`).join('&');
    const res = await fetch(`${api}/files?${params}`);
    const data = await res.json();
    setFiles(data);
  }, [selectedTags]);

  const fetchTags = useCallback(async () => {
    const res = await fetch(`${api}/tags`);
    const data = await res.json();
    setTags(data.map(t => t.name));
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);
  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const sidebar = (
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
  );

  const routes = (
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
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {isSmall ? (
        <>
          <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
            {sidebar}
          </Drawer>
          <Box
            id="content"
            sx={{ flexGrow: 1, p: 2, overflow: 'auto', width: '100%' }}
          >
            <Button variant="outlined" onClick={() => setDrawerOpen(true)} sx={{ mb: 2 }}>
              Tags
            </Button>
            {routes}
          </Box>
        </>
      ) : (
        <>
          {sidebar}
          <Box id="content" sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
            {routes}
          </Box>
        </>
      )}
    </Box>
  );
}

export default App;
