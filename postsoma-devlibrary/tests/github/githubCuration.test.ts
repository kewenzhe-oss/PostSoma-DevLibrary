import { describe, expect, it } from "vitest";
import {
  auditGitHubFavoriteCuration,
  findAgentSkillsHubSignal,
  validateGitHubFavoriteCurationCollection,
} from "../../lib/data/github-curation";
import type { GitHubFavorite } from "../../lib/types/github-favorite";
import type { GitHubFavoriteCurationCollection } from "../../lib/types/github-curation";
import type { Resource } from "../../lib/types/resource";

function makeFavorite(
  id: string,
  title: string,
  githubUrl: string,
): GitHubFavorite {
  return {
    id,
    githubUrl,
    title,
    shortSummary: "A useful project.",
    capabilities: [],
    techStack: [],
    personalNote: "",
    whySaved: "",
    discoveredAt: null,
    lastReviewedAt: null,
    health: "active",
    lastCheckedAt: null,
    lastPushedAt: null,
    githubArchived: null,
    githubDisabled: null,
    editorial: {
      topic: "AI",
      resourceType: "app",
      quality: "standard",
      fullSummary: "A useful project.",
    },
  };
}

function makeResource(
  id: string,
  collection: Resource["collection"],
): Resource {
  return {
    id,
    title: id,
    url: `https://example.com/${id}`,
    language: "en",
    collection,
    category: "AI",
    type:
      collection === "books"
        ? "book"
        : collection === "courses"
          ? "course"
          : "app",
    tags: [],
    quality: "standard",
    source: collection === "github" ? "GitHub" : "free-programming-books",
    sourcePath: "test",
    updatedAt: "2026-07-28T00:00:00.000Z",
  };
}

function makeCollection(): GitHubFavoriteCurationCollection {
  return {
    schemaVersion: 1,
    updatedAt: "2026-07-28T00:00:00.000Z",
    source: "manual-curation",
    records: [
      {
        favoriteId: "project",
        belongsTo: "devlibrary",
        relatedLearningResourceIds: ["book"],
        relationNote: "Read the book before reviewing the implementation.",
      },
      {
        favoriteId: "skill",
        belongsTo: "agent-skills-hub",
        relatedLearningResourceIds: [],
        boundaryReason: "Packaged agent skill.",
      },
    ],
  };
}

describe("GitHub manual curation schema", () => {
  it("accepts explicit relationships and boundary decisions", () => {
    expect(
      validateGitHubFavoriteCurationCollection(makeCollection()),
    ).toEqual([]);
  });

  it("requires editorial context for links and hub routing", () => {
    const collection = makeCollection();
    collection.records[0].relationNote = undefined;
    collection.records[1].boundaryReason = undefined;

    expect(
      validateGitHubFavoriteCurationCollection(collection),
    ).toEqual(
      expect.arrayContaining([
        "records[0].relationNote is required when learning resources are linked",
        "records[1].boundaryReason is required for Agent Skills Hub routing",
      ]),
    );
  });
});

describe("GitHub curation audit", () => {
  it("resolves bidirectional links and routed records", () => {
    const project = makeFavorite(
      "project",
      "Reference project",
      "https://github.com/example/reference-project",
    );
    const skill = makeFavorite(
      "skill",
      "Example / agent-skills",
      "https://github.com/example/agent-skills",
    );
    const audit = auditGitHubFavoriteCuration({
      collection: makeCollection(),
      favorites: [project, skill],
      resources: [
        makeResource("project", "github"),
        makeResource("skill", "github"),
        makeResource("book", "books"),
      ],
    });

    expect(audit.errors).toEqual([]);
    expect(audit.linkedFavoriteCount).toBe(1);
    expect(audit.linkedLearningResourceCount).toBe(1);
    expect(audit.routedToAgentSkillsHub.map(({ favorite }) => favorite.id))
      .toEqual(["skill"]);
    expect(audit.needsBoundaryReview).toEqual([]);
  });

  it("flags unclassified skill or MCP-shaped repositories for review", () => {
    const unclassified = makeFavorite(
      "unclassified",
      "Example MCP",
      "https://github.com/example/example-mcp",
    );
    const audit = auditGitHubFavoriteCuration({
      collection: {
        ...makeCollection(),
        records: [],
      },
      favorites: [unclassified],
      resources: [makeResource("unclassified", "github")],
    });

    expect(audit.needsBoundaryReview).toEqual([
      { favorite: unclassified, signal: "MCP tool" },
    ]);
  });

  it("allows only the pre-generation GitHub index gap when requested", () => {
    const project = makeFavorite(
      "project",
      "Reference project",
      "https://github.com/example/reference-project",
    );
    const options = {
      collection: {
        ...makeCollection(),
        records: [makeCollection().records[0]],
      },
      favorites: [project],
      resources: [makeResource("book", "books")],
    };

    expect(auditGitHubFavoriteCuration(options).errors).toContain(
      "Curation favorite Reference project is missing from compiled resources",
    );
    expect(
      auditGitHubFavoriteCuration({
        ...options,
        allowCanonicalFavoritesMissingFromResources: true,
      }).errors,
    ).toEqual([]);
  });

  it("keeps research implementations outside the narrow tool heuristic", () => {
    const researchProject = makeFavorite(
      "research",
      "TauricResearch / TradingAgents",
      "https://github.com/TauricResearch/TradingAgents",
    );

    expect(findAgentSkillsHubSignal(researchProject)).toBeNull();
  });
});
