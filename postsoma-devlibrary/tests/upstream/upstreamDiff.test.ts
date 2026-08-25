import { describe, expect, it } from "vitest";
import type { Resource } from "../../lib/types/resource";
import {
  buildUpstreamDiff,
  type SnapshotDiagnostics,
} from "../../scripts/upstream/diffFreeProgrammingBooks";

function resource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: "resource-id",
    title: "Example Resource",
    url: "https://example.com/resource",
    language: "en",
    collection: "books",
    category: "Programming",
    type: "book",
    tags: [],
    quality: "unchecked",
    source: "free-programming-books",
    sourcePath: "books/example.md",
    updatedAt: "1970-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function diagnostics(count: number): SnapshotDiagnostics {
  return {
    sourceDir: "/snapshot",
    configuredFiles: 1,
    parsedRecords: count,
    deduplicatedRecords: count,
    duplicateRecords: 0,
    invalidRecords: 0,
  };
}

describe("buildUpstreamDiff", () => {
  it("separates upstream additions and removal candidates", () => {
    const result = buildUpstreamDiff({
      baseline: {
        records: [resource({ url: "https://example.com/old" })],
        diagnostics: diagnostics(1),
      },
      upstream: {
        records: [resource({ url: "https://example.com/new" })],
        diagnostics: diagnostics(1),
      },
    });

    expect(result.added.map((record) => record.url)).toEqual([
      "https://example.com/new",
    ]);
    expect(result.removed.map((record) => record.url)).toEqual([
      "https://example.com/old",
    ]);
    expect(result.possibleReplacements).toHaveLength(1);
  });

  it("records meaningful metadata changes without treating them as new URLs", () => {
    const result = buildUpstreamDiff({
      baseline: {
        records: [resource()],
        diagnostics: diagnostics(1),
      },
      upstream: {
        records: [resource({ title: "Updated title", category: "Web" })],
        diagnostics: diagnostics(1),
      },
    });

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.changed).toHaveLength(1);
    expect(result.changed[0].changedFields).toEqual(["title", "category"]);
  });

  it("normalizes tracking parameters and trailing slashes for identity", () => {
    const result = buildUpstreamDiff({
      baseline: {
        records: [resource({ url: "https://EXAMPLE.com/resource/?utm_source=old" })],
        diagnostics: diagnostics(1),
      },
      upstream: {
        records: [resource({ url: "https://example.com/resource" })],
        diagnostics: diagnostics(1),
      },
    });

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
  });

  it("blocks suspicious parser count collapses", () => {
    const result = buildUpstreamDiff({
      baseline: {
        records: Array.from({ length: 100 }, (_, index) =>
          resource({ url: `https://example.com/${index}` }),
        ),
        diagnostics: diagnostics(100),
      },
      upstream: {
        records: Array.from({ length: 20 }, (_, index) =>
          resource({ url: `https://example.com/${index}` }),
        ),
        diagnostics: diagnostics(20),
      },
    });

    expect(result.diagnostics.blocked).toBe(true);
    expect(result.diagnostics.warnings[0]).toContain("fell from 100 to 20");
  });
});

