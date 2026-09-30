import { describe, it, expect } from "vitest";
import curatedSurprise from "../../data/curated-surprise.json";
import rawResources from "../../public/data/resources.json";

describe("Curated Surprise Prize Pool", () => {
  it("contains between 20 and 30 curated entries", () => {
    expect(curatedSurprise.length).toBeGreaterThanOrEqual(20);
    expect(curatedSurprise.length).toBeLessThanOrEqual(30);
  });

  it("verifies every resourceId exists in public/data/resources.json", () => {
    const resourceMap = new Map(rawResources.map((r) => [r.id, r]));
    for (const item of curatedSurprise) {
      expect(
        resourceMap.has(item.resourceId),
        `Resource ID ${item.resourceId} must exist in resources.json`
      ).toBe(true);
    }
  });

  it("verifies every curatorNote is concise and under 60 characters", () => {
    for (const item of curatedSurprise) {
      expect(item.curatorNote.length).toBeGreaterThan(5);
      expect(item.curatorNote.length).toBeLessThanOrEqual(60);
    }
  });

  it("ensures language and collection diversity across the pool", () => {
    const resourceMap = new Map(rawResources.map((r) => [r.id, r]));
    const languages = new Set<string>();
    const collections = new Set<string>();

    for (const item of curatedSurprise) {
      const res = resourceMap.get(item.resourceId);
      if (res) {
        languages.add(res.language);
        if (res.collection) collections.add(res.collection);
      }
    }

    expect(languages.has("zh")).toBe(true);
    expect(languages.has("en")).toBe(true);
    expect(collections.size).toBeGreaterThanOrEqual(3);
  });
});
