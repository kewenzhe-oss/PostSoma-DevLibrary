export type ResourceLanguage = "zh" | "en";

export type ResourceType =
  | "book"
  | "course"
  | "tutorial"
  | "documentation"
  | "interactive"
  | "article"
  | "unknown";

export type ResourceCollection =
  | "books"
  | "cheat_sheets"
  | "courses"
  | "interactive"
  | "problem_sets"
  | "podcasts"
  | "unknown";

export type ResourceQuality = "featured" | "standard" | "unchecked";

export interface ResourceTaxonomy {
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
  source: "free-programming-books";
  sourcePath: string;
  originalLine?: string;
  createdAt?: string;
  updatedAt: string;
}

export interface ResourceManifest {
  generatedAt: string;
  sourceRepo: string;
  sourceCommit?: string;
  total: number;
  languages: Record<ResourceLanguage, number>;
  categories: Record<string, number>;
  invalidCount?: number;
}
