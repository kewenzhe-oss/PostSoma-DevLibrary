import fs from "node:fs/promises";
import path from "node:path";
import {
  createGitHubFavoriteId,
  loadGitHubFavoritesCollection,
  parseGitHubRepositoryUrl,
  validateGitHubFavoritesCollection,
} from "../../lib/data/github-favorites";
import {
  findAgentSkillsHubSignal,
  loadGitHubFavoriteCurationCollection,
  validateGitHubFavoriteCurationCollection,
} from "../../lib/data/github-curation";
import type {
  GitHubFavorite,
  GitHubFavoritesCollection,
} from "../../lib/types/github-favorite";
import type {
  GitHubFavoriteBelongsTo,
  GitHubFavoriteCuration,
  GitHubFavoriteCurationCollection,
} from "../../lib/types/github-curation";
import type { Resource, ResourceType } from "../../lib/types/resource";

const RESOURCE_TYPES = new Set<ResourceType>([
  "book",
  "course",
  "tutorial",
  "documentation",
  "interactive",
  "article",
  "app",
  "library",
  "framework",
  "cli",
  "collection",
  "extension",
  "unknown",
]);

export interface GitHubFavoriteWorkspace {
  collection: GitHubFavoritesCollection;
  curation: GitHubFavoriteCurationCollection;
  resources: Resource[];
}

export interface AddGitHubFavoriteInput {
  githubUrl: string;
  whySaved: string;
  title?: string;
  shortSummary?: string;
  capabilities?: string[];
  techStack?: string[];
  personalNote?: string;
  topic?: string;
  resourceType?: ResourceType;
  reviewed?: boolean;
  belongsTo?: GitHubFavoriteBelongsTo;
  relatedLearningResourceIds?: string[];
  relationNote?: string;
  boundaryReason?: string;
}

export interface ReviewGitHubFavoriteInput {
  id?: string;
  githubUrl?: string;
  personalNote?: string;
  whySaved?: string;
}

export interface GitHubFavoriteFieldChange {
  field: string;
  previous: unknown;
  next: unknown;
}

export interface GitHubFavoriteMutationPlan {
  operation: "add" | "review";
  target: {
    id: string;
    title: string;
    githubUrl: string;
  };
  changes: GitHubFavoriteFieldChange[];
  warnings: string[];
  nextSteps: string[];
  nextCollection: GitHubFavoritesCollection;
  nextCuration: GitHubFavoriteCurationCollection;
  curationChanged: boolean;
}

export interface GitHubFavoriteWorkspacePaths {
  inputPath: string;
  publicOutputPath: string;
  curationPath: string;
  resourcesPath: string;
}

export type GitHubFavoriteMutationResult =
  | { status: "dry-run" }
  | { status: "cancelled" }
  | { status: "written"; filesWritten: string[] };

function normalizeText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value.trim();
}

function normalizeList(values: string[] | undefined): string[] {
  const seen = new Set<string>();
  return (values ?? [])
    .map((value) => value.trim())
    .filter((value) => {
      const key = value.toLocaleLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function requireNonEmpty(value: string | undefined, label: string): string {
  const normalized = normalizeText(value);
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function normalizeNow(now: string): string {
  const timestamp = Date.parse(now);
  if (!Number.isFinite(timestamp)) {
    throw new Error("The local operation timestamp must be a valid ISO date.");
  }
  return new Date(timestamp).toISOString();
}

function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function loadResources(filePath: string): Promise<Resource[]> {
  const raw = await fs.readFile(filePath, "utf8");
  const value = JSON.parse(raw) as unknown;
  if (!Array.isArray(value)) {
    throw new Error("The compiled resources file must contain an array.");
  }
  return value as Resource[];
}

export async function loadGitHubFavoriteWorkspace(
  paths: GitHubFavoriteWorkspacePaths,
): Promise<GitHubFavoriteWorkspace> {
  const [canonicalRaw, publicRaw, collection, curation, resources] =
    await Promise.all([
      fs.readFile(paths.inputPath, "utf8"),
      fs.readFile(paths.publicOutputPath, "utf8"),
      loadGitHubFavoritesCollection(paths.inputPath),
      loadGitHubFavoriteCurationCollection(paths.curationPath),
      loadResources(paths.resourcesPath),
    ]);

  if (canonicalRaw !== publicRaw) {
    throw new Error(
      "Canonical and public GitHub favorite copies differ. " +
        "Resolve the mismatch before any local mutation.",
    );
  }

  return { collection, curation, resources };
}

function validateCurationInputs(options: {
  input: AddGitHubFavoriteInput;
  favorite: GitHubFavorite;
  resources: Resource[];
  now: string;
  curation: GitHubFavoriteCurationCollection;
}): {
  nextCuration: GitHubFavoriteCurationCollection;
  curationChanged: boolean;
  warnings: string[];
} {
  const relatedLearningResourceIds = normalizeList(
    options.input.relatedLearningResourceIds,
  );
  const relationNote = normalizeText(options.input.relationNote);
  const boundaryReason = normalizeText(options.input.boundaryReason);
  const hasCurationInput =
    options.input.belongsTo !== undefined ||
    relatedLearningResourceIds.length > 0 ||
    relationNote !== undefined ||
    boundaryReason !== undefined;
  const signal = findAgentSkillsHubSignal(options.favorite);
  const warnings: string[] = [];

  if (signal) {
    warnings.push(
      `Boundary review suggested: repository resembles an ${signal}. ` +
        "Consider Agent Skills Hub (https://205055.xyz).",
    );
  }

  if (!hasCurationInput) {
    return {
      nextCuration: options.curation,
      curationChanged: false,
      warnings,
    };
  }

  if (!options.input.belongsTo) {
    throw new Error(
      "--belongs-to is required when any manual curation field is provided.",
    );
  }
  if (relationNote !== undefined && relatedLearningResourceIds.length === 0) {
    throw new Error(
      "--relation-note requires at least one --related-learning-id.",
    );
  }
  if (relatedLearningResourceIds.length > 0 && !relationNote) {
    throw new Error(
      "--relation-note is required when learning resources are linked.",
    );
  }
  if (
    options.input.belongsTo === "agent-skills-hub" &&
    relatedLearningResourceIds.length > 0
  ) {
    throw new Error(
      "Agent Skills Hub records cannot link DevLibrary books or courses.",
    );
  }
  if (
    options.input.belongsTo === "agent-skills-hub" &&
    !boundaryReason
  ) {
    throw new Error(
      "--boundary-reason is required for Agent Skills Hub routing.",
    );
  }
  if (
    signal &&
    options.input.belongsTo === "devlibrary" &&
    !boundaryReason
  ) {
    throw new Error(
      "--boundary-reason is required to keep a skill/MCP/agent-shaped " +
        "repository in DevLibrary.",
    );
  }

  const resourcesById = new Map(
    options.resources.map((resource) => [resource.id, resource] as const),
  );
  for (const resourceId of relatedLearningResourceIds) {
    const resource = resourcesById.get(resourceId);
    if (!resource) {
      throw new Error(
        `Related learning resource ${resourceId} does not exist.`,
      );
    }
    if (
      resource.collection !== "books" &&
      resource.collection !== "courses"
    ) {
      throw new Error(
        `Related resource ${resourceId} is not a book or course.`,
      );
    }
  }

  if (
    options.curation.records.some(
      (record) => record.favoriteId === options.favorite.id,
    )
  ) {
    throw new Error(
      `Curation already exists for favorite ${options.favorite.id}.`,
    );
  }

  const curationRecord: GitHubFavoriteCuration = {
    favoriteId: options.favorite.id,
    belongsTo: options.input.belongsTo,
    relatedLearningResourceIds,
    ...(relationNote ? { relationNote } : {}),
    ...(boundaryReason ? { boundaryReason } : {}),
  };
  const nextCuration: GitHubFavoriteCurationCollection = {
    ...options.curation,
    updatedAt: options.now,
    records: [...options.curation.records, curationRecord],
  };
  const curationErrors =
    validateGitHubFavoriteCurationCollection(nextCuration);
  if (curationErrors.length > 0) {
    throw new Error(
      `Refusing invalid curation update:\n- ${curationErrors.join("\n- ")}`,
    );
  }

  return {
    nextCuration,
    curationChanged: true,
    warnings,
  };
}

export function planAddGitHubFavorite(options: {
  workspace: GitHubFavoriteWorkspace;
  input: AddGitHubFavoriteInput;
  now: string;
}): GitHubFavoriteMutationPlan {
  const now = normalizeNow(options.now);
  const repository = parseGitHubRepositoryUrl(options.input.githubUrl);
  if (!repository) {
    throw new Error(
      "GitHub URL must be an HTTPS repository URL on github.com.",
    );
  }
  const duplicateRecords = options.workspace.collection.records.filter(
    (favorite) =>
      parseGitHubRepositoryUrl(favorite.githubUrl)?.key === repository.key,
  );
  if (duplicateRecords.length > 0) {
    throw new Error(
      `Repository ${repository.canonicalUrl} is already saved as ` +
        duplicateRecords.map((favorite) => favorite.id).join(", ") + ".",
    );
  }

  const id = createGitHubFavoriteId(repository.canonicalUrl);
  if (
    options.workspace.collection.records.some(
      (favorite) => favorite.id === id,
    )
  ) {
    throw new Error(`Generated favorite ID ${id} already exists.`);
  }

  const whySaved = requireNonEmpty(options.input.whySaved, "Why Saved");
  const title =
    normalizeText(options.input.title) ||
    `${repository.owner} / ${repository.repo}`;
  const shortSummary = normalizeText(options.input.shortSummary) ?? "";
  const personalNote = normalizeText(options.input.personalNote) ?? "";
  const topic = normalizeText(options.input.topic) || "Other Tools";
  const resourceType = options.input.resourceType ?? "unknown";
  if (!RESOURCE_TYPES.has(resourceType)) {
    throw new Error(`Unsupported resource type: ${resourceType}.`);
  }

  const favorite: GitHubFavorite = {
    id,
    githubUrl: repository.canonicalUrl,
    title,
    shortSummary,
    capabilities: normalizeList(options.input.capabilities),
    techStack: normalizeList(options.input.techStack),
    personalNote,
    whySaved,
    discoveredAt: now,
    discoveredAtSource: "local-entry",
    lastReviewedAt: options.input.reviewed ? now : null,
    ...(options.input.reviewed
      ? { lastReviewedAtSource: "manual-review" as const }
      : {}),
    // The v1 schema has no unknown enum member. lastCheckedAt=null is the
    // canonical unverified signal and the UI renders it as "Unchecked".
    health: "active",
    lastCheckedAt: null,
    lastPushedAt: null,
    githubArchived: null,
    githubDisabled: null,
    editorial: {
      topic,
      resourceType,
      quality: "unchecked",
      fullSummary: shortSummary,
    },
  };

  const nextCollection: GitHubFavoritesCollection = {
    ...options.workspace.collection,
    records: [...options.workspace.collection.records, favorite],
  };
  const collectionErrors =
    validateGitHubFavoritesCollection(nextCollection);
  if (collectionErrors.length > 0) {
    throw new Error(
      `Refusing invalid favorite addition:\n- ${collectionErrors.join("\n- ")}`,
    );
  }

  const curation = validateCurationInputs({
    input: options.input,
    favorite,
    resources: options.workspace.resources,
    now,
    curation: options.workspace.curation,
  });

  return {
    operation: "add",
    target: { id, title, githubUrl: repository.canonicalUrl },
    changes: [
      {
        field: "collection.records.length",
        previous: options.workspace.collection.records.length,
        next: nextCollection.records.length,
      },
      ...(
        [
          "githubUrl",
          "title",
          "shortSummary",
          "capabilities",
          "techStack",
          "personalNote",
          "whySaved",
          "discoveredAt",
          "discoveredAtSource",
          "lastReviewedAt",
          "lastReviewedAtSource",
          "health",
          "lastCheckedAt",
          "lastPushedAt",
          "githubArchived",
          "githubDisabled",
          "editorial",
        ] as const
      ).map((field) => ({
        field,
        previous: null,
        next: favorite[field] ?? null,
      })),
      ...(curation.curationChanged
        ? [
            {
              field: "manualCuration",
              previous: null,
              next:
                curation.nextCuration.records[
                  curation.nextCuration.records.length - 1
                ],
            },
          ]
        : []),
    ],
    warnings: [
      "Health is unverified until the existing GitHub health checker runs; " +
        "lastCheckedAt remains null and the UI will show Unchecked.",
      ...curation.warnings,
    ],
    nextSteps: [
      "Run npm run github:health:dry-run -- --report .local-audit/github-health-after-add.json.",
      "After reviewing it, run npm run github:health -- --apply-report .local-audit/github-health-after-add.json --final-report .local-audit/github-health-after-add-writeback.json.",
      "Run npm run pipeline:generate to rebuild resource indexes and static paths.",
      "Run npm run github:validate-curation and npm run build.",
    ],
    nextCollection,
    nextCuration: curation.nextCuration,
    curationChanged: curation.curationChanged,
  };
}

function resolveReviewTarget(
  collection: GitHubFavoritesCollection,
  input: ReviewGitHubFavoriteInput,
): GitHubFavorite {
  if (Boolean(input.id) === Boolean(input.githubUrl)) {
    throw new Error("Provide exactly one review target: --id or --url.");
  }
  if (input.id) {
    const favorite = collection.records.find(
      (record) => record.id === input.id,
    );
    if (!favorite) {
      throw new Error(`GitHub favorite ${input.id} was not found.`);
    }
    return favorite;
  }

  const repository = parseGitHubRepositoryUrl(input.githubUrl!);
  if (!repository) {
    throw new Error(
      "GitHub URL must be an HTTPS repository URL on github.com.",
    );
  }
  const matches = collection.records.filter(
    (favorite) =>
      parseGitHubRepositoryUrl(favorite.githubUrl)?.key === repository.key,
  );
  if (matches.length === 0) {
    throw new Error(
      `GitHub repository ${repository.canonicalUrl} was not found.`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `GitHub repository ${repository.canonicalUrl} has multiple saved ` +
        `records (${matches.map((favorite) => favorite.id).join(", ")}); ` +
        "review it by ID.",
    );
  }
  return matches[0];
}

export function planReviewGitHubFavorite(options: {
  workspace: GitHubFavoriteWorkspace;
  input: ReviewGitHubFavoriteInput;
  now: string;
}): GitHubFavoriteMutationPlan {
  const now = normalizeNow(options.now);
  const target = resolveReviewTarget(
    options.workspace.collection,
    options.input,
  );
  const personalNote = normalizeText(options.input.personalNote);
  const whySaved = normalizeText(options.input.whySaved);
  if (whySaved !== undefined && !whySaved) {
    throw new Error("Why Saved cannot be cleared.");
  }

  const updated: GitHubFavorite = {
    ...target,
    lastReviewedAt: now,
    lastReviewedAtSource: "manual-review",
    ...(personalNote !== undefined ? { personalNote } : {}),
    ...(whySaved !== undefined ? { whySaved } : {}),
  };
  const nextCollection: GitHubFavoritesCollection = {
    ...options.workspace.collection,
    records: options.workspace.collection.records.map((favorite) =>
      favorite.id === target.id ? updated : favorite,
    ),
  };
  const collectionErrors =
    validateGitHubFavoritesCollection(nextCollection);
  if (collectionErrors.length > 0) {
    throw new Error(
      `Refusing invalid review update:\n- ${collectionErrors.join("\n- ")}`,
    );
  }

  const optionalChanges: GitHubFavoriteFieldChange[] = [];
  if (
    personalNote !== undefined &&
    personalNote !== target.personalNote
  ) {
    optionalChanges.push({
      field: "personalNote",
      previous: target.personalNote,
      next: personalNote,
    });
  }
  if (whySaved !== undefined && whySaved !== target.whySaved) {
    optionalChanges.push({
      field: "whySaved",
      previous: target.whySaved,
      next: whySaved,
    });
  }

  return {
    operation: "review",
    target: {
      id: target.id,
      title: target.title,
      githubUrl: target.githubUrl,
    },
    changes: [
      {
        field: "lastReviewedAt",
        previous: target.lastReviewedAt,
        next: now,
      },
      {
        field: "lastReviewedAtSource",
        previous: target.lastReviewedAtSource ?? null,
        next: "manual-review",
      },
      ...optionalChanges,
    ],
    warnings: [],
    nextSteps: [
      "Run npm run pipeline:generate so the static resource index carries the new review timestamp.",
      "Run npm run github:validate-curation and npm run build.",
    ],
    nextCollection,
    nextCuration: options.workspace.curation,
    curationChanged: false,
  };
}

async function readOriginal(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

async function restoreFile(
  filePath: string,
  original: Buffer | null,
): Promise<void> {
  if (original === null) {
    await fs.unlink(filePath).catch(() => undefined);
    return;
  }
  const rollbackPath = `${filePath}.${process.pid}.rollback.tmp`;
  await fs.writeFile(rollbackPath, original);
  await fs.rename(rollbackPath, filePath);
}

/**
 * Each file is replaced atomically. If a later replacement fails, previously
 * replaced files are restored from their exact original bytes.
 */
export async function writeFilesWithRollback(
  files: Array<{ filePath: string; content: string }>,
): Promise<void> {
  const resolvedPaths = files.map((file) => path.resolve(file.filePath));
  if (new Set(resolvedPaths).size !== resolvedPaths.length) {
    throw new Error("Mutation output paths must be distinct.");
  }

  const originals = await Promise.all(
    resolvedPaths.map((filePath) => readOriginal(filePath)),
  );
  const temporaryPaths = resolvedPaths.map(
    (filePath, index) => `${filePath}.${process.pid}.${index}.tmp`,
  );
  const replacedIndexes: number[] = [];

  try {
    for (let index = 0; index < files.length; index++) {
      await fs.mkdir(path.dirname(resolvedPaths[index]), {
        recursive: true,
      });
      await fs.writeFile(
        temporaryPaths[index],
        files[index].content,
        "utf8",
      );
    }
    for (let index = 0; index < files.length; index++) {
      await fs.rename(temporaryPaths[index], resolvedPaths[index]);
      replacedIndexes.push(index);
    }
  } catch (error) {
    const rollbackErrors: string[] = [];
    for (const index of [...replacedIndexes].reverse()) {
      try {
        await restoreFile(resolvedPaths[index], originals[index]);
      } catch (rollbackError) {
        rollbackErrors.push(
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError),
        );
      }
    }
    if (rollbackErrors.length > 0) {
      throw new Error(
        `GitHub favorite write failed and rollback was incomplete: ` +
          rollbackErrors.join("; "),
      );
    }
    throw error;
  } finally {
    await Promise.all(
      temporaryPaths.map((temporaryPath) =>
        fs.unlink(temporaryPath).catch(() => undefined),
      ),
    );
  }
}

export async function writeGitHubFavoriteMutation(options: {
  plan: GitHubFavoriteMutationPlan;
  paths: GitHubFavoriteWorkspacePaths;
}): Promise<string[]> {
  const collectionErrors = validateGitHubFavoritesCollection(
    options.plan.nextCollection,
  );
  if (collectionErrors.length > 0) {
    throw new Error(
      `Refusing to write an invalid collection:\n- ${collectionErrors.join("\n- ")}`,
    );
  }
  if (options.plan.curationChanged) {
    const curationErrors = validateGitHubFavoriteCurationCollection(
      options.plan.nextCuration,
    );
    if (curationErrors.length > 0) {
      throw new Error(
        `Refusing to write invalid curation:\n- ${curationErrors.join("\n- ")}`,
      );
    }
  }

  const collectionContent = serializeJson(options.plan.nextCollection);
  const files = [
    {
      filePath: options.paths.inputPath,
      content: collectionContent,
    },
    {
      filePath: options.paths.publicOutputPath,
      content: collectionContent,
    },
    ...(options.plan.curationChanged
      ? [
          {
            filePath: options.paths.curationPath,
            content: serializeJson(options.plan.nextCuration),
          },
        ]
      : []),
  ];
  await writeFilesWithRollback(files);

  const [canonicalRaw, publicRaw] = await Promise.all([
    fs.readFile(options.paths.inputPath, "utf8"),
    fs.readFile(options.paths.publicOutputPath, "utf8"),
  ]);
  if (canonicalRaw !== publicRaw) {
    throw new Error(
      "Post-write verification failed: canonical and public copies differ.",
    );
  }
  await loadGitHubFavoritesCollection(options.paths.inputPath);
  if (options.plan.curationChanged) {
    await loadGitHubFavoriteCurationCollection(
      options.paths.curationPath,
    );
  }

  return files.map((file) => path.resolve(file.filePath));
}

export async function executeGitHubFavoriteMutation(options: {
  plan: GitHubFavoriteMutationPlan;
  paths: GitHubFavoriteWorkspacePaths;
  write: boolean;
  confirmWrite?: () => Promise<boolean>;
}): Promise<GitHubFavoriteMutationResult> {
  if (!options.write) return { status: "dry-run" };
  if (options.confirmWrite && !(await options.confirmWrite())) {
    return { status: "cancelled" };
  }
  const filesWritten = await writeGitHubFavoriteMutation({
    plan: options.plan,
    paths: options.paths,
  });
  return { status: "written", filesWritten };
}
