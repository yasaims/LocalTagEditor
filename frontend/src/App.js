import React, { useCallback, useEffect, useMemo, useState } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import useMediaQuery from "@mui/material/useMediaQuery";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import FileList from "./components/FileList";
import TagSelector from "./components/TagSelector";
import TypeSelector from "./components/TypeSelector";
import FileRegister from "./components/FileRegister";
import FileDetail from "./components/FileDetail";
import { Routes, Route, Link } from "react-router-dom";
import { getTheme, THEME_MODE_STORAGE_KEY } from "./theme";

// Allow overriding the API URL so the app can be accessed from other devices.
// Read once at module scope: it is baked in at build time, so it is not a value
// that can change while rendering and does not belong in a dependency list.
const api = process.env.REACT_APP_API_URL || "http://localhost:5000";

function App() {
  const [files, setFiles] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const isSmall = useMediaQuery("(max-width:600px)");
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = useState(
    () => localStorage.getItem(THEME_MODE_STORAGE_KEY) || (prefersDark ? "dark" : "light")
  );
  const theme = useMemo(() => getTheme(mode), [mode]);

  useEffect(() => {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  }, [mode]);

  const toggleMode = () => setMode((m) => (m === "dark" ? "light" : "dark"));

  // Both are memoised so the effects below can depend on them directly.
  // fetchFiles' identity changes only when the filter does, which is exactly
  // when the list needs refetching.
  const fetchFiles = useCallback(async () => {
    const params = [
      ...selectedTags.map((t) => `tag=${encodeURIComponent(t)}`),
      ...selectedTypes.map((t) => `type=${encodeURIComponent(t)}`),
    ].join("&");
    const res = await fetch(`${api}/files?${params}`);
    const data = await res.json();
    setFiles(data);
  }, [selectedTags, selectedTypes]);

  const fetchTags = useCallback(async () => {
    const res = await fetch(`${api}/tags`);
    const data = await res.json();
    setTags(data.map((t) => t.name));
  }, []);

  // Whether registering/deleting files is allowed for this connection -- the
  // backend decides based on connection origin (see WRITE_MODE in
  // backend/app.py), since the same frontend build is served both to the PC
  // itself and to other devices on the LAN.
  const fetchCapabilities = useCallback(async () => {
    try {
      const res = await fetch(`${api}/capabilities`);
      const data = await res.json();
      setCanManage(Boolean(data.can_manage));
    } catch {
      setCanManage(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);
  useEffect(() => {
    fetchCapabilities();
  }, [fetchCapabilities]);

  const sidebar = (
    <Box
      sx={{
        width: 240,
        p: 2,
        bgcolor: "background.paper",
        borderRight: 1,
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography
          component={Link}
          to="/"
          variant="h5"
          sx={{
            textDecoration: "none",
            color: "inherit",
          }}
        >
          Local Tag Editor
        </Typography>
        <Tooltip title={mode === "dark" ? "Light mode" : "Dark mode"}>
          <IconButton onClick={toggleMode} aria-label="toggle dark mode" size="small">
            {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Tooltip>
      </Box>
      <Typography variant="subtitle2">Item Type</Typography>
      <TypeSelector selected={selectedTypes} onChange={setSelectedTypes} />
      <TagSelector
        tags={tags}
        selected={selectedTags}
        onChange={setSelectedTags}
      />
    </Box>
  );

  const routes = (
    <Routes>
      <Route
        path="/"
        element={
          <>
            {canManage && (
              <Box sx={{ mb: 2 }}>
                <FileRegister onRegistered={fetchFiles} />
              </Box>
            )}
            <FileList files={files} refresh={fetchFiles} canManage={canManage} />
          </>
        }
      />
      <Route path="/files/:id" element={<FileDetail />} />
    </Routes>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", height: "100vh" }}>
        {isSmall ? (
          <>
            <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
              {sidebar}
            </Drawer>
            <Box
              id="content"
              sx={{ flexGrow: 1, p: 2, overflow: "auto", width: "100%" }}
            >
              <Button
                variant="outlined"
                onClick={() => setDrawerOpen(true)}
                sx={{ mb: 2 }}
              >
                Tags
              </Button>
              {routes}
            </Box>
          </>
        ) : (
          <>
            {sidebar}
            <Box id="content" sx={{ flexGrow: 1, p: 2, overflow: "auto" }}>
              {routes}
            </Box>
          </>
        )}
      </Box>
    </ThemeProvider>
  );
}

export default App;
