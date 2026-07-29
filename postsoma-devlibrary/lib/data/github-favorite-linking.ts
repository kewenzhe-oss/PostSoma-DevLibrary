import type { GitHubFavorite } from "@/lib/types/github-favorite";
import type { Resource } from "@/lib/types/resource";

/**
 * Repository identity is deliberately narrower than general URL de-duplication:
 * a GitHub README, tree, or query-string link all represent the same repository.
 * Keeping this browser-safe lets the static explorer resolve a personal favorite
 * to an upstream resource without creating a second detail page.
 */
export function githubRepositoryIdentity(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") {
      return null;
    }

    const [owner, rawRepository] = url.pathname.split("/").filter(Boolean);
    const repository = rawRepository?.replace(/\.git$/i, "");
    if (!owner || !repository) return null;

    return `${owner}/${repository}`.toLocaleLowerCase();
  } catch {
    return null;
  }
}

export interface GitHubFavoriteResourceLinks {
  /** GitHub-list resources, including a projected resource when an upstream item owns the URL. */
  resources: Resource[];
  /** A favorite keyed by the one canonical resource/detail-page ID that represents it. */
  favoritesByResourceId: Map<string, GitHubFavorite>;
  /** Canonical favorite IDs that have no generated resource backing them. */
  unlinkedFavoriteIds: string[];
}

/**
 * Creates one display entry per GitHub favorite while preserving one canonical
 * /resource/:id page per external URL. Direct GitHub resources retain their
 * existing ID. If an upstream Book/Course owns the same GitHub repository URL,
 * the GitHub explorer projects that upstream resource with the favorite's
 * presentation data and links back to the upstream detail page.
 */
export function linkGitHubFavoritesToResources(
  resources: Resource[],
  favorites: GitHubFavorite[],
): GitHubFavoriteResourceLinks {
  const resourcesById = new Map(resources.map((resource) => [resource.id, resource]));
  const resourcesByRepository = new Map<string, Resource>();

  for (const resource of resources) {
    const identity = githubRepositoryIdentity(resource.url);
    if (identity && !resourcesByRepository.has(identity)) {
      resourcesByRepository.set(identity, resource);
    }
  }

  const linkedResources: Resource[] = [];
  const favoritesByResourceId = new Map<string, GitHubFavorite>();
  const unlinkedFavoriteIds: string[] = [];

  for (const favorite of favorites) {
    const backingResource =
      resourcesById.get(favorite.id) ??
      (() => {
        const identity = githubRepositoryIdentity(favorite.githubUrl);
        return identity ? resourcesByRepository.get(identity) : undefined;
      })();

    if (!backingResource || favoritesByResourceId.has(backingResource.id)) {
      unlinkedFavoriteIds.push(favorite.id);
      continue;
    }

    favoritesByResourceId.set(backingResource.id, favorite);
    linkedResources.push(
      backingResource.collection === "github"
        ? backingResource
        : {
            ...backingResource,
            title: favorite.title,
            collection: "github",
            source: "GitHub",
            sourcePath: "data/github-favorites.json",
            tags: favorite.capabilities,
            cardSummary: favorite.shortSummary,
            keyTakeaway: favorite.whySaved,
          },
    );
  }

  return {
    resources: linkedResources,
    favoritesByResourceId,
    unlinkedFavoriteIds,
  };
}
