import { getTheme, THEME_MODE_STORAGE_KEY } from "./theme";

describe("getTheme", () => {
  it("builds a light theme by default", () => {
    const theme = getTheme("light");
    expect(theme.palette.mode).toBe("light");
  });

  it("builds a dark theme with a dedicated background", () => {
    const theme = getTheme("dark");
    expect(theme.palette.mode).toBe("dark");
    expect(theme.palette.background.default).toBe("#121212");
    expect(theme.palette.background.paper).toBe("#1e1e1e");
  });
});

describe("THEME_MODE_STORAGE_KEY", () => {
  it("is the localStorage key App persists the mode under", () => {
    expect(THEME_MODE_STORAGE_KEY).toBe("themeMode");
  });
});
