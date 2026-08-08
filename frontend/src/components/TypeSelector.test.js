import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TypeSelector from "./TypeSelector";
import { renderWithRouter } from "../test-utils";

const LABELS = ["フォルダ", "画像", "動画", "PDF", "その他"];

describe("TypeSelector", () => {
  it("renders one button per file type, addressable by its aria-label", () => {
    renderWithRouter(<TypeSelector selected={[]} onChange={() => {}} />);
    for (const label of LABELS) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("marks selected types as aria-pressed", () => {
    renderWithRouter(<TypeSelector selected={["image", "pdf"]} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "画像" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "PDF" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "フォルダ" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("adds a type to the selection when clicked", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderWithRouter(<TypeSelector selected={["image"]} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "動画" }));

    expect(onChange).toHaveBeenCalledWith(["image", "video"]);
  });

  it("removes an already-selected type when clicked again", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderWithRouter(<TypeSelector selected={["image", "video"]} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "動画" }));

    expect(onChange).toHaveBeenCalledWith(["image"]);
  });

  it("navigates back to / when toggled from another page", async () => {
    const user = userEvent.setup();
    renderWithRouter(<TypeSelector selected={[]} onChange={() => {}} />, {
      route: "/files/3",
      path: "/files/:id",
    });

    await user.click(screen.getByRole("button", { name: "画像" }));

    // TypeSelector has no visible route indicator, but navigating away from
    // /files/:id unmounts it (the route no longer matches) -- absence proves
    // the redirect happened.
    expect(screen.queryByRole("button", { name: "画像" })).not.toBeInTheDocument();
  });
});
