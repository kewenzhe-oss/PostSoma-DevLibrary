export type ResourceLanguage = "zh" | "en";

export type ResourceType =
  | "book"
  | "course"
  | "tutorial"
  | "documentation"
  | "interactive"
  | "article"
  | "app"
  | "library"
  | "framework"
  | "cli"
  | "collection"
  | "extension"
  | "unknown";

export type ResourceCollection =
  | "books"
  | "cheat_sheets"
  | "courses"
  | "interactive"
  | "problem_sets"
  | "podcasts"
  | "github"
  | "unknown";

export type ResourceQuality = "featured" | "standard" | "unchecked";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type CanonicalTopicId =
  | "cs-foundations"
  | "programming-languages"
  | "web-development"
  | "mobile-development"
  | "embedded-iot-robotics"
  | "ai-data-science"
  | "databases-data-engineering"
  | "cloud-devops-sre"
  | "systems-networking"
  | "cybersecurity-privacy"
  | "software-engineering"
  | "developer-tools-automation"
  | "graphics-design-games"
  | "blockchain-web3"
  | "career-professional"
  | "general-meta";

interface ResourceFacetSubcategory {
  id: string;
  labelEn: string;
  labelZh: string | null;
}

/**
 * Curated browsing metadata is intentionally kept separate from the canonical
 * upstream fields. It can improve discovery without changing a Resource ID or
 * rewriting its source lineage.
 */
export interface ResourceFacetMetadata {
  canonicalTopic: CanonicalTopicId;
  subcategory: ResourceFacetSubcategory | null;
  language: ResourceLanguage;
  resourceType: ResourceType;
  reviewStatus: "pending" | "approved";
}

interface ResourceTaxonomy {
  root: string;
  section?: string;
  subsection?: string;
}

export interface ResourceTocNode {
  id: string;
  label: string;
  language: "zh" | "en" | "all";
  level: number;
  path: string[];
  resourceCount: number;
  children: ResourceTocNode[];
}

export interface Resource {
  id: string;
  title: string;
  url: string;
  language: ResourceLanguage;
  collection: ResourceCollection;
  category: string;
  subcategory?: string;
  taxonomy?: ResourceTaxonomy;
  tocPath?: string[];
  type: ResourceType;
  tags: string[];
  quality: ResourceQuality;
  source: "free-programming-books" | "GitHub";
  sourcePath: string;
  originalLine?: string;
  createdAt?: string;
  updatedAt: string;
  difficulty?: Difficulty;
  editorNote?: string;
  summary?: string;
  keyTakeaway?: string;
  priority?: string;
  action?: string;
  cardSummary?: string;
  detailSummary?: string;
  bestFor?: string[];
  accessNote?: string;
  facet?: ResourceFacetMetadata;
}


