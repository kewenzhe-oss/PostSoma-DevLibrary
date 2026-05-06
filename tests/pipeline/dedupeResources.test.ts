import { describe, expect, it } from "vitest";
import {
  dedupeResources,
  normalizeUrlForDedupe,
} from "../../scripts/pipeline/dedupeResources";
import type { Resource } from "../../lib/types/resource";

const base: Resource = {
  id: "1",
  title: "Example",
  url: "https://example.com",
  language: "en",
  category: "General",
  collection: "books",
  type: "book",
  tags: [],
  quality: "unchecked",
  source: "free-programming-books",
  sourcePath: "test.md",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("normalizeUrlForDedupe", () => {
  it("lowercases hostname", () => {
    expect(normalizeUrlForDedupe("https://Example.COM/path")).toBe(
      "https://example.com/path",
    );
  });

  it("removes trailing slash", () => {
    expect(normalizeUrlForDedupe("https://example.com/")).toBe(
      "https://example.com",
    );
  });

  it("removes utm_ query params", () => {
    expect(
      normalizeUrlForDedupe("https://example.com/page?utm_source=test&id=1"),
    ).toBe("https://example.com/page?id=1");
  });

  it("handles invalid URLs gracefully", () => {
    expect(normalizeUrlForDedupe("not-a-url")).toBe("not-a-url");
  });
});

describe("dedupeResources", () => {
  it("keeps first occurrence and removes duplicates", () => {
    const resources: Resource[] = [
      { ...base, id: "1", url: "https://example.com/" },
      { ...base, id: "2", url: "https://example.com" },
      { ...base, id: "3", url: "https://other.com" },
    ];
    const result = dedupeResources(resources);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
    expect(result[1].id).toBe("3");
  });

  it("returns empty array for empty input", () => {
    expect(dedupeResources([])).toHaveLength(0);
  });

  it("handles utm_ params as duplicates", () => {
    const resources: Resource[] = [
      { ...base, id: "1", url: "https://example.com/page" },
      {
        ...base,
        id: "2",
        url: "https://example.com/page?utm_source=github",
      },
    ];
    expect(dedupeResources(resources)).toHaveLength(1);
  });
});
