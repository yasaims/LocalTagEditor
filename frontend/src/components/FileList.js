import React, { useState, useEffect } from 'react';
import Stack from '@mui/material/Stack';
import Pagination from '@mui/material/Pagination';
import FileItem from './FileItem';

const PER_PAGE = 10;

function FileList({ files, refresh }) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [files]);

  const count = Math.ceil(files.length / PER_PAGE);
  const paginated = files.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <Stack>
      {paginated.map((file) => (
        <FileItem key={file.id} file={file} refresh={refresh} />
      ))}
      {count > 1 && (
        <Pagination
          count={count}
          page={page}
          onChange={(e, value) => setPage(value)}
          sx={{ mt: 2, mb: 2, alignSelf: 'center' }}
        />
      )}
    </Stack>
  );
}

export default FileList;
