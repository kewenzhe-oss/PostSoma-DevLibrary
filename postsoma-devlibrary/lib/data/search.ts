import MiniSearch from "minisearch";
import type { Resource } from "@/lib/types/resource";
import { getSearchAliases } from "./search-aliases";

export interface SearchResourcesInput {
  query: string;
  language?: "zh" | "en" | "all";
  collection?: string;
  category?: string;
  tocPath?: string[];
  limit?: number;
}

let _index: MiniSearch<Resource> | null = null;
let _indexedResources: Resource[] = [];

function buildIndex(resources: Resource[]): MiniSearch<Resource> {
  const index = new MiniSearch<Resource>({
    fields: [
      "title",
      "category",
      "subcategory",
      "canonicalTopic",
      "canonicalSubcategory",
      "tags",
      "type",
    ],
    storeFields: [
      "id",
      "title",
      "url",
      "language",
      "category",
      "subcategory",
      "type",
      "tags",
      "quality",
      "source",
      "sourcePath",
      "updatedAt",
    ],
    searchOptions: {
      boost: { title: 3, category: 2, subcategory: 1.5 },
      fuzzy: 0.2,
      prefix: true,
    },
    // join array tags for indexing
    extractField: (document: Resource, fieldName: string) => {
      const doc = document as unknown as Record<string, unknown>;
      if (fieldName === "canonicalTopic") {
        return document.facet?.canonicalTopic ?? "";
      }
      if (fieldName === "canonicalSubcategory") {
        return document.facet?.subcategory?.id ?? "";
      }
      const value = doc[fieldName];
      if (fieldName === "tags" && Array.isArray(value)) {
        return value.join(" ");
      }
      return value as string;
    },
  });

  index.addAll(resources);
  return index;
}

function getOrBuildIndex(resources: Resource[]): MiniSearch<Resource> {
  if (_index && _indexedResources === resources) return _index;
  _index = buildIndex(resources);
  _indexedResources = resources;
  return _index;
}

export function searchResources(
  resources: Resource[],
  input: SearchResourcesInput,
): Resource[] {
  const { query, language = "all", collection, category, tocPath, limit = 200 } = input;

  if (limit <= 0) return [];
  let filtered = resources;

  // Language filter
  if (language !== "all") {
    filtered = filtered.filter((r) => r.language === language);
  }

  // Collection filter
  if (collection && collection !== "all") {
    filtered = filtered.filter((r) => r.collection === collection);
  }

  // Category filter
  if (category && category !== "all") {
    filtered = filtered.filter((r) => r.category === category);
  }

  // TOC Path filter (prefix match)
  if (tocPath && tocPath.length > 0) {
    filtered = filtered.filter((r) => {
      if (!r.tocPath) return false;
      // All segments in the selected tocPath must match the resource's tocPath in order
      return tocPath.every((segment, i) => r.tocPath![i] === segment);
    });
  }

  // No query — return filtered list sorted by category then title
  if (!query.trim()) {
    return filtered.slice(0, limit);
  }

  // Full-text search on filtered set
  const index = getOrBuildIndex(resources);
  const filteredById = new Map(filtered.map((resource) => [resource.id, resource]));
  const searchOptions = { filter: (result: { id: string }) => filteredById.has(result.id) };
  const directMatches = index.search(query, searchOptions);
  const aliasMatches = getSearchAliases(query).flatMap((alias) =>
    index.search(alias, { ...searchOptions, combineWith: "AND" }),
  );
  const seen = new Set<string>();
  const matchingResources: Resource[] = [];
  for (const match of [...directMatches, ...aliasMatches]) {
    if (seen.has(match.id)) continue;
    const resource = filteredById.get(match.id);
    if (!resource) continue;
    seen.add(match.id);
    matchingResources.push(resource);
    if (matchingResources.length >= limit) break;
  }
  return matchingResources;
}
