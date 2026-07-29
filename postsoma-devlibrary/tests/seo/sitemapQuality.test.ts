import { describe, expect, it } from "vitest";
import { getSitemapIndexability } from "../../lib/seo/sitemap-quality";
import type { Resource } from "../../lib/types/resource";

const base: Resource = {
  id: "resource-1",
  title: "A curated resource",
  url: "https://github.com/example/project",
  language: "en",
  collection: "github",
  category: "AI",
  type: "app",
  tags: [],
  quality: "featured",
  source: "GitHub",
  sourcePath: "test",
  updatedAt: "2026-07-29T00:00:00.000Z",
  summary: "A sufficiently detailed editorial summary that explains the resource's learning and practical value for a reader deciding whether to visit it.",
  cardSummary: "A compact, independently useful summary of this GitHub project.",
  keyTakeaway: "A real curation rationale that explains why this repository was saved.",
};

describe("sitemap quality rule", () => {
  it("indexes featured GitHub resources with complete curated context", () => {
    expect(getSitemapIndexability(base)).toEqual({ indexable: true });
  });

  it("excludes non-featured resources before content checks", () => {
    expect(getSitemapIndexability({ ...base, quality: "standard" })).toEqual({
      indexable: false,
      reason: "not-featured",
    });
  });

  it("excludes GitHub resources without a personal why-saved rationale", () => {
    expect(getSitemapIndexability({ ...base, keyTakeaway: "" })).toEqual({
      indexable: false,
      reason: "missing-why-saved",
    });
  });

  it("requires a substantive detail summary for every featured resource", () => {
    expect(getSitemapIndexability({ ...base, summary: "Too short" })).toEqual({
      indexable: false,
      reason: "missing-detail-summary",
    });
  });
});
