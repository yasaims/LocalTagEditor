import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagSelector from "./TagSelector";
import { renderWithRouter } from "../test-utils";

describe("TagSelector", () => {
  it("renders one checkbox per tag", () => {
    renderWithRouter(
      <TagSelector tags={["anime", "landscape"]} selected={[]} onChange={() => {}} />,
    );
    expect(screen.getByRole("checkbox", { name: "anime" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "landscape" })).toBeInTheDocument();
  });

  it("checks the boxes for already-selected tags", () => {
    renderWithRouter(
      <TagSelector tags={["anime", "landscape"]} selected={["landscape"]} onChange={() => {}} />,
    );
    expect(screen.getByRole("checkbox", { name: "anime" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "landscape" })).toBeChecked();
  });

  it("filters the tag list case-insensitively as you type", async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <TagSelector tags={["Anime", "Landscape"]} selected={[]} onChange={() => {}} />,
    );

    await user.type(screen.getByPlaceholderText("search tags"), "AND");

    expect(screen.getByRole("checkbox", { name: "Landscape" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Anime" })).not.toBeInTheDocument();
  });

  it("adds a tag to the selection when its checkbox is toggled on", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderWithRouter(<TagSelector tags={["anime"]} selected={[]} onChange={onChange} />);

    await user.click(screen.getByRole("checkbox", { name: "anime" }));

    expect(onChange).toHaveBeenCalledWith(["anime"]);
  });

  it("removes a tag from the selection when its checkbox is toggled off", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderWithRouter(<TagSelector tags={["anime"]} selected={["anime"]} onChange={onChange} />);

    await user.click(screen.getByRole("checkbox", { name: "anime" }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("navigates back to / when a tag is toggled from another page", async () => {
    const user = userEvent.setup();
    renderWithRouter(<TagSelector tags={["anime"]} selected={[]} onChange={() => {}} />, {
      route: "/files/3",
      path: "/files/:id",
    });

    await user.click(screen.getByRole("checkbox", { name: "anime" }));

    expect(screen.queryByRole("checkbox", { name: "anime" })).not.toBeInTheDocument();
  });
});
