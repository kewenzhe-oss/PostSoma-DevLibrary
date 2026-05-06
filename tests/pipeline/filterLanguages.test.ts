import { describe, expect, it } from "vitest";
import { filterTargetLanguages } from "../../scripts/pipeline/filterLanguages";
import type { Resource } from "../../lib/types/resource";

const base: Resource = {
  id: "1",
  title: "Example",
  url: "https://example.com",
  language: "en",
  category: "General",
  type: "book",
  tags: [],
  quality: "unchecked",
  source: "free-programming-books",
  sourcePath: "test.md",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("filterTargetLanguages", () => {
  it("keeps only Chinese and English resources", () => {
    const resources = [
      base,
      { ...base, id: "2", language: "zh" as const },
      { ...base, id: "3", language: "en" as const },
    ];

    expect(filterTargetLanguages(resources).map((item) => item.language)).toEqual([
      "en",
      "zh",
      "en",
    ]);
  });

  it("returns all items when all are target languages", () => {
    const resources = [
      { ...base, id: "1", language: "en" as const },
      { ...base, id: "2", language: "zh" as const },
    ];
    expect(filterTargetLanguages(resources)).toHaveLength(2);
  });

  it("returns empty array when no target languages", () => {
    // All items are already en/zh in current setup, so this tests empty input
    expect(filterTargetLanguages([])).toHaveLength(0);
  });
});
