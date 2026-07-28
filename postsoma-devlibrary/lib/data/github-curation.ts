import fs from "node:fs/promises";
import type { GitHubFavorite } from "../types/github-favorite";
import type {
  GitHubFavoriteCuration,
  GitHubFavoriteCurationCollection,
} from "../types/github-curation";
import { GITHUB_FAVORITE_BELONGS_TO_VALUES } from "../types/github-curation";
import type { Resource } from "../types/resource";

const BELONGS_TO_VALUES = new Set<string>(
  GITHUB_FAVORITE_BELONGS_TO_VALUES,
);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => isNonEmptyString(item))
  );
}

export function validateGitHubFavoriteCurationCollection(
  value: unknown,
): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object") {
    return ["collection must be an object"];
  }

  const collection =
    value as Partial<GitHubFavoriteCurationCollection>;
  if (collection.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1");
  }
  if (
    !isNonEmptyString(collection.updatedAt) ||
    !Number.isFinite(Date.parse(collection.updatedAt))
  ) {
    errors.push("updatedAt must be an ISO date");
  }
  if (collection.source !== "manual-curation") {
    errors.push("source must be manual-curation");
  }
  if (!Array.isArray(collection.records)) {
    errors.push("records must be an array");
    return errors;
  }

  const favoriteIds = new Set<string>();
  collection.records.forEach((record, index) => {
    const prefix = `records[${index}]`;
    if (!record || typeof record !== "object") {
      errors.push(`${prefix} must be an object`);
      return;
    }

    if (!isNonEmptyString(record.favoriteId)) {
      errors.push(`${prefix}.favoriteId is required`);
    } else if (favoriteIds.has(record.favoriteId)) {
      errors.push(`${prefix}.favoriteId duplicates ${record.favoriteId}`);
    } else {
      favoriteIds.add(record.favoriteId);
    }

    if (!BELONGS_TO_VALUES.has(record.belongsTo)) {
      errors.push(`${prefix}.belongsTo is invalid`);
    }
    if (!isStringArray(record.relatedLearningResourceIds)) {
      errors.push(
        `${prefix}.relatedLearningResourceIds must contain non-empty strings`,
      );
    } else if (
      new Set(record.relatedLearningResourceIds).size !==
      record.relatedLearningResourceIds.length
    ) {
      errors.push(
        `${prefix}.relatedLearningResourceIds contains duplicates`,
      );
    }

    if (
      record.relationNote !== undefined &&
      !isNonEmptyString(record.relationNote)
    ) {
      errors.push(`${prefix}.relationNote must be a non-empty string`);
    }
    if (
      record.boundaryReason !== undefined &&
      !isNonEmptyString(record.boundaryReason)
    ) {
      errors.push(`${prefix}.boundaryReason must be a non-empty string`);
    }
    if (
      Array.isArray(record.relatedLearningResourceIds) &&
      record.relatedLearningResourceIds.length > 0 &&
      !isNonEmptyString(record.relationNote)
    ) {
      errors.push(
        `${prefix}.relationNote is required when learning resources are linked`,
      );
    }
    if (
      record.belongsTo === "agent-skills-hub" &&
      Array.isArray(record.relatedLearningResourceIds) &&
      record.relatedLearningResourceIds.length > 0
    ) {
      errors.push(
        `${prefix} cannot link DevLibrary learning resources when routed to Agent Skills Hub`,
      );
    }
    if (
      record.belongsTo === "agent-skills-hub" &&
      !isNonEmptyString(record.boundaryReason)
    ) {
      errors.push(
        `${prefix}.boundaryReason is required for Agent Skills Hub routing`,
      );
    }
  });

  return errors;
}

export async function loadGitHubFavoriteCurationCollection(
  filePath: string,
): Promise<GitHubFavoriteCurationCollection> {
  const raw = await fs.readFile(filePath, "utf8");
  const value = JSON.parse(raw) as unknown;
  const errors = validateGitHubFavoriteCurationCollection(value);
  if (errors.length > 0) {
    throw new Error(
      `Invalid GitHub favorite curation collection:\n- ${errors.join("\n- ")}`,
    );
  }
  return value as GitHubFavoriteCurationCollection;
}

export function findAgentSkillsHubSignal(
  favorite: GitHubFavorite,
): string | null {
  let pathname = "";
  try {
    pathname = decodeURIComponent(new URL(favorite.githubUrl).pathname);
  } catch {
    pathname = favorite.githubUrl;
  }

  const haystack = `${favorite.title} ${pathname}`.toLowerCase();
  if (/(^|[-_/])mcp($|[-_/])/.test(haystack)) {
    return "MCP tool";
  }
  if (
    /skill\.md/.test(haystack) ||
    /(^|[-_/])(?:agent-)?skills?($|[-_/])/.test(haystack)
  ) {
    return "AI skill";
  }
  if (
    /(^|[-_/])agents?($|[-_/])/.test(haystack) ||
    /agent-pack|agency-agents|social-media-agent/.test(haystack)
  ) {
    return "agent tool";
  }
  return null;
}

export interface GitHubCurationAudit {
  errors: string[];
  routedToAgentSkillsHub: Array<{
    favorite: GitHubFavorite;
    curation: GitHubFavoriteCuration;
  }>;
  needsBoundaryReview: Array<{
    favorite: GitHubFavorite;
    signal: string;
  }>;
  linkedFavoriteCount: number;
  linkedLearningResourceCount: number;
}

export function auditGitHubFavoriteCuration(options: {
  collection: GitHubFavoriteCurationCollection;
  favorites: GitHubFavorite[];
  resources: Resource[];
  allowCanonicalFavoritesMissingFromResources?: boolean;
}): GitHubCurationAudit {
  const errors: string[] = [];
  const favoritesById = new Map(
    options.favorites.map((favorite) => [favorite.id, favorite] as const),
  );
  const resourcesById = new Map(
    options.resources.map((resource) => [resource.id, resource] as const),
  );
  const curationByFavoriteId = new Map(
    options.collection.records.map(
      (record) => [record.favoriteId, record] as const,
    ),
  );
  const linkedLearningResourceIds = new Set<string>();
  let linkedFavoriteCount = 0;

  for (const record of options.collection.records) {
    const favorite = favoritesById.get(record.favoriteId);
    if (!favorite) {
      errors.push(
        `Curation references missing GitHub favorite ${record.favoriteId}`,
      );
      continue;
    }
    const favoriteResource = resourcesById.get(record.favoriteId);
    if (
      !favoriteResource &&
      !options.allowCanonicalFavoritesMissingFromResources
    ) {
      errors.push(
        `Curation favorite ${favorite.title} is missing from compiled resources`,
      );
    } else if (
      favoriteResource &&
      favoriteResource.collection !== "github"
    ) {
      errors.push(
        `Curation favorite ${favorite.title} does not resolve to the GitHub collection`,
      );
    }

    if (record.relatedLearningResourceIds.length > 0) {
      linkedFavoriteCount += 1;
    }
    for (const resourceId of record.relatedLearningResourceIds) {
      const resource = resourcesById.get(resourceId);
      if (!resource) {
        errors.push(
          `${favorite.title} references missing learning resource ${resourceId}`,
        );
        continue;
      }
      if (
        resource.collection !== "books" &&
        resource.collection !== "courses"
      ) {
        errors.push(
          `${favorite.title} links ${resource.title}, which is not a book or course`,
        );
        continue;
      }
      linkedLearningResourceIds.add(resourceId);
    }
  }

  const routedToAgentSkillsHub = options.collection.records
    .filter((record) => record.belongsTo === "agent-skills-hub")
    .flatMap((curation) => {
      const favorite = favoritesById.get(curation.favoriteId);
      return favorite ? [{ favorite, curation }] : [];
    });

  const needsBoundaryReview = options.favorites.flatMap((favorite) => {
    const signal = findAgentSkillsHubSignal(favorite);
    if (!signal) return [];
    const curation = curationByFavoriteId.get(favorite.id);
    if (
      curation?.belongsTo === "agent-skills-hub" ||
      (curation?.belongsTo === "devlibrary" &&
        isNonEmptyString(curation.boundaryReason))
    ) {
      return [];
    }
    return [{ favorite, signal }];
  });

  return {
    errors,
    routedToAgentSkillsHub,
    needsBoundaryReview,
    linkedFavoriteCount,
    linkedLearningResourceCount: linkedLearningResourceIds.size,
  };
}
