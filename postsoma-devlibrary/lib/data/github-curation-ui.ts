import path from "node:path";
import { loadGitHubFavoriteCurationCollection } from "./github-curation";
import type {
  GitHubFavoriteCuration,
  GitHubFavoriteCurationCollection,
} from "../types/github-curation";

let cachedCollection: GitHubFavoriteCurationCollection | null = null;
let cachedByFavoriteId: Map<string, GitHubFavoriteCuration> | null = null;

export async function getGitHubFavoriteCurationForUi(): Promise<GitHubFavoriteCurationCollection> {
  if (cachedCollection) return cachedCollection;
  cachedCollection = await loadGitHubFavoriteCurationCollection(
    path.join(process.cwd(), "data", "github-favorite-curation.json"),
  );
  return cachedCollection;
}

export async function getGitHubFavoriteCurationByIdForUi(
  favoriteId: string,
): Promise<GitHubFavoriteCuration | undefined> {
  if (!cachedByFavoriteId) {
    const collection = await getGitHubFavoriteCurationForUi();
    cachedByFavoriteId = new Map(
      collection.records.map((record) => [record.favoriteId, record]),
    );
  }
  return cachedByFavoriteId.get(favoriteId);
}
