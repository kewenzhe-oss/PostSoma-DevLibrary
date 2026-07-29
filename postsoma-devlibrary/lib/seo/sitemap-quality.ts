import type { Resource } from "@/lib/types/resource";

export type SitemapExclusionReason =
  | "not-featured"
  | "missing-title"
  | "missing-detail-summary"
  | "missing-github-summary"
  | "missing-why-saved";

export interface SitemapIndexability {
  indexable: boolean;
  reason?: SitemapExclusionReason;
}

const MIN_DETAIL_SUMMARY_LENGTH = 80;
const MIN_GITHUB_SHORT_SUMMARY_LENGTH = 40;
const MIN_GITHUB_WHY_SAVED_LENGTH = 20;

function hasMinimumText(value: string | undefined, minimum: number): boolean {
  return Boolean(value && value.trim().length >= minimum);
}

/**
 * A resource detail page enters the sitemap only when it is explicitly
 * featured and has enough first-party context to stand on its own. GitHub
 * research pages additionally require the compact project summary and the
 * personal curation rationale that distinguish them from an upstream link.
 */
export function getSitemapIndexability(resource: Resource): SitemapIndexability {
  if (resource.quality !== "featured") {
    return { indexable: false, reason: "not-featured" };
  }
  if (!resource.title.trim()) {
    return { indexable: false, reason: "missing-title" };
  }
  if (!hasMinimumText(resource.detailSummary ?? resource.summary, MIN_DETAIL_SUMMARY_LENGTH)) {
    return { indexable: false, reason: "missing-detail-summary" };
  }
  if (resource.collection !== "github") {
    return { indexable: true };
  }
  if (!hasMinimumText(resource.cardSummary, MIN_GITHUB_SHORT_SUMMARY_LENGTH)) {
    return { indexable: false, reason: "missing-github-summary" };
  }
  if (!hasMinimumText(resource.keyTakeaway, MIN_GITHUB_WHY_SAVED_LENGTH)) {
    return { indexable: false, reason: "missing-why-saved" };
  }
  return { indexable: true };
}
