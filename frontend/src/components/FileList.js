import React, { useState, useEffect } from "react";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Pagination from "@mui/material/Pagination";
import FileItem from "./FileItem";

const PER_PAGE = 30;

function FileList({ files, refresh, canManage }) {
  const [page, setPage] = useState(() => {
    const saved = sessionStorage.getItem("fileListPage");
    return saved ? parseInt(saved, 10) : 1;
  });

  useEffect(() => {
    const savedScroll = sessionStorage.getItem("fileListScroll");
    const container = document.getElementById("content");
    if (savedScroll && container) {
      container.scrollTop = parseInt(savedScroll, 10);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("fileListPage", page.toString());
  }, [page]);

  useEffect(() => {
    return () => {
      const container = document.getElementById("content");
      if (container) {
        sessionStorage.setItem("fileListScroll", container.scrollTop.toString());
      }
    };
  }, []);

  const count = Math.ceil(files.length / PER_PAGE);

  useEffect(() => {
    if (page > count) setPage(1);
  }, [count, page]);

  const paginated = files.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 1,
          alignItems: "stretch",
        }}
      >
        {paginated.map((file) => (
          <FileItem key={file.id} file={file} refresh={refresh} canManage={canManage} />
        ))}
      </Box>
      {count > 1 && (
        <Pagination
          count={count}
          page={page}
          onChange={(e, value) => setPage(value)}
          sx={{ mt: 2, mb: 2, alignSelf: "center" }}
        />
      )}
    </Stack>
  );
}

export default FileList;
