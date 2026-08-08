import { screen } from "@testing-library/react";
import FileItem from "./FileItem";
import { renderWithRouter, makeFile } from "../test-utils";

describe("FileItem", () => {
  it("derives the display name from the Windows-style path", () => {
    const file = makeFile({ path: "C:\\photos\\vacation\\beach.jpg" });
    renderWithRouter(<FileItem file={file} />);
    expect(screen.getByText("beach.jpg")).toBeInTheDocument();
  });

  it("renders an <img> when thumbnail_type is image", () => {
    const file = makeFile({ id: 7, thumbnail_type: "image" });
    renderWithRouter(<FileItem file={file} />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "http://api.test/files/7/content");
  });

  it("renders a <video> when thumbnail_type is video", () => {
    const file = makeFile({ id: 8, thumbnail_type: "video" });
    const { container } = renderWithRouter(<FileItem file={file} />);
    // The preview <video> has no accessible role or label -- FileItem.js
    // doesn't give it one -- so there is no query for it besides direct
    // DOM access.
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const video = container.querySelector("video");
    expect(video).toHaveAttribute("src", "http://api.test/files/8/content");
  });

  it("falls back to a type icon when there is no thumbnail", () => {
    const file = makeFile({ type: "pdf", thumbnail_type: null });
    renderWithRouter(<FileItem file={file} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders each tag as a chip", () => {
    const file = makeFile({
      tags: [
        { id: 1, name: "anime" },
        { id: 2, name: "landscape" },
      ],
    });
    renderWithRouter(<FileItem file={file} />);
    expect(screen.getByText("anime")).toBeInTheDocument();
    expect(screen.getByText("landscape")).toBeInTheDocument();
  });

  it("links the preview to the file's detail page", () => {
    const file = makeFile({ id: 42 });
    renderWithRouter(<FileItem file={file} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/files/42");
  });
});
