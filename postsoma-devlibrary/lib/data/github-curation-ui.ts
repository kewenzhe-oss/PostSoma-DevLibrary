import path from "node:path";
import { loadGitHubFavoriteCurationCollection } from "./github-curation";
import type { GitHubFavoriteCurationCollection } from "../types/github-curation";

let cachedCollection: GitHubFavoriteCurationCollection | null = null;

export async function getGitHubFavoriteCurationForUi(): Promise<GitHubFavoriteCurationCollection> {
  if (cachedCollection) return cachedCollection;
  cachedCollection = await loadGitHubFavoriteCurationCollection(
    path.join(process.cwd(), "data", "github-favorite-curation.json"),
  );
  return cachedCollection;
}

