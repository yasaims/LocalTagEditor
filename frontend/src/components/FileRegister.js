import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

// Strip a single pair of surrounding double quotes, as produced by
// "Copy as path" in Windows Explorer.
function stripSurroundingQuotes(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function FileRegister({ onRegistered }) {
  const [path, setPath] = useState("");
  // Backend base URL; override with REACT_APP_API_URL for remote access
  const api = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const register = async () => {
    const cleanPath = stripSurroundingQuotes(path);
    if (!cleanPath) return;
    await fetch(`${api}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: cleanPath }),
    });
    setPath("");
    onRegistered();
  };

  const browse = async () => {
    const res = await fetch(`${api}/files/browse`);
    const data = await res.json();
    if (data.path) {
      setPath(data.path);
    }
  };

  return (
    <Stack direction="row" spacing={1}>
      <TextField
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="file path"
        size="small"
        sx={{ width: 300 }}
      />
      <Button variant="outlined" onClick={browse}>
        参照
      </Button>
      <Button variant="contained" onClick={register}>
        Register
      </Button>
    </Stack>
  );
}

export default FileRegister;
