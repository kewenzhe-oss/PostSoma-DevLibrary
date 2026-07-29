import { describe, expect, it } from "vitest";
import { githubRepositoryIdentity, linkGitHubFavoritesToResources } from "../../lib/data/github-favorite-linking";
import type { GitHubFavorite } from "../../lib/types/github-favorite";
import type { Resource } from "../../lib/types/resource";

const favorite: GitHubFavorite = {
  id: "favorite-1", githubUrl: "https://github.com/example/project/tree/main", title: "Project",
  shortSummary: "Summary", capabilities: ["Automation"], techStack: ["TypeScript"], personalNote: "", whySaved: "Reason",
  discoveredAt: null, lastReviewedAt: null, health: "active", lastCheckedAt: null, lastPushedAt: null,
  githubArchived: null, githubDisabled: null,
  editorial: { topic: "AI", resourceType: "app", quality: "standard", fullSummary: "Full summary" },
};
const upstreamResource: Resource = {
  id: "book-1", title: "An upstream book entry", url: "https://github.com/example/project", language: "en", collection: "books",
  category: "Books", type: "book", tags: [], quality: "unchecked", source: "free-programming-books", sourcePath: "test", updatedAt: "2026-07-29T00:00:00.000Z",
};

describe("GitHub favorite/resource linking", () => {
  it("normalizes GitHub deep links to a repository identity", () => {
    expect(githubRepositoryIdentity(favorite.githubUrl)).toBe("example/project");
  });

  it("keeps one detail-page ID when an upstream item and favorite share a repository", () => {
    const links = linkGitHubFavoritesToResources([upstreamResource], [favorite]);
    expect(links.resources).toHaveLength(1);
    expect(links.resources[0]).toMatchObject({ id: "book-1", collection: "github", title: "Project" });
    expect(links.favoritesByResourceId.get("book-1")).toBe(favorite);
    expect(links.unlinkedFavoriteIds).toEqual([]);
  });

  it("keeps direct GitHub resource IDs unchanged", () => {
    const directResource = { ...upstreamResource, id: favorite.id, collection: "github" as const, source: "GitHub" as const };
    const links = linkGitHubFavoritesToResources([directResource], [favorite]);
    expect(links.resources[0]?.id).toBe(favorite.id);
  });
});
