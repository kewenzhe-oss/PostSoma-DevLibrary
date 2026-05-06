import MiniSearch from "minisearch";
import type { Resource } from "@/lib/types/resource";

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
    fields: ["title", "category", "subcategory", "tags", "type"],
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
    extractField: (document: Record<string, unknown>, fieldName: string) => {
      const value = document[fieldName];
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
  const results = index.search(query, {
    filter: (result) => {
      // Find the actual resource to check tocPath
      const res = filtered.find(r => r.id === result.id);
      return res !== undefined;
    },
  });

  return results
    .slice(0, limit)
    .map((r) => filtered.find((res) => res.id === r.id))
    .filter((r): r is Resource => r !== undefined);
}
