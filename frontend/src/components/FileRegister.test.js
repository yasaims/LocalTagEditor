import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FileRegister from "./FileRegister";
import { renderWithRouter, mockApi } from "../test-utils";

describe("FileRegister", () => {
  it("posts the typed path and notifies the caller on success", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({ "POST /files": { id: 1, path: "C:\\a.jpg", type: "image" } });
    const onRegistered = jest.fn();
    renderWithRouter(<FileRegister onRegistered={onRegistered} />);

    await user.type(screen.getByPlaceholderText("file path"), "C:\\a.jpg");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/files",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "C:\\a.jpg" }),
      }),
    );
    expect(onRegistered).toHaveBeenCalled();
  });

  it("clears the input after a successful register", async () => {
    const user = userEvent.setup();
    mockApi({ "POST /files": { id: 1, path: "C:\\a.jpg", type: "image" } });
    renderWithRouter(<FileRegister onRegistered={() => {}} />);
    const input = screen.getByPlaceholderText("file path");

    await user.type(input, "C:\\a.jpg");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(input).toHaveValue("");
  });

  it("strips one pair of surrounding double quotes pasted from Windows Explorer", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({ "POST /files": { id: 1, path: "C:\\a b.jpg", type: "image" } });
    renderWithRouter(<FileRegister onRegistered={() => {}} />);

    await user.type(screen.getByPlaceholderText("file path"), '"C:\\a b.jpg"');
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/files",
      expect.objectContaining({ body: JSON.stringify({ path: "C:\\a b.jpg" }) }),
    );
  });

  it("trims surrounding whitespace before registering", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({ "POST /files": { id: 1, path: "C:\\a.jpg", type: "image" } });
    renderWithRouter(<FileRegister onRegistered={() => {}} />);

    await user.type(screen.getByPlaceholderText("file path"), "  C:\\a.jpg  ");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/files",
      expect.objectContaining({ body: JSON.stringify({ path: "C:\\a.jpg" }) }),
    );
  });

  it("does nothing when the path is empty (or only whitespace)", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({});
    const onRegistered = jest.fn();
    renderWithRouter(<FileRegister onRegistered={onRegistered} />);

    await user.type(screen.getByPlaceholderText("file path"), "   ");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(onRegistered).not.toHaveBeenCalled();
  });

  it("fills the input with the path returned by the native file browse dialog", async () => {
    const user = userEvent.setup();
    mockApi({ "GET /files/browse": { path: "C:\\chosen\\file.jpg" } });
    renderWithRouter(<FileRegister onRegistered={() => {}} />);

    await user.click(screen.getByRole("button", { name: "参照" }));

    expect(await screen.findByDisplayValue("C:\\chosen\\file.jpg")).toBeInTheDocument();
  });

  it("leaves the input untouched when the browse dialog is cancelled", async () => {
    const user = userEvent.setup();
    mockApi({ "GET /files/browse": { path: null } });
    renderWithRouter(<FileRegister onRegistered={() => {}} />);
    const input = screen.getByPlaceholderText("file path");

    await user.type(input, "C:\\existing.jpg");
    await user.click(screen.getByRole("button", { name: "参照" }));

    expect(input).toHaveValue("C:\\existing.jpg");
  });
});
