export type ResourceLanguage = "zh" | "en";

export type ResourceType =
  | "book"
  | "course"
  | "tutorial"
  | "documentation"
  | "interactive"
  | "article"
  | "unknown";

export type ResourceQuality = "featured" | "standard" | "unchecked";

export interface Resource {
  id: string;
  title: string;
  url: string;
  language: ResourceLanguage;
  category: string;
  subcategory?: string;
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
