import { describe, expect, it } from "vitest";
import { searchResources } from "../../lib/data/search";
import type { Resource } from "../../lib/types/resource";

const resources: Resource[] = [
  { id: "book", title: "Python Book", url: "https://example.com/book", language: "en", collection: "books", category: "Python", type: "book", tags: [], quality: "standard", source: "free-programming-books", sourcePath: "books", updatedAt: "2026-01-01" },
  { id: "course", title: "Python Course", url: "https://example.com/course", language: "en", collection: "courses", category: "Python", type: "course", tags: [], quality: "standard", source: "free-programming-books", sourcePath: "courses", updatedAt: "2026-01-01" },
  { id: "other", title: "Java Book", url: "https://example.com/java", language: "en", collection: "books", category: "Java", type: "book", tags: [], quality: "standard", source: "free-programming-books", sourcePath: "books", updatedAt: "2026-01-01" },
];

describe("resource search scope", () => {
  it("finds matching items across collections, then narrows when requested", () => {
    expect(searchResources(resources, { query: "Python", collection: "all" }).map((item) => item.id).sort()).toEqual(["book", "course"]);
    expect(searchResources(resources, { query: "Python", collection: "courses" }).map((item) => item.id)).toEqual(["course"]);
  });
});


describe("bilingual topic search", () => {
  const bilingualResources: Resource[] = [
    { ...resources[0], id: "zh-ml", title: "机器学习入门", category: "机器学习", language: "zh" },
    { ...resources[0], id: "en-ml", title: "Machine Learning", category: "Machine Learning", language: "en" },
    { ...resources[0], id: "db", title: "Database Basics", category: "Database", language: "en" },
    { ...resources[0], id: "learning", title: "Learning Python", category: "Python", language: "en" },
  ];
  it("includes English matches after Chinese matches without duplicates", () => {
    const matches = searchResources(bilingualResources, { query: "机器学习", limit: 10 });
    expect(matches.map((item) => item.id)).toEqual(["zh-ml", "en-ml"]);
    expect(searchResources(bilingualResources, { query: "機器學習", language: "zh" }).map((item) => item.id)).toEqual(["zh-ml"]);
    expect(searchResources(bilingualResources, { query: "資料庫" }).map((item) => item.id)).toEqual(["db"]);
    expect(searchResources(bilingualResources, { query: "机器学习", limit: 1 })).toHaveLength(1);
    expect(searchResources(bilingualResources, { query: "机器学习", limit: 0 })).toHaveLength(0);
  });
});
