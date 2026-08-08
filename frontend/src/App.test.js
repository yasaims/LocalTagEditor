import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { renderWithRouter, mockApi } from "./test-utils";

describe("App", () => {
  it("shows the register form when the backend allows managing files", async () => {
    mockApi({
      "GET /tags": [],
      "GET /files": [],
      "GET /capabilities": { can_manage: true },
    });

    renderWithRouter(<App />);

    expect(await screen.findByPlaceholderText("file path")).toBeInTheDocument();
  });

  it("hides the register form when the backend disallows managing files", async () => {
    mockApi({
      "GET /tags": [],
      "GET /files": [],
      "GET /capabilities": { can_manage: false },
    });

    renderWithRouter(<App />);

    await screen.findByText("Local Tag Editor");
    expect(screen.queryByPlaceholderText("file path")).not.toBeInTheDocument();
  });

  it("re-fetches files with the selected tag as a query param", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({
      "GET /tags": [{ id: 1, name: "anime" }],
      "GET /files": [],
      "GET /capabilities": { can_manage: false },
    });
    renderWithRouter(<App />);
    await screen.findByRole("checkbox", { name: "anime" });
    fetchMock.mockClear();

    await user.click(screen.getByRole("checkbox", { name: "anime" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("http://api.test/files?tag=anime"));
  });

  it("re-fetches files with the selected type as a query param", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({
      "GET /tags": [],
      "GET /files": [],
      "GET /capabilities": { can_manage: false },
    });
    renderWithRouter(<App />);
    await screen.findByRole("button", { name: "画像" });
    fetchMock.mockClear();

    await user.click(screen.getByRole("button", { name: "画像" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("http://api.test/files?type=image"));
  });

  it("persists the dark mode toggle to localStorage", async () => {
    const user = userEvent.setup();
    mockApi({
      "GET /tags": [],
      "GET /files": [],
      "GET /capabilities": { can_manage: false },
    });
    renderWithRouter(<App />);
    await screen.findByText("Local Tag Editor");

    await user.click(screen.getByRole("button", { name: "toggle dark mode" }));

    expect(localStorage.getItem("themeMode")).toBe("dark");
  });
});
