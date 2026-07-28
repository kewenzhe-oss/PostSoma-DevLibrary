import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  auditGitHubFavoriteCuration,
  loadGitHubFavoriteCurationCollection,
} from "../../lib/data/github-curation";
import { loadGitHubFavoritesCollection } from "../../lib/data/github-favorites";
import type { Resource } from "../../lib/types/resource";

function getArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function loadResources(filePath: string): Promise<Resource[]> {
  const raw = await fs.readFile(filePath, "utf8");
  const value = JSON.parse(raw) as unknown;
  if (!Array.isArray(value)) {
    throw new Error("resources file must contain an array");
  }
  return value as Resource[];
}

export async function validateGitHubCuration(options: {
  favoritesPath: string;
  curationPath: string;
  resourcesPath: string;
  allowCanonicalFavoritesMissingFromResources?: boolean;
}) {
  const [favorites, curation, resources] = await Promise.all([
    loadGitHubFavoritesCollection(options.favoritesPath),
    loadGitHubFavoriteCurationCollection(options.curationPath),
    loadResources(options.resourcesPath),
  ]);

  return auditGitHubFavoriteCuration({
    collection: curation,
    favorites: favorites.records,
    resources,
    allowCanonicalFavoritesMissingFromResources:
      options.allowCanonicalFavoritesMissingFromResources,
  });
}

async function main() {
  const favoritesPath = path.resolve(
    getArgument("--favorites") ?? "data/github-favorites.json",
  );
  const curationPath = path.resolve(
    getArgument("--curation") ?? "data/github-favorite-curation.json",
  );
  const resourcesPath = path.resolve(
    getArgument("--resources") ?? "public/data/resources.json",
  );

  const audit = await validateGitHubCuration({
    favoritesPath,
    curationPath,
    resourcesPath,
    allowCanonicalFavoritesMissingFromResources: process.argv.includes(
      "--allow-canonical-favorites-missing-from-resources",
    ),
  });

  if (audit.errors.length > 0) {
    throw new Error(
      `GitHub curation reference validation failed:\n- ${audit.errors.join("\n- ")}`,
    );
  }

  console.log(
    `[github-curation] ${audit.linkedFavoriteCount} GitHub projects link to ` +
      `${audit.linkedLearningResourceCount} books/courses.`,
  );

  if (audit.routedToAgentSkillsHub.length > 0) {
    console.warn(
      `[github-curation] Boundary notice: ` +
        `${audit.routedToAgentSkillsHub.length} item(s) belong to Agent Skills Hub.`,
    );
    for (const { favorite, curation } of audit.routedToAgentSkillsHub) {
      console.warn(
        `  → ${favorite.title}: ${curation.boundaryReason} ` +
          `Submit to https://205055.xyz instead of DevLibrary.`,
      );
    }
  }

  if (audit.needsBoundaryReview.length > 0) {
    console.warn(
      `[github-curation] Manual boundary review required for ` +
        `${audit.needsBoundaryReview.length} item(s):`,
    );
    for (const { favorite, signal } of audit.needsBoundaryReview) {
      console.warn(
        `  ? ${favorite.title} (${signal}) — set belongsTo to ` +
          `"devlibrary" with a boundaryReason or "agent-skills-hub".`,
      );
    }
  }
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
