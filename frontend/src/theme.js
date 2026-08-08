import { createTheme } from "@mui/material/styles";

// Centralised so both the ThemeProvider and any component that needs a
// mode-aware color (e.g. borders, thumbnail placeholders) share one source.
export function getTheme(mode) {
  return createTheme({
    palette: {
      mode,
      ...(mode === "dark"
        ? {
            background: {
              default: "#121212",
              paper: "#1e1e1e",
            },
          }
        : {}),
    },
  });
}

export const THEME_MODE_STORAGE_KEY = "themeMode";
