import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FileList from "./FileList";
import { renderWithRouter, makeFile } from "../test-utils";

function makeFiles(count) {
  return Array.from({ length: count }, (_, i) =>
    makeFile({ id: i + 1, path: `C:\\photos\\${i}.jpg` }),
  );
}

describe("FileList", () => {
  it("renders a card for every file", () => {
    const files = makeFiles(5);
    renderWithRouter(<FileList files={files} refresh={() => {}} canManage={false} />);

    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`${i}.jpg`)).toBeInTheDocument();
    }
  });

  it("hides the pager when everything fits on one page", () => {
    renderWithRouter(<FileList files={makeFiles(30)} refresh={() => {}} canManage={false} />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("shows a pager once there is more than one page", () => {
    renderWithRouter(<FileList files={makeFiles(31)} refresh={() => {}} canManage={false} />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    // Only the first 30 files are on page 1.
    expect(screen.getByText("0.jpg")).toBeInTheDocument();
    expect(screen.queryByText("30.jpg")).not.toBeInTheDocument();
  });

  it("shows the remaining files on the second page", async () => {
    const user = userEvent.setup();
    renderWithRouter(<FileList files={makeFiles(31)} refresh={() => {}} canManage={false} />);

    await user.click(screen.getByRole("button", { name: "Go to page 2" }));

    expect(screen.getByText("30.jpg")).toBeInTheDocument();
    expect(screen.queryByText("0.jpg")).not.toBeInTheDocument();
  });

  it("restores the page saved in sessionStorage", () => {
    sessionStorage.setItem("fileListPage", "2");
    renderWithRouter(<FileList files={makeFiles(31)} refresh={() => {}} canManage={false} />);

    expect(screen.getByText("30.jpg")).toBeInTheDocument();
    expect(screen.queryByText("0.jpg")).not.toBeInTheDocument();
  });

  it("persists the current page to sessionStorage when it changes", async () => {
    const user = userEvent.setup();
    renderWithRouter(<FileList files={makeFiles(31)} refresh={() => {}} canManage={false} />);

    await user.click(screen.getByRole("button", { name: "Go to page 2" }));

    expect(sessionStorage.getItem("fileListPage")).toBe("2");
  });

  it("falls back to page 1 once the file list shrinks below the saved page", () => {
    sessionStorage.setItem("fileListPage", "2");
    renderWithRouter(<FileList files={makeFiles(5)} refresh={() => {}} canManage={false} />);

    // Page 2 of only 5 files doesn't exist, so FileList resets to page 1.
    expect(screen.getByText("0.jpg")).toBeInTheDocument();
  });
});
