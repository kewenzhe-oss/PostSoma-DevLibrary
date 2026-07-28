import { describe, expect, it } from "vitest";
import {
  buildGitHubFacetOptions,
  searchGitHubFavorites,
} from "../../lib/data/github-search";
import type { GitHubFavorite } from "../../lib/types/github-favorite";
import type { Resource } from "../../lib/types/resource";

function createResource(id: string, title: string): Resource {
  return {
    id,
    title,
    url: `https://github.com/example/${id}`,
    language: "en",
    collection: "github",
    category: "AI",
    type: "app",
    tags: [],
    quality: "standard",
    source: "GitHub",
    sourcePath: "test",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function createFavorite(
  id: string,
  overrides: Partial<GitHubFavorite> = {},
): GitHubFavorite {
  return {
    id,
    githubUrl: `https://github.com/example/${id}`,
    title: id,
    shortSummary: "A focused open-source reference.",
    capabilities: [],
    techStack: [],
    personalNote: "",
    whySaved: "",
    discoveredAt: "2024-01-01T00:00:00.000Z",
    lastReviewedAt: "2025-01-01T00:00:00.000Z",
    health: "active",
    lastCheckedAt: "2026-07-27T00:00:00.000Z",
    lastPushedAt: null,
    githubArchived: null,
    githubDisabled: null,
    editorial: {
      topic: "AI",
      resourceType: "app",
      quality: "standard",
      fullSummary: "A complete reference implementation.",
    },
    ...overrides,
  };
}

describe("GitHub structured client search", () => {
  it("merges facet casing and counts a value once per record", () => {
    const options = buildGitHubFacetOptions(
      [
        createFavorite("one", {
          capabilities: ["Automation", "automation"],
        }),
        createFavorite("two", {
          capabilities: ["automation"],
        }),
      ],
      "capabilities",
    );

    expect(options).toEqual([
      { value: "automation", label: "Automation", count: 2 },
    ]);
  });

  it("matches GitHub-specific fields and explains structured matches", () => {
    const resources = [
      createResource("voice-rag", "Voice retrieval"),
      createResource("ocr", "Document parser"),
    ];
    const favorites = [
      createFavorite("voice-rag", {
        capabilities: ["RAG", "Speech"],
        techStack: ["Python"],
      }),
      createFavorite("ocr", {
        capabilities: ["OCR"],
        techStack: ["Rust"],
      }),
    ];

    const result = searchGitHubFavorites(
      resources,
      new Map(favorites.map((favorite) => [favorite.id, favorite])),
      {
        query: "rag python",
        mode: "topic",
      },
    );

    expect(result.resources.map((resource) => resource.id)).toEqual([
      "voice-rag",
    ]);
    expect(result.matchReasonsById.get("voice-rag")).toEqual(
      expect.arrayContaining([
        { kind: "capability", label: "Capability", value: "RAG" },
        { kind: "techStack", label: "Stack", value: "Python" },
      ]),
    );
  });

  it("ANDs capability, tech stack and health filters", () => {
    const resources = [
      createResource("match", "Match"),
      createResource("wrong-health", "Wrong health"),
      createResource("wrong-stack", "Wrong stack"),
    ];
    const favorites = [
      createFavorite("match", {
        capabilities: ["Speech"],
        techStack: ["Python"],
        health: "quiet",
      }),
      createFavorite("wrong-health", {
        capabilities: ["Speech"],
        techStack: ["Python"],
        health: "active",
      }),
      createFavorite("wrong-stack", {
        capabilities: ["Speech"],
        techStack: ["Rust"],
        health: "quiet",
      }),
    ];

    const result = searchGitHubFavorites(
      resources,
      new Map(favorites.map((favorite) => [favorite.id, favorite])),
      {
        query: "",
        capability: "speech",
        techStack: "python",
        health: "quiet",
        mode: "topic",
      },
    );

    expect(result.resources.map((resource) => resource.id)).toEqual(["match"]);
    expect(result.matchReasonsById.get("match")).toEqual([
      { kind: "capability", label: "Capability", value: "Speech" },
      { kind: "techStack", label: "Stack", value: "Python" },
      { kind: "health", label: "Health", value: "Quiet" },
    ]);
  });

  it("keeps unchecked additions visible but out of verified health filters", () => {
    const resource = createResource("unchecked", "Unchecked");
    const favorite = createFavorite("unchecked", {
      health: "active",
      lastCheckedAt: null,
    });
    const favorites = new Map([[favorite.id, favorite]]);

    expect(
      searchGitHubFavorites([resource], favorites, {
        query: "",
        mode: "topic",
      }).resources,
    ).toEqual([resource]);
    expect(
      searchGitHubFavorites([resource], favorites, {
        query: "",
        health: "active",
        mode: "topic",
      }).resources,
    ).toEqual([]);
  });

  it("keeps stable library order in recall mode while personal history is unavailable", () => {
    const resources = [
      createResource("recent", "Recent"),
      createResource("old", "Old"),
      createResource("unknown", "Unknown"),
    ];
    const favorites = [
      createFavorite("recent", {
        discoveredAt: "2025-01-01T00:00:00.000Z",
        lastReviewedAt: "2026-01-01T00:00:00.000Z",
      }),
      createFavorite("old", {
        discoveredAt: "2022-01-01T00:00:00.000Z",
        lastReviewedAt: "2023-01-01T00:00:00.000Z",
      }),
      createFavorite("unknown", {
        discoveredAt: null,
        lastReviewedAt: null,
      }),
    ];
    const favoritesById = new Map(
      favorites.map((favorite) => [favorite.id, favorite]),
    );

    const recall = searchGitHubFavorites(resources, favoritesById, {
      query: "",
      mode: "recall",
    });

    expect(recall.resources.map((resource) => resource.id)).toEqual([
      "recent",
      "old",
      "unknown",
    ]);
  });
});
