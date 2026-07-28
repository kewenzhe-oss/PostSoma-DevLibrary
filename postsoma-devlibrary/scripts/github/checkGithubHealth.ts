import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  loadGitHubFavoritesCollection,
  parseGitHubRepositoryUrl,
  validateGitHubFavoritesCollection,
} from "../../lib/data/github-favorites";
import type {
  GitHubFavorite,
  GitHubFavoriteHealth,
  GitHubFavoritesCollection,
} from "../../lib/types/github-favorite";

const DEFAULT_QUIET_DAYS = 180;
const DEFAULT_CONCURRENCY = 8;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const UNAVAILABLE_STATUS_CODES = new Set([404, 410, 451]);
const GITHUB_API_VERSION = "2026-03-10";

export type GitHubHealthAuditStatus =
  | GitHubFavoriteHealth
  | "unverified";

export type GitHubHealthCheckFailureType =
  | "authentication"
  | "rate-limit"
  | "network"
  | "api"
  | "private-repository"
  | "url-unparseable";

export interface GitHubHealthAuditItem {
  id: string;
  title: string;
  repositoryUrl: string;
  health: GitHubHealthAuditStatus;
  reason: string;
  checkedAt: string | null;
  lastPushedAt: string | null;
  githubArchived: boolean | null;
  githubDisabled: boolean | null;
  httpStatus: number | null;
  errorType: GitHubHealthCheckFailureType | null;
}

export interface GitHubHealthAuditReport {
  schemaVersion: 1;
  mode: "dry-run" | "writeback";
  generatedAt: string;
  quietDays: number;
  summary: {
    totalRecords: number;
    uniqueRepositories: number;
    successfulRecords: number;
    unparseableUrlRecords: number;
    apiFailureRecords: number;
  };
  healthCounts: Record<GitHubHealthAuditStatus, number>;
  inputBaseline: {
    currentHealthCounts: Record<GitHubFavoriteHealth, number>;
    neverCheckedRecords: number;
    provisionalHealthWarning: string | null;
  };
  results: GitHubHealthAuditItem[];
  lists: {
    archived: GitHubHealthAuditItem[];
    unavailable: GitHubHealthAuditItem[];
    unverified: GitHubHealthAuditItem[];
    quiet: GitHubHealthAuditItem[];
  };
  diagnostics: {
    repositoryRequests: number;
    successfulRepositoryChecks: number;
    failedRepositoryChecks: number;
    retries: number;
    authenticationFailures: number;
    rateLimitFailures: number;
    networkFailures: number;
    apiFailures: number;
    privateRepositoryResponses: number;
    lowestRateLimitRemaining: number | null;
    rateLimitResetAt: string | null;
  };
  safety: {
    canonicalFilesModified: boolean;
    canonicalFilesNotModified: string[];
    actionsNotPerformed: string[];
  };
  writeback?: {
    appliedAt: string;
    recordsWritten: number;
    removedFavoriteIds: string[];
    healthFieldsWritten: Array<
      | "health"
      | "lastCheckedAt"
      | "lastPushedAt"
      | "githubArchived"
      | "githubDisabled"
    >;
    untouchedEditorialFields: string[];
    canonicalFilesWritten: string[];
  };
}

interface GitHubApiRepository {
  archived: boolean;
  disabled: boolean;
  pushed_at: string | null;
  private: boolean;
}

interface RepositoryHealthResult {
  health: GitHubFavoriteHealth;
  checkedAt: string;
  pushedAt: string | null;
  archived: boolean | null;
  disabled: boolean | null;
  httpStatus: number;
  attempts: number;
  rateLimitRemaining: number | null;
  rateLimitResetAt: string | null;
}

interface RepositoryHealthFailure {
  type: Exclude<GitHubHealthCheckFailureType, "url-unparseable">;
  reason: string;
  httpStatus: number | null;
  attempts: number;
  rateLimitRemaining: number | null;
  rateLimitResetAt: string | null;
}

class GitHubHealthCheckError extends Error {
  readonly type: RepositoryHealthFailure["type"];
  readonly httpStatus: number | null;
  readonly attempts: number;
  readonly rateLimitRemaining: number | null;
  readonly rateLimitResetAt: string | null;

  constructor(
    type: RepositoryHealthFailure["type"],
    message: string,
    options: {
      httpStatus?: number | null;
      attempts: number;
      rateLimitRemaining?: number | null;
      rateLimitResetAt?: string | null;
    },
  ) {
    super(message);
    this.name = "GitHubHealthCheckError";
    this.type = type;
    this.httpStatus = options.httpStatus ?? null;
    this.attempts = options.attempts;
    this.rateLimitRemaining = options.rateLimitRemaining ?? null;
    this.rateLimitResetAt = options.rateLimitResetAt ?? null;
  }
}

export function classifyRepositoryHealth(options: {
  archived: boolean;
  disabled: boolean;
  pushedAt: string | null;
  checkedAt: string;
  quietDays?: number;
}): GitHubFavoriteHealth {
  if (options.disabled) return "unavailable";
  if (options.archived) return "archived";
  if (!options.pushedAt) return "quiet";

  const pushedAt = Date.parse(options.pushedAt);
  const checkedAt = Date.parse(options.checkedAt);
  if (!Number.isFinite(pushedAt) || !Number.isFinite(checkedAt)) {
    return "quiet";
  }

  const quietDays = options.quietDays ?? DEFAULT_QUIET_DAYS;
  const quietAfterMs = quietDays * 24 * 60 * 60 * 1000;
  return checkedAt - pushedAt > quietAfterMs ? "quiet" : "active";
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseRateLimitRemaining(response: Response): number | null {
  const raw = response.headers.get("x-ratelimit-remaining");
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRateLimitResetAt(response: Response): string | null {
  const raw = response.headers.get("x-ratelimit-reset");
  if (raw === null) return null;
  const timestamp = Number(raw) * 1000;
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : null;
}

function getRetryDelay(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 10_000);
  }
  return 500 * 2 ** attempt;
}

async function fetchRepositoryHealth(options: {
  apiUrl: string;
  token?: string;
  checkedAt: string;
  quietDays: number;
}): Promise<RepositoryHealthResult> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "PostSoma-DevLibrary-health-check",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let lastError: GitHubHealthCheckError | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const attempts = attempt + 1;
    let response: Response;
    try {
      response = await fetch(options.apiUrl, { headers });
    } catch (error) {
      lastError = new GitHubHealthCheckError(
        "network",
        error instanceof Error
          ? `GitHub network request failed: ${error.name}`
          : "GitHub network request failed",
        { attempts },
      );
      if (attempt < 2) {
        await delay(500 * 2 ** attempt);
        continue;
      }
      throw lastError;
    }

    const rateLimitRemaining = parseRateLimitRemaining(response);
    const rateLimitResetAt = parseRateLimitResetAt(response);

    if (response.ok) {
      const repository = (await response.json()) as GitHubApiRepository;
      if (repository.private) {
        throw new GitHubHealthCheckError(
          "private-repository",
          "GitHub returned a private repository; API metadata was withheld",
          {
            httpStatus: response.status,
            attempts,
            rateLimitRemaining,
            rateLimitResetAt,
          },
        );
      }
      return {
        health: classifyRepositoryHealth({
          archived: repository.archived,
          disabled: repository.disabled,
          pushedAt: repository.pushed_at,
          checkedAt: options.checkedAt,
          quietDays: options.quietDays,
        }),
        checkedAt: options.checkedAt,
        pushedAt: repository.pushed_at,
        archived: repository.archived,
        disabled: repository.disabled,
        httpStatus: response.status,
        attempts,
        rateLimitRemaining,
        rateLimitResetAt,
      };
    }

    if (UNAVAILABLE_STATUS_CODES.has(response.status)) {
      return {
        health: "unavailable",
        checkedAt: options.checkedAt,
        pushedAt: null,
        archived: null,
        disabled: null,
        httpStatus: response.status,
        attempts,
        rateLimitRemaining,
        rateLimitResetAt,
      };
    }

    if (rateLimitRemaining === 0) {
      throw new GitHubHealthCheckError(
        "rate-limit",
        `GitHub API rate limit exhausted; resets at ${
          rateLimitResetAt ?? "an unknown time"
        }`,
        {
          httpStatus: response.status,
          attempts,
          rateLimitRemaining,
          rateLimitResetAt,
        },
      );
    }

    const type: RepositoryHealthFailure["type"] =
      response.status === 401
        ? "authentication"
        : response.status === 429
          ? "rate-limit"
          : "api";
    const message = `GitHub API returned ${response.status}`;
    if (!RETRYABLE_STATUS_CODES.has(response.status)) {
      throw new GitHubHealthCheckError(type, message, {
        httpStatus: response.status,
        attempts,
        rateLimitRemaining,
        rateLimitResetAt,
      });
    }

    lastError = new GitHubHealthCheckError(type, message, {
      httpStatus: response.status,
      attempts,
      rateLimitRemaining,
      rateLimitResetAt,
    });
    if (attempt < 2) {
      await delay(getRetryDelay(response, attempt));
    }
  }

  throw (
    lastError ??
    new GitHubHealthCheckError("api", "GitHub request failed", {
      attempts: 3,
    })
  );
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await mapper(values[currentIndex]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, values.length) },
      () => worker(),
    ),
  );
  return results;
}

function toRepositoryHealthFailure(error: unknown): RepositoryHealthFailure {
  if (error instanceof GitHubHealthCheckError) {
    return {
      type: error.type,
      reason: error.message,
      httpStatus: error.httpStatus,
      attempts: error.attempts,
      rateLimitRemaining: error.rateLimitRemaining,
      rateLimitResetAt: error.rateLimitResetAt,
    };
  }

  return {
    type: "api",
    reason:
      error instanceof Error
        ? `Unexpected GitHub check failure: ${error.name}`
        : "Unexpected GitHub check failure",
    httpStatus: null,
    attempts: 1,
    rateLimitRemaining: null,
    rateLimitResetAt: null,
  };
}

function getHealthReason(
  result: RepositoryHealthResult,
  quietDays: number,
): string {
  if (result.disabled) return "GitHub reports disabled=true.";
  if (result.archived) return "GitHub reports archived=true.";
  if (result.health === "unavailable") {
    return `GitHub API returned ${result.httpStatus}; the repository is not accessible at this URL.`;
  }
  if (result.health === "quiet") {
    if (!result.pushedAt) {
      return "GitHub returned no last push timestamp.";
    }
    return `Last push is older than the ${quietDays}-day quiet threshold.`;
  }
  return `Last push is within the ${quietDays}-day active threshold.`;
}

function createHealthCounts(): Record<GitHubHealthAuditStatus, number> {
  return {
    active: 0,
    quiet: 0,
    archived: 0,
    unavailable: 0,
    unverified: 0,
  };
}

function createCanonicalHealthCounts(): Record<
  GitHubFavoriteHealth,
  number
> {
  return {
    active: 0,
    quiet: 0,
    archived: 0,
    unavailable: 0,
  };
}

type RepositoryAuditOutcome =
  | {
      ok: true;
      result: RepositoryHealthResult;
    }
  | {
      ok: false;
      failure: RepositoryHealthFailure;
    };

export async function auditGitHubFavoriteHealth(options: {
  collection: GitHubFavoritesCollection;
  token: string;
  checkedAt?: string;
  quietDays?: number;
  concurrency?: number;
}): Promise<GitHubHealthAuditReport> {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const quietDays = options.quietDays ?? DEFAULT_QUIET_DAYS;
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const repositories = new Map<
    string,
    NonNullable<ReturnType<typeof parseGitHubRepositoryUrl>>
  >();

  for (const favorite of options.collection.records) {
    const repository =
      typeof favorite.githubUrl === "string"
        ? parseGitHubRepositoryUrl(favorite.githubUrl)
        : null;
    if (repository) repositories.set(repository.key, repository);
  }

  const repositoryEntries = [...repositories.entries()];
  const repositoryResults = await mapWithConcurrency(
    repositoryEntries,
    concurrency,
    async (
      [key, repository],
    ): Promise<readonly [string, RepositoryAuditOutcome]> => {
      try {
        const result = await fetchRepositoryHealth({
          apiUrl: repository.apiUrl,
          token: options.token,
          checkedAt,
          quietDays,
        });
        return [key, { ok: true, result }];
      } catch (error) {
        return [
          key,
          {
            ok: false,
            failure: toRepositoryHealthFailure(error),
          },
        ];
      }
    },
  );
  const outcomeByRepository = new Map<string, RepositoryAuditOutcome>(
    repositoryResults,
  );

  const items = options.collection.records.map(
    (favorite): GitHubHealthAuditItem => {
      const repository =
        typeof favorite.githubUrl === "string"
          ? parseGitHubRepositoryUrl(favorite.githubUrl)
          : null;
      if (!repository) {
        return {
          id: favorite.id,
          title: favorite.title,
          repositoryUrl:
            typeof favorite.githubUrl === "string"
              ? favorite.githubUrl
              : "[invalid GitHub URL]",
          health: "unverified",
          reason: "The URL cannot be parsed as a GitHub repository.",
          checkedAt: null,
          lastPushedAt: null,
          githubArchived: null,
          githubDisabled: null,
          httpStatus: null,
          errorType: "url-unparseable",
        };
      }

      const outcome = outcomeByRepository.get(repository.key);
      if (!outcome) {
        return {
          id: favorite.id,
          title: favorite.title,
          repositoryUrl: favorite.githubUrl,
          health: "unverified",
          reason: "No repository check result was produced.",
          checkedAt: null,
          lastPushedAt: null,
          githubArchived: null,
          githubDisabled: null,
          httpStatus: null,
          errorType: "api",
        };
      }

      if (!outcome.ok) {
        return {
          id: favorite.id,
          title: favorite.title,
          repositoryUrl: favorite.githubUrl,
          health: "unverified",
          reason: outcome.failure.reason,
          checkedAt: null,
          lastPushedAt: null,
          githubArchived: null,
          githubDisabled: null,
          httpStatus: outcome.failure.httpStatus,
          errorType: outcome.failure.type,
        };
      }

      return {
        id: favorite.id,
        title: favorite.title,
        repositoryUrl: favorite.githubUrl,
        health: outcome.result.health,
        reason: getHealthReason(outcome.result, quietDays),
        checkedAt: outcome.result.checkedAt,
        lastPushedAt: outcome.result.pushedAt,
        githubArchived: outcome.result.archived,
        githubDisabled: outcome.result.disabled,
        httpStatus: outcome.result.httpStatus,
        errorType: null,
      };
    },
  );

  const healthCounts = createHealthCounts();
  for (const item of items) healthCounts[item.health] += 1;

  const currentHealthCounts = createCanonicalHealthCounts();
  for (const favorite of options.collection.records) {
    currentHealthCounts[favorite.health] += 1;
  }

  const neverCheckedRecords = options.collection.records.filter(
    (favorite) => favorite.lastCheckedAt === null,
  ).length;
  const allCurrentHealthIsProvisionalActive =
    options.collection.records.length > 0 &&
    currentHealthCounts.active === options.collection.records.length &&
    neverCheckedRecords === options.collection.records.length;

  const repositoryOutcomes = repositoryResults.map(([, outcome]) => outcome);
  const failureCounts = (
    type: RepositoryHealthFailure["type"],
  ): number =>
    repositoryOutcomes.filter(
      (outcome) => !outcome.ok && outcome.failure.type === type,
    ).length;
  const rateLimitRemainingValues = repositoryOutcomes
    .map((outcome) =>
      outcome.ok
        ? outcome.result.rateLimitRemaining
        : outcome.failure.rateLimitRemaining,
    )
    .filter((value): value is number => value !== null);
  const rateLimitResetValues = repositoryOutcomes
    .map((outcome) =>
      outcome.ok
        ? outcome.result.rateLimitResetAt
        : outcome.failure.rateLimitResetAt,
    )
    .filter((value): value is string => value !== null)
    .sort();

  return {
    schemaVersion: 1,
    mode: "dry-run",
    generatedAt: checkedAt,
    quietDays,
    summary: {
      totalRecords: items.length,
      uniqueRepositories: repositories.size,
      successfulRecords: items.filter((item) => item.health !== "unverified")
        .length,
      unparseableUrlRecords: items.filter(
        (item) => item.errorType === "url-unparseable",
      ).length,
      apiFailureRecords: items.filter(
        (item) =>
          item.health === "unverified" &&
          item.errorType !== "url-unparseable",
      ).length,
    },
    healthCounts,
    inputBaseline: {
      currentHealthCounts,
      neverCheckedRecords,
      provisionalHealthWarning: allCurrentHealthIsProvisionalActive
        ? "All current active values are migration defaults: every record has lastCheckedAt=null, so they are not verified health conclusions."
        : null,
    },
    results: items,
    lists: {
      archived: items.filter((item) => item.health === "archived"),
      unavailable: items.filter((item) => item.health === "unavailable"),
      unverified: items.filter((item) => item.health === "unverified"),
      quiet: items.filter((item) => item.health === "quiet"),
    },
    diagnostics: {
      repositoryRequests: repositoryOutcomes.length,
      successfulRepositoryChecks: repositoryOutcomes.filter(
        (outcome) => outcome.ok,
      ).length,
      failedRepositoryChecks: repositoryOutcomes.filter(
        (outcome) => !outcome.ok,
      ).length,
      retries: repositoryOutcomes.reduce(
        (total, outcome) =>
          total +
          Math.max(
            0,
            (outcome.ok
              ? outcome.result.attempts
              : outcome.failure.attempts) - 1,
          ),
        0,
      ),
      authenticationFailures: failureCounts("authentication"),
      rateLimitFailures: failureCounts("rate-limit"),
      networkFailures: failureCounts("network"),
      apiFailures: failureCounts("api"),
      privateRepositoryResponses: failureCounts("private-repository"),
      lowestRateLimitRemaining:
        rateLimitRemainingValues.length > 0
          ? Math.min(...rateLimitRemainingValues)
          : null,
      rateLimitResetAt: rateLimitResetValues[0] ?? null,
    },
    safety: {
      canonicalFilesModified: false,
      canonicalFilesNotModified: [
        "data/github-favorites.json",
        "public/data/github-favorites.json",
      ],
      actionsNotPerformed: [
        "canonical JSON write",
        "git commit",
        "git push",
        "deployment",
      ],
    },
  };
}

export async function checkGitHubFavoriteHealth(options: {
  collection: GitHubFavoritesCollection;
  token?: string;
  checkedAt?: string;
  quietDays?: number;
  concurrency?: number;
}): Promise<GitHubFavoritesCollection> {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const quietDays = options.quietDays ?? DEFAULT_QUIET_DAYS;
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;

  const repositories = new Map<
    string,
    ReturnType<typeof parseGitHubRepositoryUrl>
  >();
  for (const favorite of options.collection.records) {
    const repository = parseGitHubRepositoryUrl(favorite.githubUrl);
    if (!repository) {
      throw new Error(
        `Cannot determine GitHub repository from ${favorite.githubUrl}`,
      );
    }
    repositories.set(repository.key, repository);
  }

  const repositoryEntries = [...repositories.entries()] as Array<
    [string, NonNullable<ReturnType<typeof parseGitHubRepositoryUrl>>]
  >;
  const healthResults = await mapWithConcurrency(
    repositoryEntries,
    concurrency,
    async ([key, repository]) => [
      key,
      await fetchRepositoryHealth({
        apiUrl: repository.apiUrl,
        token: options.token,
        checkedAt,
        quietDays,
      }),
    ] as const,
  );
  const healthByRepository = new Map(healthResults);

  const records = options.collection.records.map(
    (favorite): GitHubFavorite => {
      const repository = parseGitHubRepositoryUrl(favorite.githubUrl);
      const result = repository
        ? healthByRepository.get(repository.key)
        : undefined;
      if (!result) {
        throw new Error(`Missing health result for ${favorite.githubUrl}`);
      }

      return {
        ...favorite,
        health: result.health,
        lastCheckedAt: result.checkedAt,
        lastPushedAt: result.pushedAt,
        githubArchived: result.archived,
        githubDisabled: result.disabled,
      };
    },
  );

  return {
    ...options.collection,
    records,
  };
}

const HEALTH_FACT_FIELDS = [
  "health",
  "lastCheckedAt",
  "lastPushedAt",
  "githubArchived",
  "githubDisabled",
] as const;

const UNTOUCHED_EDITORIAL_FIELDS = [
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
  "editorial",
  "manual curation sidecar",
  "book/course relationships",
];

function isIsoDate(value: string | null): value is string {
  return value !== null && Number.isFinite(Date.parse(value));
}

export function applyGitHubHealthAuditReport(options: {
  collection: GitHubFavoritesCollection;
  report: GitHubHealthAuditReport;
}): GitHubFavoritesCollection {
  if (options.report.schemaVersion !== 1) {
    throw new Error("Health audit report schemaVersion must be 1.");
  }
  if (options.report.mode !== "dry-run") {
    throw new Error("Only an unapplied dry-run report can be written back.");
  }
  if (options.report.healthCounts.unverified !== 0) {
    throw new Error(
      "Health audit report contains unverified records and cannot be written back.",
    );
  }
  if (options.report.results.length !== options.collection.records.length) {
    throw new Error(
      "Health audit report record count does not match the canonical collection.",
    );
  }

  const resultById = new Map<string, GitHubHealthAuditItem>();
  for (const result of options.report.results) {
    if (resultById.has(result.id)) {
      throw new Error(`Health audit report duplicates favorite ${result.id}.`);
    }
    if (result.health === "unverified") {
      throw new Error(
        `Health audit report leaves favorite ${result.id} unverified.`,
      );
    }
    if (!isIsoDate(result.checkedAt)) {
      throw new Error(
        `Health audit result ${result.id} is missing a valid checkedAt timestamp.`,
      );
    }
    if (
      result.lastPushedAt !== null &&
      !isIsoDate(result.lastPushedAt)
    ) {
      throw new Error(
        `Health audit result ${result.id} has an invalid lastPushedAt timestamp.`,
      );
    }
    if (
      result.githubArchived !== null &&
      typeof result.githubArchived !== "boolean"
    ) {
      throw new Error(
        `Health audit result ${result.id} has an invalid archived fact.`,
      );
    }
    if (
      result.githubDisabled !== null &&
      typeof result.githubDisabled !== "boolean"
    ) {
      throw new Error(
        `Health audit result ${result.id} has an invalid disabled fact.`,
      );
    }
    resultById.set(result.id, result);
  }

  const records = options.collection.records.map(
    (favorite): GitHubFavorite => {
      const result = resultById.get(favorite.id);
      if (!result) {
        throw new Error(
          `Health audit report is missing favorite ${favorite.id}.`,
        );
      }
      if (result.repositoryUrl !== favorite.githubUrl) {
        throw new Error(
          `Health audit URL mismatch for favorite ${favorite.id}.`,
        );
      }
      if (result.health === "unverified") {
        throw new Error(
          `Health audit report leaves favorite ${favorite.id} unverified.`,
        );
      }

      return {
        ...favorite,
        health: result.health,
        lastCheckedAt: result.checkedAt,
        lastPushedAt: result.lastPushedAt,
        githubArchived: result.githubArchived,
        githubDisabled: result.githubDisabled,
      };
    },
  );

  return {
    ...options.collection,
    records,
  };
}

async function writeCollection(
  filePath: string,
  collection: GitHubFavoritesCollection,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  try {
    await fs.writeFile(
      temporaryPath,
      `${JSON.stringify(collection, null, 2)}\n`,
      "utf8",
    );
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function loadGitHubFavoritesCollectionForAudit(
  filePath: string,
): Promise<GitHubFavoritesCollection> {
  const raw = await fs.readFile(filePath, "utf8");
  const value = JSON.parse(raw) as unknown;
  const errors = validateGitHubFavoritesCollection(value);
  const blockingErrors = errors.filter(
    (error) =>
      !/^records\[\d+\]\.githubUrl must identify a GitHub repository$/.test(
        error,
      ),
  );
  if (blockingErrors.length > 0) {
    throw new Error(
      `Invalid GitHub favorites collection:\n- ${blockingErrors.join("\n- ")}`,
    );
  }
  return value as GitHubFavoritesCollection;
}

async function verifyGitHubTokenAndQuota(options: {
  token: string;
  requiredRequests: number;
}): Promise<void> {
  let response: Response;
  try {
    response = await fetch("https://api.github.com/rate_limit", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${options.token}`,
        "User-Agent": "PostSoma-DevLibrary-health-check",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
    });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `GitHub authentication preflight failed: ${error.name}`
        : "GitHub authentication preflight failed",
    );
  }

  if (response.status === 401) {
    throw new Error(
      "GitHub token authentication failed (401). Replace or refresh the local token before retrying.",
    );
  }
  if (!response.ok) {
    throw new Error(
      `GitHub authentication preflight returned ${response.status}.`,
    );
  }

  const payload = (await response.json()) as {
    resources?: {
      core?: {
        remaining?: number;
        reset?: number;
      };
    };
  };
  const remaining = payload.resources?.core?.remaining;
  const reset = payload.resources?.core?.reset;
  if (!Number.isFinite(remaining)) {
    throw new Error(
      "GitHub authentication succeeded, but the core API quota could not be determined.",
    );
  }
  if ((remaining as number) < options.requiredRequests) {
    const resetAt = Number.isFinite(reset)
      ? new Date((reset as number) * 1000).toISOString()
      : "an unknown time";
    throw new Error(
      `GitHub API quota is insufficient for a full dry-run: ${
        remaining as number
      } requests remain, ${options.requiredRequests} are required; resets at ${resetAt}.`,
    );
  }
}

async function writeHealthAuditReport(
  filePath: string,
  report: GitHubHealthAuditReport,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  try {
    await fs.writeFile(
      temporaryPath,
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

function getArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getArguments(name: string): string[] {
  return process.argv.flatMap((value, index) =>
    value === name && process.argv[index + 1]
      ? [process.argv[index + 1]]
      : [],
  );
}

function getPositiveIntegerArgument(
  name: string,
  fallback: number,
): number {
  const raw = getArgument(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(
      "Usage: tsx scripts/github/checkGithubHealth.ts " +
        "[--input path] [--public-output path] [--quiet-days 180] " +
        "[--concurrency 8] [--allow-unauthenticated] " +
        "[--dry-run] [--report out/github-health-audit.json] " +
        "[--apply-report path] [--final-report path] [--removed-id id]",
    );
    return;
  }

  const isDryRun = process.argv.includes("--dry-run");
  const applyReportArgument = getArgument("--apply-report");
  const inputPath = path.resolve(
    getArgument("--input") ?? "data/github-favorites.json",
  );
  const publicOutputPath = path.resolve(
    getArgument("--public-output") ?? "public/data/github-favorites.json",
  );
  const quietDays = getPositiveIntegerArgument(
    "--quiet-days",
    Number(process.env.GITHUB_QUIET_DAYS) || DEFAULT_QUIET_DAYS,
  );
  const concurrency = getPositiveIntegerArgument(
    "--concurrency",
    DEFAULT_CONCURRENCY,
  );
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (isDryRun && applyReportArgument) {
    throw new Error("--dry-run and --apply-report cannot be used together.");
  }
  if (isDryRun && !token) {
    throw new Error(
      "GITHUB_TOKEN or GH_TOKEN is required for a full health audit dry-run.",
    );
  }
  if (
    !applyReportArgument &&
    !token &&
    !process.argv.includes("--allow-unauthenticated")
  ) {
    throw new Error(
      "GITHUB_TOKEN or GH_TOKEN is required for the full collection. " +
        "Use --allow-unauthenticated only for small local checks.",
    );
  }

  if (isDryRun) {
    const reportPath = path.resolve(
      getArgument("--report") ?? "out/github-health-audit.json",
    );
    if (
      reportPath === inputPath ||
      reportPath === publicOutputPath
    ) {
      throw new Error(
        "--report must not point to a canonical GitHub favorites file.",
      );
    }

    const collection =
      await loadGitHubFavoritesCollectionForAudit(inputPath);
    const uniqueRepositories = new Set(
      collection.records
        .map((favorite) =>
          typeof favorite.githubUrl === "string"
            ? parseGitHubRepositoryUrl(favorite.githubUrl)?.key
            : undefined,
        )
        .filter((key): key is string => Boolean(key)),
    ).size;
    await verifyGitHubTokenAndQuota({
      token: token!,
      requiredRequests: uniqueRepositories,
    });
    const report = await auditGitHubFavoriteHealth({
      collection,
      token: token!,
      quietDays,
      concurrency,
    });
    await writeHealthAuditReport(reportPath, report);
    console.log(
      `Dry-run checked ${report.summary.totalRecords} favorites across ` +
        `${report.summary.uniqueRepositories} repositories: ` +
        `${JSON.stringify(report.healthCounts)}. ` +
        `Canonical JSON was not modified. Report: ${reportPath}`,
    );
    return;
  }

  if (applyReportArgument) {
    const reportPath = path.resolve(applyReportArgument);
    const finalReportPath = path.resolve(
      getArgument("--final-report") ??
        "out/github-health-audit-writeback.json",
    );
    if (
      finalReportPath === inputPath ||
      finalReportPath === publicOutputPath
    ) {
      throw new Error(
        "--final-report must not point to a canonical GitHub favorites file.",
      );
    }

    const [collection, reportRaw] = await Promise.all([
      loadGitHubFavoritesCollection(inputPath),
      fs.readFile(reportPath, "utf8"),
    ]);
    const report = JSON.parse(reportRaw) as GitHubHealthAuditReport;
    const updated = applyGitHubHealthAuditReport({
      collection,
      report,
    });
    const validationErrors =
      validateGitHubFavoritesCollection(updated);
    if (validationErrors.length > 0) {
      throw new Error(
        `Refusing health writeback because the updated collection is invalid:\n- ${validationErrors.join("\n- ")}`,
      );
    }

    // Each destination is replaced atomically only after the complete report
    // has passed ID, URL, timestamp and schema validation.
    await writeCollection(inputPath, updated);
    await writeCollection(publicOutputPath, updated);

    const appliedAt = new Date().toISOString();
    const finalReport: GitHubHealthAuditReport = {
      ...report,
      mode: "writeback",
      safety: {
        canonicalFilesModified: true,
        canonicalFilesNotModified: [],
        actionsNotPerformed: [
          "git commit",
          "git push",
          "deployment",
        ],
      },
      writeback: {
        appliedAt,
        recordsWritten: updated.records.length,
        removedFavoriteIds: getArguments("--removed-id"),
        healthFieldsWritten: [...HEALTH_FACT_FIELDS],
        untouchedEditorialFields: [...UNTOUCHED_EDITORIAL_FIELDS],
        canonicalFilesWritten: [
          path.relative(process.cwd(), inputPath),
          path.relative(process.cwd(), publicOutputPath),
        ],
      },
    };
    await writeHealthAuditReport(finalReportPath, finalReport);
    console.log(
      `Applied ${updated.records.length} verified health results to both ` +
        `canonical copies. Final audit: ${finalReportPath}`,
    );
    return;
  }

  const collection = await loadGitHubFavoritesCollection(inputPath);
  const updated = await checkGitHubFavoriteHealth({
    collection,
    token,
    quietDays,
    concurrency,
  });

  // Write only after every request succeeds, so transient API failures cannot
  // leave a partially refreshed collection.
  await writeCollection(inputPath, updated);
  await writeCollection(publicOutputPath, updated);

  const counts = updated.records.reduce<Record<string, number>>(
    (result, favorite) => {
      result[favorite.health] = (result[favorite.health] ?? 0) + 1;
      return result;
    },
    {},
  );
  console.log(
    `Checked ${updated.records.length} favorites: ${JSON.stringify(counts)}`,
  );
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
