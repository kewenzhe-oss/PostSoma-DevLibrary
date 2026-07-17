import { describe, it, expect } from "vitest";
import { normalizeMarkdownHeading } from "./parseMarkdown";

describe("normalizeMarkdownHeading", () => {
  it("removes HTML anchor tags with id", () => {
    expect(normalizeMarkdownHeading('<a id="version-control-system"></a>版本控制')).toBe("版本控制");
    expect(normalizeMarkdownHeading('<a id="android"></a>Android')).toBe("Android");
  });

  it("removes HTML anchor tags with name", () => {
    expect(normalizeMarkdownHeading('<a name="ios"></a>iOS')).toBe("iOS");
  });

  it("handles strings without HTML", () => {
    expect(normalizeMarkdownHeading("BY PROGRAMMING LANGUAGE")).toBe("BY PROGRAMMING LANGUAGE");
    expect(normalizeMarkdownHeading("Python")).toBe("Python");
  });

  it("trims whitespace", () => {
    expect(normalizeMarkdownHeading("  Some Heading  ")).toBe("Some Heading");
  });
});
