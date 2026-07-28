import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyGitHubHealthAuditReport,
  auditGitHubFavoriteHealth,
  classifyRepositoryHealth,
} from "../../scripts/github/checkGithubHealth";
import type {
  GitHubFavorite,
  GitHubFavoritesCollection,
} from "../../lib/types/github-favorite";

const checkedAt = "2026-07-28T12:00:00.000Z";

function makeFavorite(
  id: string,
  githubUrl: string,
): GitHubFavorite {
  return {
    id,
    githubUrl,
    title: id,
    shortSummary: "Audit fixture",
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
      topic: "Testing",
      resourceType: "app",
      quality: "standard",
      fullSummary: "Audit fixture",
    },
  };
}

function makeCollection(
  records: GitHubFavorite[],
): GitHubFavoritesCollection {
  return {
    schemaVersion: 1,
    migratedAt: "2026-07-01T00:00:00.000Z",
    source: "test.csv",
    records,
  };
}

function repositoryResponse(options: {
  archived?: boolean;
  disabled?: boolean;
  pushedAt?: string | null;
  isPrivate?: boolean;
}): Response {
  return new Response(
    JSON.stringify({
      archived: options.archived ?? false,
      disabled: options.disabled ?? false,
      pushed_at: options.pushedAt ?? null,
      language: null,
      private: options.isPrivate ?? false,
    }),
    {
      status: 200,
      headers: {
        "x-ratelimit-remaining": "4999",
        "x-ratelimit-reset": "1785258000",
      },
    },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("classifyRepositoryHealth", () => {
  it("prioritizes disabled and archived repository state", () => {
    expect(
      classifyRepositoryHealth({
        archived: false,
        disabled: true,
        pushedAt: "2026-07-27T12:00:00.000Z",
        checkedAt,
      }),
    ).toBe("unavailable");

    expect(
      classifyRepositoryHealth({
        archived: true,
        disabled: false,
        pushedAt: "2026-07-27T12:00:00.000Z",
        checkedAt,
      }),
    ).toBe("archived");
  });

  it("uses the push date and configurable quiet threshold", () => {
    expect(
      classifyRepositoryHealth({
        archived: false,
        disabled: false,
        pushedAt: "2026-07-01T12:00:00.000Z",
        checkedAt,
        quietDays: 30,
      }),
    ).toBe("active");

    expect(
      classifyRepositoryHealth({
        archived: false,
        disabled: false,
        pushedAt: "2026-01-01T12:00:00.000Z",
        checkedAt,
        quietDays: 30,
      }),
    ).toBe("quiet");
  });
});

describe("GitHub health audit dry-run", () => {
  it("classifies every record without mutating the canonical input", async () => {
    const collection = makeCollection([
      makeFavorite("active", "https://github.com/example/active"),
      makeFavorite("quiet", "https://github.com/example/quiet"),
      makeFavorite("archived", "https://github.com/example/archived"),
      makeFavorite("missing", "https://github.com/example/missing"),
      makeFavorite("bad-url", "https://example.com/not-github"),
    ]);
    const original = structuredClone(collection);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.endsWith("/active")) {
          return repositoryResponse({ pushedAt: "2026-07-20T00:00:00.000Z" });
        }
        if (url.endsWith("/quiet")) {
          return repositoryResponse({ pushedAt: "2025-01-01T00:00:00.000Z" });
        }
        if (url.endsWith("/archived")) {
          return repositoryResponse({
            archived: true,
            pushedAt: "2025-01-01T00:00:00.000Z",
          });
        }
        return new Response(null, {
          status: 404,
          headers: {
            "x-ratelimit-remaining": "4996",
            "x-ratelimit-reset": "1785258000",
          },
        });
      }),
    );

    const report = await auditGitHubFavoriteHealth({
      collection,
      token: "test-token",
      checkedAt,
      quietDays: 180,
      concurrency: 2,
    });

    expect(collection).toEqual(original);
    expect(report.summary).toEqual({
      totalRecords: 5,
      uniqueRepositories: 4,
      successfulRecords: 4,
      unparseableUrlRecords: 1,
      apiFailureRecords: 0,
    });
    expect(report.healthCounts).toEqual({
      active: 1,
      quiet: 1,
      archived: 1,
      unavailable: 1,
      unverified: 1,
    });
    expect(report.results).toHaveLength(5);
    expect(report.results.find((item) => item.id === "archived"))
      .toMatchObject({
        githubArchived: true,
        githubDisabled: false,
      });
    expect(report.lists.quiet[0]).toMatchObject({
      id: "quiet",
      lastPushedAt: "2025-01-01T00:00:00.000Z",
    });
    expect(report.lists.unverified[0]).toMatchObject({
      id: "bad-url",
      errorType: "url-unparseable",
    });
    expect(report.inputBaseline.provisionalHealthWarning).toContain(
      "migration defaults",
    );
    expect(report.safety.canonicalFilesModified).toBe(false);
  });

  it("keeps authentication and private responses unverified", async () => {
    const collection = makeCollection([
      makeFavorite("auth", "https://github.com/example/auth"),
      makeFavorite("private", "https://github.com/example/private"),
    ]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.endsWith("/private")) {
          return repositoryResponse({
            isPrivate: true,
            pushedAt: "2026-07-20T00:00:00.000Z",
          });
        }
        return new Response(null, {
          status: 401,
          headers: { "x-ratelimit-remaining": "4999" },
        });
      }),
    );

    const report = await auditGitHubFavoriteHealth({
      collection,
      token: "test-token",
      checkedAt,
    });

    expect(report.healthCounts).toEqual({
      active: 0,
      quiet: 0,
      archived: 0,
      unavailable: 0,
      unverified: 2,
    });
    expect(report.diagnostics.authenticationFailures).toBe(1);
    expect(report.diagnostics.privateRepositoryResponses).toBe(1);
    expect(report.lists.unverified.map((item) => item.errorType)).toEqual([
      "authentication",
      "private-repository",
    ]);
  });

  it("writes only verified health facts from a complete dry-run report", async () => {
    const favorite = makeFavorite(
      "active",
      "https://github.com/example/active",
    );
    favorite.capabilities = ["RAG"];
    favorite.techStack = ["TypeScript"];
    favorite.personalNote = "Keep this manual note.";
    favorite.discoveredAt = "2026-07-28T11:00:00.000Z";
    favorite.discoveredAtSource = "local-entry";
    favorite.lastReviewedAt = "2026-07-28T11:30:00.000Z";
    favorite.lastReviewedAtSource = "manual-review";
    const collection = makeCollection([favorite]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        repositoryResponse({
          pushedAt: "2026-07-20T00:00:00.000Z",
        }),
      ),
    );

    const report = await auditGitHubFavoriteHealth({
      collection,
      token: "test-token",
      checkedAt,
    });
    const updated = applyGitHubHealthAuditReport({
      collection,
      report,
    });

    expect(updated.records[0]).toEqual({
      ...favorite,
      health: "active",
      lastCheckedAt: checkedAt,
      lastPushedAt: "2026-07-20T00:00:00.000Z",
      githubArchived: false,
      githubDisabled: false,
    });
    expect(updated.records[0].techStack).toEqual(["TypeScript"]);
    expect(updated.records[0].personalNote).toBe(
      "Keep this manual note.",
    );
    expect(updated.records[0].discoveredAtSource).toBe("local-entry");
    expect(updated.records[0].lastReviewedAtSource).toBe(
      "manual-review",
    );
  });

  it("refuses writeback when any result remains unverified", async () => {
    const collection = makeCollection([
      makeFavorite("auth", "https://github.com/example/auth"),
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    const report = await auditGitHubFavoriteHealth({
      collection,
      token: "test-token",
      checkedAt,
    });

    expect(() =>
      applyGitHubHealthAuditReport({ collection, report }),
    ).toThrow("contains unverified records");
  });
});
