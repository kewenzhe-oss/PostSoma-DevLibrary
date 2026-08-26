import { describe, expect, it } from "vitest";
import {
  buildResourceFacetModel,
  filterResourcesByFacets,
  type ResourceFacetSelection,
} from "../../lib/data/resource-facets";
import type {
  CanonicalTopicId,
  Resource,
  ResourceLanguage,
  ResourceType,
} from "../../lib/types/resource";

function resource(
  id: string,
  topic: CanonicalTopicId | null,
  subcategory: string | null,
  language: ResourceLanguage,
  resourceType: ResourceType,
): Resource {
  return {
    id,
    title: id,
    url: `https://example.com/${id}`,
    language,
    collection: "books",
    category: "Legacy",
    type: resourceType,
    tags: [],
    quality: "standard",
    source: "free-programming-books",
    sourcePath: "test.md",
    updatedAt: "2026-08-25T00:00:00.000Z",
    ...(topic
      ? {
          facet: {
            canonicalTopic: topic,
            subcategory: subcategory
              ? {
                  id: subcategory,
                  labelEn: subcategory,
                  labelZh: null,
                }
              : null,
            language,
            resourceType,
            reviewStatus: "pending" as const,
          },
        }
      : {}),
  };
}

const emptySelection: ResourceFacetSelection = {
  topics: [],
  subcategories: [],
  languages: ["en", "zh"],
  resourceTypes: [],
};

describe("public resource facets", () => {
  const resources = [
    resource("react-book", "web-development", "react", "en", "book"),
    resource("vue-course", "web-development", "vue", "zh", "course"),
    resource("python-book", "programming-languages", "python", "en", "book"),
    resource("legacy", null, null, "en", "book"),
  ];

  it("ORs values inside a facet and ANDs separate facets", () => {
    const result = filterResourcesByFacets(resources, {
      topics: ["web-development", "programming-languages"],
      subcategories: [],
      languages: ["en"],
      resourceTypes: ["book"],
    });

    expect(result.map((item) => item.id)).toEqual([
      "react-book",
      "python-book",
    ]);
  });

  it("does not force unclassified records into a canonical topic", () => {
    const result = filterResourcesByFacets(resources, {
      ...emptySelection,
      topics: ["web-development"],
    });

    expect(result.map((item) => item.id)).toEqual(["react-book", "vue-course"]);
  });

  it("computes disjunctive counts without the facet counting itself", () => {
    const model = buildResourceFacetModel(resources, {
      ...emptySelection,
      topics: ["web-development"],
      resourceTypes: ["book"],
    });

    expect(model.topics.find((option) => option.value === "web-development")?.count).toBe(1);
    expect(model.topics.find((option) => option.value === "programming-languages")?.count).toBe(1);
    expect(model.resourceTypes.find((option) => option.value === "book")?.count).toBe(1);
    expect(model.resourceTypes.find((option) => option.value === "course")?.count).toBe(1);
    expect(model.classifiedCount).toBe(3);
  });
});
