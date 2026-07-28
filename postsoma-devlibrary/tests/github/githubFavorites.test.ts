import { describe, expect, it } from "vitest";
import {
  createGitHubFavoriteId,
  parseGitHubRepositoryUrl,
  validateGitHubFavoritesCollection,
} from "../../lib/data/github-favorites";
import type { GitHubFavoritesCollection } from "../../lib/types/github-favorite";
import {
  inferCapabilities,
  inferTechStack,
  parseLegacyDate,
} from "../../scripts/github/migrateGithubFavorites";

function makeCollection(): GitHubFavoritesCollection {
  return {
    schemaVersion: 1,
    migratedAt: "2026-07-28T12:00:00.000Z",
    source: "github-content-library.csv",
    records: [
      {
        id: "favorite-1",
        githubUrl:
          "https://github.com/example/project/blob/main/README.md",
        title: "Example project",
        shortSummary: "A useful project.",
        capabilities: ["rag"],
        techStack: ["TypeScript"],
        personalNote: "",
        whySaved: "Reference implementation",
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
          fullSummary: "A longer description.",
        },
      },
    ],
  };
}

describe("GitHub favorites schema", () => {
  it("accepts a complete independent collection", () => {
    expect(validateGitHubFavoritesCollection(makeCollection())).toEqual([]);
  });

  it("rejects invalid health and repository URLs", () => {
    const collection = makeCollection();
    collection.records[0].health = "unknown" as "active";
    collection.records[0].githubUrl = "https://example.com/project";

    expect(validateGitHubFavoritesCollection(collection)).toEqual(
      expect.arrayContaining([
        "records[0].githubUrl must identify a GitHub repository",
        "records[0].health is invalid",
      ]),
    );
  });

  it("validates trusted timestamp provenance without changing legacy records", () => {
    const collection = makeCollection();
    collection.records[0].discoveredAtSource = "local-entry";
    collection.records[0].discoveredAt = null;
    collection.records[0].lastReviewedAtSource = "manual-review";
    collection.records[0].lastReviewedAt = null;

    expect(validateGitHubFavoritesCollection(collection)).toEqual(
      expect.arrayContaining([
        "records[0].discoveredAt is required when discoveredAtSource is set",
        "records[0].lastReviewedAt is required when lastReviewedAtSource is set",
      ]),
    );
  });
});

describe("GitHub legacy migration helpers", () => {
  it("extracts repository coordinates from a deep link", () => {
    expect(
      parseGitHubRepositoryUrl(
        "https://github.com/AsyncFuncAI/deepwiki-open/tree/main",
      ),
    ).toMatchObject({
      owner: "AsyncFuncAI",
      repo: "deepwiki-open",
      key: "asyncfuncai/deepwiki-open",
      canonicalUrl: "https://github.com/AsyncFuncAI/deepwiki-open",
    });
  });

  it("generates the same future ID for root and deep repository URLs", () => {
    expect(
      createGitHubFavoriteId(
        "https://github.com/AsyncFuncAI/deepwiki-open/tree/main",
      ),
    ).toBe(
      createGitHubFavoriteId(
        "https://github.com/AsyncFuncAI/deepwiki-open",
      ),
    );
  });

  it("normalizes legacy review dates and infers known technologies", () => {
    expect(parseLegacyDate("April 12, 2026 4:48 AM (EDT)")).toBe(
      "2026-04-12T08:48:00.000Z",
    );
    expect(
      inferTechStack({
        "Raw Input": "repo | TypeScript | MIT",
        Summary: "Built with Next.js and PostgreSQL.",
      }),
    ).toEqual(["TypeScript", "Next.js", "PostgreSQL"]);
  });

  it("supplements legacy tags with high-confidence capabilities", () => {
    expect(
      inferCapabilities(
        {
          Summary:
            "Uses OCR and a RAG pipeline to automate document search.",
        },
        ["document-processing"],
      ),
    ).toEqual(["document-processing", "RAG", "OCR", "Automation", "Search"]);
  });
});
