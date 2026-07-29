import { describe, expect, it } from "vitest";
import { getResourceMetadataDescription } from "../../lib/seo/resource-metadata";
import type { GitHubFavorite } from "../../lib/types/github-favorite";
import type { Resource } from "../../lib/types/resource";

const resource: Resource = {
  id: "resource-1",
  title: "Example",
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
};

const favorite: GitHubFavorite = {
  id: "favorite-1",
  githubUrl: resource.url,
  title: "Example",
  shortSummary: "A compact project summary for developers evaluating the repository.",
  capabilities: ["Automation"],
  techStack: ["TypeScript"],
  personalNote: "",
  whySaved: "Useful reference for a local-first automation workflow.",
  discoveredAt: null,
  lastReviewedAt: null,
  health: "active",
  lastCheckedAt: null,
  lastPushedAt: null,
  githubArchived: null,
  githubDisabled: null,
  editorial: { topic: "AI", resourceType: "app", quality: "featured", fullSummary: "Full summary." },
};

describe("resource metadata descriptions", () => {
  it("prioritizes the GitHub short summary and why-saved context", () => {
    const description = getResourceMetadataDescription(resource, favorite);
    expect(description).toContain(favorite.shortSummary);
    expect(description).toContain("Why saved:");
    expect(description).toContain(favorite.whySaved);
  });

  it("falls back to the generic collection description without GitHub context", () => {
    expect(getResourceMetadataDescription(resource)).toContain("Free app resource");
  });

  it("keeps social metadata within a safe description length", () => {
    const longFavorite = { ...favorite, shortSummary: "A".repeat(180), whySaved: "B".repeat(80) };
    expect(getResourceMetadataDescription(resource, longFavorite)).toHaveLength(160);
  });
});
