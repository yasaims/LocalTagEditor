import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";

function FileDetail() {
  const { id } = useParams();
  const [file, setFile] = useState(null);
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [newTag, setNewTag] = useState("");
  const [allTags, setAllTags] = useState([]);
  // Use REACT_APP_API_URL when provided for network access
  const api = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const fetchTags = () => {
    fetch(`${api}/tags`)
      .then((res) => res.json())
      .then((data) => setAllTags(data.map((t) => t.name)));
  };

  useEffect(() => {
    const fetchFile = async () => {
      const res = await fetch(`${api}/files/${id}`);
      const data = await res.json();
      setFile(data);
      if (data.type === "folder") {
        const r = await fetch(`${api}/files/${id}/items`);
        const itemsData = await r.json();
        setItems(itemsData);
        setIndex(0);
      }
      fetchTags();
    };
    fetchFile();
  }, [id]);

  const refresh = () => {
    fetch(`${api}/files/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setFile(data);
        if (data.type === "folder") {
          fetch(`${api}/files/${id}/items`)
            .then((r) => r.json())
            .then(setItems);
        }
        fetchTags();
      });
  };

  const addTag = async (name) => {
    const tagName = name ?? newTag;
    if (!tagName) return;
    await fetch(`${api}/files/${id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: tagName }),
    });
    if (!name) setNewTag("");
    refresh();
  };

  const removeTag = async (tagId) => {
    await fetch(`${api}/files/${id}/tags/${tagId}`, { method: "DELETE" });
    refresh();
  };

  if (!file) return null;

  const preview = () => {
    if (file.type === "folder") {
      if (!items.length) return <Typography>Folder: {file.path}</Typography>;
      const current = items[index];
      const src = `${api}/files/${file.id}/content/${encodeURIComponent(
        current.name
      )}`;
      const handlePrev = () =>
        setIndex((index - 1 + items.length) % items.length);
      const handleNext = () => setIndex((index + 1) % items.length);
      return (
        <Box sx={{ position: "relative", maxWidth: "100%" }}>
          {current.type === "image" ? (
            <img
              src={src}
              alt={current.name}
              style={{ width: "50%", maxHeight: "100vh" }}
            />
          ) : (
            <video
              controls
              style={{ width: "100%", maxHeight: "100vh" }}
              src={src}
            />
          )}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: "50%",
              cursor: "pointer",
            }}
            onClick={handlePrev}
          />
          <Box
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "50%",
              cursor: "pointer",
            }}
            onClick={handleNext}
          />
        </Box>
      );
    }
    if (file.thumbnail_type === "image") {
      return (
        <img
          src={`${api}/files/${file.id}/content`}
          alt={file.path}
          style={{ maxHeight: "100vh" }}
        />
      );
    }
    if (file.thumbnail_type === "video") {
      return (
        <video
          controls
          style={{ maxHeight: "100vh" }}
          src={`${api}/files/${file.id}/content`}
        />
      );
    }
    return <a href={file.path}>{file.path}</a>;
  };

  const title = file.path.split("\\").pop();
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ mr: "260px" }}>{preview()}</Box>
      <Paper
        sx={{
          p: 2,
          width: 250,
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          overflow: "auto",
        }}
      >
        <Typography variant="h6" sx={{ mb: 1 }}>
          Tags
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
          {file.tags.map((t) => (
            <Chip key={t.id} label={t.name} onDelete={() => removeTag(t.id)} />
          ))}
        </Stack>
        <Stack direction="row" spacing={1}>
          <TextField
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="new tag"
            size="small"
          />
          <Button variant="outlined" onClick={() => addTag()}>
            Add
          </Button>
        </Stack>
        {allTags.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
            {allTags
              .filter((t) => !file.tags.some((ft) => ft.name === t))
              .map((t) => (
                <Chip
                  key={t}
                  label={t}
                  onClick={() => addTag(t)}
                  variant="outlined"
                  sx={{ cursor: "pointer" }}
                />
              ))}
          </Stack>
        )}
      </Paper>
      {file.type === "folder" && items.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 2, flexWrap: "wrap", mr: "260px" }}
        >
          {items.map((it, idx) => {
            const src = `${api}/files/${file.id}/content/${encodeURIComponent(
              it.name
            )}`;
            return (
              <Box
                key={it.name}
                onClick={() => setIndex(idx)}
                sx={{
                  cursor: "pointer",
                  border:
                    idx === index ? "2px solid #1976d2" : "1px solid #ccc",
                }}
              >
                {it.type === "image" ? (
                  <img src={src} alt={it.name} width={80} />
                ) : (
                  <video width={80} src={src} />
                )}
              </Box>
            );
          })}
        </Stack>
      )}
      <Typography variant="body2" sx={{ mt: 2, mr: "260px" }}>
        Path: {file.path}
      </Typography>
    </Box>
  );
}

export default FileDetail;
