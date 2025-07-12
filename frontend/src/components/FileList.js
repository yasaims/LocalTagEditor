import React from 'react';
import Stack from '@mui/material/Stack';
import FileItem from './FileItem';

function FileList({ files, refresh }) {
  return (
    <Stack>
      {files.map(file => (
        <FileItem key={file.id} file={file} refresh={refresh} />
      ))}
    </Stack>
  );
}

export default FileList;
