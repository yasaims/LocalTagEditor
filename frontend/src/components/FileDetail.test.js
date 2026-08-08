import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FileDetail from "./FileDetail";
import { renderWithRouter, mockApi, makeFile } from "../test-utils";

// FileDetail reads :id via useParams, so every test needs to be reached
// through a matching route rather than rendered directly.
function renderDetail(id, props = {}) {
  return renderWithRouter(<FileDetail {...props} />, {
    route: `/files/${id}`,
    path: "/files/:id",
  });
}

describe("FileDetail", () => {
  it("shows nothing until the initial fetch resolves, then renders name and path", async () => {
    const file = makeFile({ id: 5, path: "C:\\photos\\vacation\\beach.jpg" });
    mockApi({ "GET /files/5": file, "GET /tags": [] });

    renderDetail(5);

    expect(screen.queryByText("beach.jpg")).not.toBeInTheDocument();
    expect(await screen.findByText("beach.jpg")).toBeInTheDocument();
    expect(screen.getByText("Path: C:\\photos\\vacation\\beach.jpg")).toBeInTheDocument();
  });

  it("derives the title from a folder path with a trailing backslash", async () => {
    const file = makeFile({
      id: 9,
      path: "C:\\albums\\trip\\",
      type: "folder",
      thumbnail_type: null,
    });
    mockApi({ "GET /files/9": file, "GET /files/9/items": [], "GET /tags": [] });

    renderDetail(9);

    expect(await screen.findByText("trip")).toBeInTheDocument();
  });

  it("steps through folder items and wraps at both ends", async () => {
    const user = userEvent.setup();
    const file = makeFile({
      id: 6,
      path: "C:\\albums\\trip",
      type: "folder",
      thumbnail_type: null,
    });
    const items = [
      { name: "1.jpg", type: "image" },
      { name: "2.jpg", type: "image" },
      { name: "3.jpg", type: "image" },
    ];
    mockApi({ "GET /files/6": file, "GET /files/6/items": items, "GET /tags": [] });
    renderDetail(6);

    // The same item also appears in the thumbnail strip below, so the main
    // preview -- the first match in document order -- must be picked out
    // explicitly.
    const [mainImg] = await screen.findAllByAltText("1.jpg");
    // The prev/next click zones (FileDetail.js) are unlabelled overlay divs
    // with no role, by design (see the component's own comments) -- there is
    // no accessible query for them.
    // eslint-disable-next-line testing-library/no-node-access
    const [prevZone, nextZone] = mainImg.parentElement.querySelectorAll(":scope > div");

    await user.click(nextZone);
    expect(screen.getAllByAltText("2.jpg")[0]).toHaveAttribute(
      "src",
      "http://api.test/files/6/content/2.jpg",
    );

    await user.click(prevZone);
    expect(screen.getAllByAltText("1.jpg").length).toBeGreaterThan(0);

    // Stepping back from the first item wraps around to the last.
    await user.click(prevZone);
    expect(screen.getAllByAltText("3.jpg").length).toBeGreaterThan(0);
  });

  it("still allows stepping through the gallery when the current item is a video", async () => {
    const user = userEvent.setup();
    const file = makeFile({
      id: 11,
      path: "C:\\albums\\trip",
      type: "folder",
      thumbnail_type: null,
    });
    const items = [
      { name: "1.jpg", type: "image" },
      { name: "2.mp4", type: "video" },
    ];
    mockApi({ "GET /files/11": file, "GET /files/11/items": items, "GET /tags": [] });
    renderDetail(11);

    const [firstImg] = await screen.findAllByAltText("1.jpg");
    // eslint-disable-next-line testing-library/no-node-access
    const [, nextZone] = firstImg.parentElement.querySelectorAll(":scope > div");
    await user.click(nextZone);

    // The main preview is now the video, with no accessible role/label query
    // available besides direct DOM access (VideoThumbnail gives it an
    // aria-label, but jsdom exposes no ARIA role for <video>).
    // eslint-disable-next-line testing-library/no-node-access
    const video = document.querySelector("video[aria-label='2.mp4']");
    expect(video).toHaveAttribute("src", "http://api.test/files/11/content/2.mp4#t=0.1");

    // The prev/next click zones must still be present (and clickable) even
    // though the current item is a video -- there is no `controls` UI to
    // protect from overlay clicks anymore.
    // eslint-disable-next-line testing-library/no-node-access
    const [prevZone] = video.parentElement.querySelectorAll(":scope > div");
    await user.click(prevZone);
    expect(screen.getAllByAltText("1.jpg").length).toBeGreaterThan(0);
  });

  it("adds a typed tag and clears the input", async () => {
    const user = userEvent.setup();
    const file = makeFile({ id: 10, tags: [] });
    const fetchMock = mockApi({
      "GET /files/10": file,
      "GET /tags": [],
      "POST /files/10/tags": {},
    });
    renderDetail(10);
    await screen.findByText("sample.jpg");
    const input = screen.getByPlaceholderText("new tag");

    await user.type(input, "anime");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/files/10/tags",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: "anime" }),
      }),
    );
    expect(input).toHaveValue("");
    // Let addTag's refresh() (2 more fetches) settle before the test/component unmounts.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
  });

  it("does not post when the tag field is empty", async () => {
    const user = userEvent.setup();
    const file = makeFile({ id: 11, tags: [] });
    const fetchMock = mockApi({ "GET /files/11": file, "GET /tags": [] });
    renderDetail(11);
    await screen.findByText("sample.jpg");
    fetchMock.mockClear();

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("adding a suggested tag leaves whatever is currently typed in place", async () => {
    const user = userEvent.setup();
    const file = makeFile({ id: 12, tags: [{ id: 1, name: "anime" }] });
    const fetchMock = mockApi({
      "GET /files/12": file,
      "GET /tags": [
        { id: 1, name: "anime" },
        { id: 2, name: "landscape" },
      ],
      "POST /files/12/tags": {},
    });
    renderDetail(12);
    await screen.findByText("sample.jpg");
    const input = screen.getByPlaceholderText("new tag");
    await user.type(input, "typing");

    // Only "landscape" is offered as a suggestion -- "anime" is already applied.
    await user.click(screen.getByText("landscape"));

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/files/12/tags",
      expect.objectContaining({ body: JSON.stringify({ tag: "landscape" }) }),
    );
    expect(input).toHaveValue("typing");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
  });

  it("removes a tag when its chip is deleted", async () => {
    const user = userEvent.setup();
    const file = makeFile({ id: 13, tags: [{ id: 5, name: "anime" }] });
    const fetchMock = mockApi({
      "GET /files/13": file,
      "GET /tags": [{ id: 5, name: "anime" }],
      "DELETE /files/13/tags/5": {},
    });
    renderDetail(13);
    await screen.findByText("sample.jpg");

    await user.click(screen.getByTestId("CancelIcon"));

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/files/13/tags/5",
      expect.objectContaining({ method: "DELETE" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
  });

  it("renders a PDF in an iframe", async () => {
    const file = makeFile({ id: 14, type: "pdf", thumbnail_type: null });
    mockApi({ "GET /files/14": file, "GET /tags": [] });
    renderDetail(14);

    await screen.findByText("sample.jpg");

    // The iframe carries no role but is titled with the file's path.
    expect(screen.getByTitle(file.path)).toHaveAttribute("src", "http://api.test/files/14/content");
  });

  it("hides the delete button when canManage is false (default)", async () => {
    const file = makeFile({ id: 16 });
    mockApi({ "GET /files/16": file, "GET /tags": [] });
    renderDetail(16);

    await screen.findByText("sample.jpg");

    expect(screen.queryByRole("button", { name: "Delete This Entry" })).not.toBeInTheDocument();
  });

  it("shows the delete button when canManage is true", async () => {
    const file = makeFile({ id: 17 });
    mockApi({ "GET /files/17": file, "GET /tags": [] });
    renderDetail(17, { canManage: true });

    await screen.findByText("sample.jpg");

    expect(screen.getByRole("button", { name: "Delete This Entry" })).toBeInTheDocument();
  });

  it("deletes the file, notifies the caller, and navigates back to / when confirmed", async () => {
    const user = userEvent.setup();
    const file = makeFile({ id: 18 });
    const fetchMock = mockApi({
      "GET /files/18": file,
      "GET /tags": [],
      "DELETE /files/18": {},
    });
    const onDeleted = jest.fn();
    window.confirm = jest.fn(() => true);
    renderDetail(18, { canManage: true, onDeleted });

    await screen.findByText("sample.jpg");
    await user.click(screen.getByRole("button", { name: "Delete This Entry" }));

    expect(window.confirm).toHaveBeenCalledWith("Delete this entry?");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/files/18",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(onDeleted).toHaveBeenCalled();
    // Navigated away from /files/18 -- nothing matches "/" in the single-route
    // test harness, so the page's own content disappears.
    await waitFor(() => expect(screen.queryByText("sample.jpg")).not.toBeInTheDocument());
  });

  it("does not delete the file when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    const file = makeFile({ id: 19 });
    const fetchMock = mockApi({ "GET /files/19": file, "GET /tags": [] });
    const onDeleted = jest.fn();
    window.confirm = jest.fn(() => false);
    renderDetail(19, { canManage: true, onDeleted });

    await screen.findByText("sample.jpg");
    fetchMock.mockClear();
    await user.click(screen.getByRole("button", { name: "Delete This Entry" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.getByText("sample.jpg")).toBeInTheDocument();
  });

  it("falls back to a plain link for types with no preview", async () => {
    const file = makeFile({
      id: 15,
      type: "other",
      thumbnail_type: null,
      path: "C:\\docs\\notes.txt",
    });
    mockApi({ "GET /files/15": file, "GET /tags": [] });
    renderDetail(15);

    await screen.findByText("notes.txt");

    expect(screen.getByRole("link", { name: file.path })).toHaveAttribute("href", file.path);
  });
});
