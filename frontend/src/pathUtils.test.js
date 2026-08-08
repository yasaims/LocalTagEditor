import { getDisplayName } from "./pathUtils";

describe("getDisplayName", () => {
  it("returns the last path segment", () => {
    expect(getDisplayName("C:\\photos\\vacation\\beach.jpg")).toBe("beach.jpg");
  });

  it("strips a trailing backslash before deriving the name", () => {
    expect(getDisplayName("C:\\photos\\vacation\\")).toBe("vacation");
  });

  it("strips a trailing forward slash before deriving the name", () => {
    expect(getDisplayName("C:\\photos\\vacation/")).toBe("vacation");
  });

  it("strips multiple trailing separators", () => {
    expect(getDisplayName("C:\\photos\\vacation\\\\")).toBe("vacation");
  });
});
