import React from "react";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import FolderIcon from "@mui/icons-material/Folder";
import ImageIcon from "@mui/icons-material/Image";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { Link } from "react-router-dom";

// Base URL of backend API (default localhost). Read once at module scope: it is
// baked in at build time, so it is not a value that can change while rendering.
const api = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Keyed by the same values classify_path returns.
const TYPE_ICONS = {
  folder: FolderIcon,
  image: ImageIcon,
  video: VideoLibraryIcon,
  other: InsertDriveFileIcon,
};

function FileItem({ file, refresh }) {
  const deleteItem = async () => {
    if (!window.confirm("Delete this entry?")) return;
    await fetch(`${api}/files/${file.id}`, { method: "DELETE" });
    refresh();
  };

  const name = file.path.split("\\").pop();
  const TypeIcon = TYPE_ICONS[file.type] || InsertDriveFileIcon;

  const preview = () => {
    if (file.thumbnail_type === "image") {
      return (
        <img
          src={`${api}/files/${file.id}/content`}
          alt={file.path}
          style={{ maxWidth: "200px" }}
        />
      );
    }
    if (file.thumbnail_type === "video") {
      return (
        <video controls width="200" src={`${api}/files/${file.id}/content`} />
      );
    }
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <TypeIcon sx={{ fontSize: 64 }} color="disabled" />
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 1, mb: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}
        >
          <TypeIcon fontSize="small" color="primary" />
          <Typography
            variant="subtitle2"
            sx={{
              textTransform: "uppercase",
              fontWeight: "bold",
              fontSize: "1.275rem",
            }}
            noWrap
          >
            {name}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="error"
          size="small"
          sx={{ minWidth: "24px", height: "24px", p: 0 }}
          onClick={deleteItem}
        >
          X
        </Button>
      </Box>
      <Box
        component={Link}
        to={`/files/${file.id}`}
        sx={{ display: "block", mb: 1 }}
      >
        {preview()}
      </Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap">
        {file.tags.map((t) => (
          <Chip key={t.id} label={t.name} />
        ))}
      </Stack>
    </Paper>
  );
}

export default FileItem;
