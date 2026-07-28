import type {
  ResourceQuality,
  ResourceType,
} from "./resource";

export const GITHUB_FAVORITE_HEALTH_VALUES = [
  "active",
  "quiet",
  "archived",
  "unavailable",
] as const;

export type GitHubFavoriteHealth =
  (typeof GITHUB_FAVORITE_HEALTH_VALUES)[number];

export type GitHubFavoriteDiscoveredAtSource = "local-entry";
export type GitHubFavoriteLastReviewedAtSource = "manual-review";

export interface GitHubFavoriteEditorial {
  topic: string;
  subcategory?: string;
  resourceType: ResourceType;
  quality: ResourceQuality;
  fullSummary: string;
  detailSummary?: string;
  priority?: string;
  action?: string;
  primaryAudience?: string;
  bestFor?: string[];
  accessNote?: string;
}

/**
 * Canonical record for a manually saved GitHub repository.
 *
 * This model intentionally lives outside the general Resource model. The
 * pipeline adapts it into Resource only for the existing /resources UI.
 */
export interface GitHubFavorite {
  id: string;
  githubUrl: string;
  title: string;
  shortSummary: string;
  capabilities: string[];
  techStack: string[];
  personalNote: string;
  whySaved: string;
  discoveredAt: string | null;
  /**
   * Present only when discoveredAt was created by the local-first add flow.
   * Historical records intentionally omit this field because their timestamps
   * came from legacy AI processing rather than a real save event.
   */
  discoveredAtSource?: GitHubFavoriteDiscoveredAtSource;
  lastReviewedAt: string | null;
  /**
   * Present only after the user explicitly marks a real review.
   */
  lastReviewedAtSource?: GitHubFavoriteLastReviewedAtSource;
  health: GitHubFavoriteHealth;
  lastCheckedAt: string | null;
  lastPushedAt: string | null;
  githubArchived: boolean | null;
  githubDisabled: boolean | null;
  editorial: GitHubFavoriteEditorial;
}

export interface GitHubFavoritesCollection {
  schemaVersion: 1;
  migratedAt: string;
  source: string;
  records: GitHubFavorite[];
}
