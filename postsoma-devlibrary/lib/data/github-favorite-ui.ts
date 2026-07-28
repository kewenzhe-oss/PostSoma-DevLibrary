import path from "node:path";
import { loadGitHubFavoritesCollection } from "./github-favorites";
import type { GitHubFavorite } from "../types/github-favorite";

let cachedFavorites: GitHubFavorite[] | null = null;
let cachedFavoritesById: Map<string, GitHubFavorite> | null = null;

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
