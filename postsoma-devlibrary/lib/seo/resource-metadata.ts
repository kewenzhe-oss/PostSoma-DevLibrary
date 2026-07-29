import type { GitHubFavorite } from "@/lib/types/github-favorite";
import type { Resource } from "@/lib/types/resource";

const METADATA_MAX_LENGTH = 160;

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string): string {
  if (value.length <= METADATA_MAX_LENGTH) return value;
  return `${value.slice(0, METADATA_MAX_LENGTH - 1).trimEnd()}…`;
}

function genericResourceDescription(resource: Resource): string {
  return resource.language === "zh"
    ? `收錄於 PostSoma DevLibrary 的免費 ${resource.category}${resource.subcategory ? " / " + resource.subcategory : ""} ${resource.type} 學習資源。`
    : `Free ${resource.type} resource for learning ${resource.category}${resource.subcategory ? " / " + resource.subcategory : ""}. Curated in PostSoma DevLibrary.`;
}

/**
 * Prefer human-maintained GitHub research context for search/social previews.
 * The wording only joins existing fields; it never invents a personal reason.
 */
export function getResourceMetadataDescription(
  resource: Resource,
  favorite?: GitHubFavorite,
): string {
  if (!favorite) return genericResourceDescription(resource);

  const summary = compact(favorite.shortSummary);
  const whySaved = compact(favorite.whySaved);
  if (summary && whySaved) {
    return truncate(`${summary} Why saved: ${whySaved}`);
  }
  if (summary) return truncate(summary);
  if (whySaved) return truncate(`Why saved: ${whySaved}`);

  return genericResourceDescription(resource);
}
