// Path handling throughout the app assumes Windows-style backslash paths
// (see CLAUDE.md). A registered path can carry one or more trailing
// separators (e.g. "C:\\photos\\" or "C:\\photos/") -- strip those before
// splitting, or the last segment (and therefore the display name) is empty.
export function getDisplayName(path) {
  return path
    .replace(/[\\/]+$/, "")
    .split("\\")
    .pop();
}
