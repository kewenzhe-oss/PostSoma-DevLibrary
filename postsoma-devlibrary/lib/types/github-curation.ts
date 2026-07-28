export const GITHUB_FAVORITE_BELONGS_TO_VALUES = [
  "devlibrary",
  "agent-skills-hub",
] as const;

export type GitHubFavoriteBelongsTo =
  (typeof GITHUB_FAVORITE_BELONGS_TO_VALUES)[number];

/**
 * Manual editorial overlay for relationships and product-boundary decisions.
 *
 * Kept outside GithubFavorite so migrations and health checks can continue to
 * update the canonical repository record without overwriting human curation.
 */
export interface GitHubFavoriteCuration {
  favoriteId: string;
  belongsTo: GitHubFavoriteBelongsTo;
  relatedLearningResourceIds: string[];
  relationNote?: string;
  boundaryReason?: string;
}

export interface GitHubFavoriteCurationCollection {
  schemaVersion: 1;
  updatedAt: string;
  source: "manual-curation";
  records: GitHubFavoriteCuration[];
}
