import { describe, expect, it } from "vitest";
import { validateResources } from "../../scripts/pipeline/validateResources";
import type { Resource } from "../../lib/types/resource";

const valid: Resource = {
  id: "abc123",
  title: "A Great Book",
  url: "https://example.com/book",
  language: "en",
  category: "JavaScript",
  collection: "books",
  type: "book",
  tags: ["JavaScript"],
  quality: "unchecked",
  source: "free-programming-books",
  sourcePath: "books/test.md",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("validateResources", () => {
  it("passes a valid resource", () => {
    const result = validateResources([valid]);
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(0);
  });

  it("rejects resource with missing id", () => {
    const result = validateResources([{ ...valid, id: "" }]);
    expect(result.invalid[0].reason).toBe("missing id");
  });

  it("rejects resource with blank title", () => {
    const result = validateResources([{ ...valid, title: "  " }]);
    expect(result.invalid[0].reason).toBe("missing title");
  });

  it("rejects resource with invalid url", () => {
    const result = validateResources([{ ...valid, url: "ftp://bad.url" }]);
    expect(result.invalid[0].reason).toBe("invalid url");
  });

  it("rejects resource with blank category", () => {
    const result = validateResources([{ ...valid, category: "" }]);
    expect(result.invalid[0].reason).toBe("missing category");
  });

  it("handles mixed valid and invalid resources", () => {
    const resources = [valid, { ...valid, id: "2", url: "not-a-url" }];
    const result = validateResources(resources);
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(1);
  });
});
