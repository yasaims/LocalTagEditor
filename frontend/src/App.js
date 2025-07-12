import React, { useEffect, useState } from 'react';
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
    <div style={{ padding: '1rem' }}>
      <h1>Local Tag Editor</h1>
      <FileRegister onRegistered={fetchFiles} />
      <TagSelector tags={tags} selected={selectedTags} onChange={setSelectedTags} />
      <FileList files={files} refresh={fetchFiles} />
    </div>
  );
}

export default App;
