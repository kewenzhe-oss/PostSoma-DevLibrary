import { describe, expect, it } from "vitest";
import { getCompactGitHubSummary } from "../../components/resources/GitHubFavoriteMeta";

describe("getCompactGitHubSummary", () => {
  it("keeps short summaries and normalizes whitespace", () => {
    expect(
      getCompactGitHubSummary(`A focused  RAG
reference implementation.`),
    ).toBe("A focused RAG reference implementation.");
  });

  it("limits long summaries to a scan-friendly length", () => {
    const result = getCompactGitHubSummary(
      "This repository provides a complete reference implementation for production document processing, semantic retrieval, automated evaluation, observability, deployment, and maintenance workflows.",
    );

    expect(Array.from(result).length).toBeLessThanOrEqual(141);
    expect(result.endsWith("…")).toBe(true);
  });

  it("labels a missing future summary honestly instead of inventing copy", () => {
    expect(getCompactGitHubSummary("")).toBe(
      "Summary pending — add a factual description when ready.",
    );
  });
});
