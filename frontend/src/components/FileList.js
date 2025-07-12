import React from 'react';
import FileItem from './FileItem';

function FileList({ files, refresh }) {
  return (
    <div>
      {files.map(file => (
        <FileItem key={file.id} file={file} refresh={refresh} />
      ))}
    </div>
  );
}

export default FileList;
