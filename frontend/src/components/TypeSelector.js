import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import FolderIcon from "@mui/icons-material/Folder";
import ImageIcon from "@mui/icons-material/Image";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

// value は backend の classify_path が返すもの。label は画面には出さず、
// aria-label と Tooltip でのみ使う。
const FILE_TYPES = [
  { value: "folder", label: "フォルダ", Icon: FolderIcon },
  { value: "image", label: "画像", Icon: ImageIcon },
  { value: "video", label: "動画", Icon: VideoLibraryIcon },
  { value: "other", label: "その他", Icon: InsertDriveFileIcon },
];

function TypeSelector({ selected, onChange }) {
  const location = useLocation();
  const navigate = useNavigate();

  const toggle = (type) => {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  return (
    <Box sx={{ display: "flex", gap: 0.5, mb: 2 }}>
      {FILE_TYPES.map(({ value, label, Icon }) => {
        const isSelected = selected.includes(value);
        return (
          <Tooltip key={value} title={label}>
            <IconButton
              aria-label={label}
              aria-pressed={isSelected}
              onClick={() => toggle(value)}
              sx={{ color: isSelected ? "primary.main" : "action.disabled" }}
            >
              <Icon />
            </IconButton>
          </Tooltip>
        );
      })}
    </Box>
  );
}

export default TypeSelector;
