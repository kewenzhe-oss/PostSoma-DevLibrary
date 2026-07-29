import path from "node:path";
import { loadGitHubFavoritesCollection } from "./github-favorites";
import type { GitHubFavorite } from "../types/github-favorite";
import type { Resource } from "../types/resource";
import { githubRepositoryIdentity } from "./github-favorite-linking";

let cachedFavorites: GitHubFavorite[] | null = null;
let cachedFavoritesById: Map<string, GitHubFavorite> | null = null;
let cachedFavoritesByRepository: Map<string, GitHubFavorite> | null = null;

/**
 * Read-only UI access to the canonical GitHub collection.
 *
 * Kept separate from the direction-1 schema and migration code so presentation
 * changes do not alter the persistence contract.
 */
export async function getGitHubFavoritesForUi(): Promise<GitHubFavorite[]> {
  if (cachedFavorites) return cachedFavorites;

  const collection = await loadGitHubFavoritesCollection(
    path.join(process.cwd(), "data", "github-favorites.json"),
  );
  cachedFavorites = collection.records;
  return cachedFavorites;
}

export async function getGitHubFavoriteForUi(
  id: string,
): Promise<GitHubFavorite | undefined> {
  if (!cachedFavoritesById) {
    const favorites = await getGitHubFavoritesForUi();
    cachedFavoritesById = new Map(
      favorites.map((favorite) => [favorite.id, favorite]),
    );
  }
  return cachedFavoritesById.get(id);
}

/**
 * Resolves GitHub research context for a normal resource ID and for the rare
 * upstream/GitHub URL collision that intentionally shares one detail page.
 */
export async function getGitHubFavoriteForResourceUi(
  resource: Pick<Resource, "id" | "url">,
): Promise<GitHubFavorite | undefined> {
  const direct = await getGitHubFavoriteForUi(resource.id);
  if (direct) return direct;

  if (!cachedFavoritesByRepository) {
    const favorites = await getGitHubFavoritesForUi();
    cachedFavoritesByRepository = new Map(
      favorites.flatMap((favorite) => {
        const identity = githubRepositoryIdentity(favorite.githubUrl);
        return identity ? [[identity, favorite] as const] : [];
      }),
    );
  }

  const identity = githubRepositoryIdentity(resource.url);
  return identity ? cachedFavoritesByRepository.get(identity) : undefined;
}
