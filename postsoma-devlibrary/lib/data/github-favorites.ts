import fs from "node:fs/promises";
import crypto from "node:crypto";
import type {
  GitHubFavorite,
  GitHubFavoritesCollection,
} from "../types/github-favorite";
import { GITHUB_FAVORITE_HEALTH_VALUES } from "../types/github-favorite";
import type { Resource } from "../types/resource";

const HEALTH_VALUES = new Set<string>(GITHUB_FAVORITE_HEALTH_VALUES);
const DISCOVERED_AT_SOURCES = new Set(["local-entry"]);
const LAST_REVIEWED_AT_SOURCES = new Set(["manual-review"]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableIsoDate(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === "string" &&
      value.length > 0 &&
      Number.isFinite(Date.parse(value)))
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

export interface GitHubRepositoryCoordinates {
  owner: string;
  repo: string;
  key: string;
  apiUrl: string;
  canonicalUrl: string;
}

/**
 * Extracts the repository coordinates from both root repository URLs and
 * legacy deep links such as /tree/main or /releases.
 */
export function parseGitHubRepositoryUrl(
  rawUrl: string,
): GitHubRepositoryCoordinates | null {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (url.protocol !== "https:" || hostname !== "github.com") return null;

    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts.length < 2) return null;

    const owner = pathParts[0];
    const repo = pathParts[1].replace(/\.git$/i, "");
    if (!owner || !repo) return null;

    return {
      owner,
      repo,
      key: `${owner}/${repo}`.toLowerCase(),
      apiUrl: `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      canonicalUrl: `https://github.com/${owner}/${repo}`,
    };
  } catch {
    return null;
  }
}

/**
 * Future local entries use the same legacy MD5/16-character ID shape, but hash
 * the normalized root repository URL so deep links cannot create new aliases.
 */
export function createGitHubFavoriteId(rawUrl: string): string {
  const repository = parseGitHubRepositoryUrl(rawUrl);
  if (!repository) {
    throw new Error("Cannot create a GitHub favorite ID from an invalid URL.");
  }
  return crypto
    .createHash("md5")
    .update(repository.canonicalUrl)
    .digest("hex")
    .slice(0, 16);
}

export function validateGitHubFavoritesCollection(
  value: unknown,
): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object") {
    return ["collection must be an object"];
  }

  const collection = value as Partial<GitHubFavoritesCollection>;
  if (collection.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1");
  }
  if (!isNonEmptyString(collection.migratedAt)) {
    errors.push("migratedAt is required");
  }
  if (!isNonEmptyString(collection.source)) {
    errors.push("source is required");
  }
  if (!Array.isArray(collection.records)) {
    errors.push("records must be an array");
    return errors;
  }

  const ids = new Set<string>();
  const urls = new Set<string>();

  collection.records.forEach((record, index) => {
    const prefix = `records[${index}]`;
    if (!record || typeof record !== "object") {
      errors.push(`${prefix} must be an object`);
      return;
    }

    if (!isNonEmptyString(record.id)) {
      errors.push(`${prefix}.id is required`);
    } else if (ids.has(record.id)) {
      errors.push(`${prefix}.id duplicates ${record.id}`);
    } else {
      ids.add(record.id);
    }

    if (
      !isNonEmptyString(record.githubUrl) ||
      !parseGitHubRepositoryUrl(record.githubUrl)
    ) {
      errors.push(`${prefix}.githubUrl must identify a GitHub repository`);
    } else if (urls.has(record.githubUrl)) {
      errors.push(`${prefix}.githubUrl duplicates ${record.githubUrl}`);
    } else {
      urls.add(record.githubUrl);
    }

    for (const key of [
      "title",
      "shortSummary",
      "personalNote",
      "whySaved",
    ] as const) {
      if (typeof record[key] !== "string") {
        errors.push(`${prefix}.${key} must be a string`);
      }
    }

    if (
      record.discoveredAtSource !== undefined &&
      !DISCOVERED_AT_SOURCES.has(record.discoveredAtSource)
    ) {
      errors.push(`${prefix}.discoveredAtSource is invalid`);
    }
    if (
      record.discoveredAtSource !== undefined &&
      record.discoveredAt === null
    ) {
      errors.push(
        `${prefix}.discoveredAt is required when discoveredAtSource is set`,
      );
    }
    if (
      record.lastReviewedAtSource !== undefined &&
      !LAST_REVIEWED_AT_SOURCES.has(record.lastReviewedAtSource)
    ) {
      errors.push(`${prefix}.lastReviewedAtSource is invalid`);
    }
    if (
      record.lastReviewedAtSource !== undefined &&
      record.lastReviewedAt === null
    ) {
      errors.push(
        `${prefix}.lastReviewedAt is required when lastReviewedAtSource is set`,
      );
    }

    if (!isStringArray(record.capabilities)) {
      errors.push(`${prefix}.capabilities must contain non-empty strings`);
    }
    if (!isStringArray(record.techStack)) {
      errors.push(`${prefix}.techStack must contain non-empty strings`);
    }
    if (!HEALTH_VALUES.has(record.health)) {
      errors.push(`${prefix}.health is invalid`);
    }

    for (const key of [
      "discoveredAt",
      "lastReviewedAt",
      "lastCheckedAt",
      "lastPushedAt",
    ] as const) {
      if (!isNullableIsoDate(record[key])) {
        errors.push(`${prefix}.${key} must be an ISO date or null`);
      }
    }

    if (
      record.githubArchived !== null &&
      typeof record.githubArchived !== "boolean"
    ) {
      errors.push(`${prefix}.githubArchived must be boolean or null`);
    }
    if (
      record.githubDisabled !== null &&
      typeof record.githubDisabled !== "boolean"
    ) {
      errors.push(`${prefix}.githubDisabled must be boolean or null`);
    }

    if (!record.editorial || typeof record.editorial !== "object") {
      errors.push(`${prefix}.editorial is required`);
    } else {
      if (!isNonEmptyString(record.editorial.topic)) {
        errors.push(`${prefix}.editorial.topic is required`);
      }
      if (!isNonEmptyString(record.editorial.resourceType)) {
        errors.push(`${prefix}.editorial.resourceType is required`);
      }
      if (!isNonEmptyString(record.editorial.quality)) {
        errors.push(`${prefix}.editorial.quality is required`);
      }
      if (typeof record.editorial.fullSummary !== "string") {
        errors.push(`${prefix}.editorial.fullSummary must be a string`);
      }
      if (
        record.editorial.detailSummary !== undefined &&
        typeof record.editorial.detailSummary !== "string"
      ) {
        errors.push(`${prefix}.editorial.detailSummary must be a string`);
      }
    }
  });

  return errors;
}

export async function loadGitHubFavoritesCollection(
  filePath: string,
): Promise<GitHubFavoritesCollection> {
  const raw = await fs.readFile(filePath, "utf8");
  const value = JSON.parse(raw) as unknown;
  const errors = validateGitHubFavoritesCollection(value);
  if (errors.length > 0) {
    throw new Error(
      `Invalid GitHub favorites collection:\n- ${errors.join("\n- ")}`,
    );
  }
  return value as GitHubFavoritesCollection;
}

export function githubFavoriteToResource(
  favorite: GitHubFavorite,
  fallbackUpdatedAt: string,
): Resource {
  const { editorial } = favorite;
  const tocPath = editorial.subcategory
    ? [editorial.topic, editorial.subcategory]
    : [editorial.topic];

  return {
    id: favorite.id,
    title: favorite.title,
    url: favorite.githubUrl,
    language: "en",
    collection: "github",
    category: editorial.topic,
    subcategory: editorial.subcategory,
    tocPath,
    type: editorial.resourceType,
    tags: favorite.capabilities,
    quality: editorial.quality,
    source: "GitHub",
    sourcePath: "data/github-favorites.json",
    createdAt: favorite.discoveredAt ?? undefined,
    updatedAt:
      favorite.lastReviewedAt ??
      favorite.discoveredAt ??
      fallbackUpdatedAt,
    summary: editorial.fullSummary,
    keyTakeaway: favorite.whySaved,
    priority: editorial.priority,
    action: editorial.action,
    cardSummary: favorite.shortSummary,
    detailSummary: editorial.detailSummary ?? editorial.fullSummary,
    bestFor: editorial.bestFor,
    accessNote: editorial.accessNote,
  };
}
