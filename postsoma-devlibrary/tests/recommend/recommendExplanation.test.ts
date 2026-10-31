import { describe, expect, it } from "vitest";
import { matchAndRecommend } from "../../lib/data/recommend";
import type { Resource } from "../../lib/types/resource";

describe("recommendation explanations", () => {
  it("does not claim an unverified documentation resource is official or current", async () => {
    const resource = {
      id: "third-party-python-docs",
      title: "Python documentation",
      url: "https://example.com/python",
      type: "documentation",
      language: "zh",
      category: "Python",
      tags: ["Python"],
    } as Resource;
    const result = await matchAndRecommend([resource], {
      goal: "Python", language: "zh", difficulty: "all", format: "all",
    });
    expect(result.picks).toHaveLength(1);
    const explanation = result.picks[0].explanation;
    expect(explanation.knownLimitations).toContain("原站核实");
    expect(Object.values(explanation).join(" ")).not.toMatch(/官方|最新|权威/);
  });
});


describe("short programming language queries", () => {
  it("matches Go and Golang without treating algorithm or Google as Go", async () => {
    const base: Omit<Resource, "id" | "title"> = { url: "https://example.com", type: "book", language: "en", tags: [], category: "Programming", collection: "books", quality: "standard", source: "free-programming-books", sourcePath: "books", updatedAt: "2026-01-01" };
    const resources: Resource[] = [
      { ...base, id: "algorithm", title: "Algorithms and Data Structures" },
      { ...base, id: "google", title: "Google Cloud Guide" },
      { ...base, id: "go", title: "Go Language" },
      { ...base, id: "golang", title: "Learn Golang" },
    ];
    const result = await matchAndRecommend(resources, { goal: "Go", language: "all", difficulty: "all", format: "all" });
    expect(result.funnel.matched).toBe(2);
    expect(result.picks.map((pick) => pick.resourceId).sort()).toEqual(["go", "golang"]);
  });
});
