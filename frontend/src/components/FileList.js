import React from 'react';
import Stack from '@mui/material/Stack';
import Pagination from '@mui/material/Pagination';
import FileItem from './FileItem';

const ITEMS_PER_PAGE = 10;

function FileList({ files, refresh, page, onPageChange }) {
  const pageCount = Math.ceil(files.length / ITEMS_PER_PAGE) || 1;
  const start = (page - 1) * ITEMS_PER_PAGE;
  const visible = files.slice(start, start + ITEMS_PER_PAGE);

  return (
    <>
      <Stack>
        {visible.map(file => (
          <FileItem key={file.id} file={file} refresh={refresh} />
        ))}
      </Stack>
      {pageCount > 1 && (
        <Stack alignItems="center" sx={{ mt: 2 }}>
          <Pagination
            count={pageCount}
            page={page}
            onChange={(e, value) => onPageChange(value)}
          />
        </Stack>
      )}
    </>
  );
}

export default FileList;
