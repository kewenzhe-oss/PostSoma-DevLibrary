import { describe, expect, it } from "vitest";
import { buildLlmsFiles } from "../../lib/seo/llms";

const manifest = {
  generatedAt: "2026-07-29T12:00:00.000Z",
  total: 12,
  languages: { en: 9, zh: 3 },
  sourceRepo: "https://github.com/example/catalog",
  topCategories: [{ name: "Python", count: 4 }],
  paths: 1,
  weeklyPick: { weekOf: "2026-07-28" },
};

const collections = [{ id: "books", label: "Books", count: 12 }];

describe("pipeline-generated llms files", () => {
  it("uses the canonical www host and manifest counts", () => {
    const files = buildLlmsFiles(manifest, collections);

    expect(files.summary).toContain("Canonical site: https://www.205022.xyz");
    expect(files.summary).toContain("Total resources: 12");
    expect(files.full).toContain("**Books**: 12 items");
    expect(files.full).toContain("Python: 4 items");
  });

  it("does not emit the redirecting apex domain", () => {
    const files = buildLlmsFiles(manifest, collections);

    expect(files.summary).not.toContain("https://205022.xyz");
    expect(files.full).not.toContain("https://205022.xyz");
  });
});
