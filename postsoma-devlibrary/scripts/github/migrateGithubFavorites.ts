import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type {
  GitHubFavorite,
  GitHubFavoritesCollection,
} from "../../lib/types/github-favorite";
import type { Resource } from "../../lib/types/resource";
import {
  parseCSV,
  loadAndTransformGitHubCsv,
} from "../pipeline/transformCsv";

type CsvRecord = Record<string, string>;

const TECH_STACK_PATTERNS: Array<[string, RegExp]> = [
  ["TypeScript", /\btypescript\b/i],
  ["JavaScript", /\bjavascript\b/i],
  ["Python", /\bpython\b/i],
  ["Rust", /\brust\b/i],
  ["Go", /\bgolang\b|\bgo-based\b|\bbuilt (?:in|with) go\b/i],
  ["Java", /\bjava\b/i],
  ["C#", /\bc#\b|\.net\b/i],
  ["C++", /\bc\+\+\b/i],
  ["React", /\breact(?:\.js)?\b/i],
  ["Next.js", /\bnext\.?js\b/i],
  ["Vue", /\bvue(?:\.js)?\b/i],
  ["Svelte", /\bsvelte\b/i],
  ["Node.js", /\bnode\.?js\b/i],
  ["Django", /\bdjango\b/i],
  ["Flask", /\bflask\b/i],
  ["FastAPI", /\bfastapi\b/i],
  ["Tauri", /\btauri\b/i],
  ["Electron", /\belectron\b/i],
  ["Docker", /\bdocker\b/i],
  ["Kubernetes", /\bkubernetes\b|\bk8s\b/i],
  ["PostgreSQL", /\bpostgres(?:ql)?\b/i],
  ["SQLite", /\bsqlite\b/i],
  ["Redis", /\bredis\b/i],
  ["PyTorch", /\bpytorch\b/i],
  ["TensorFlow", /\btensorflow\b/i],
];

const CAPABILITY_PATTERNS: Array<[string, RegExp]> = [
  ["RAG", /\brag\b|retrieval[- ]augmented generation/i],
  ["OCR", /\bocr\b|optical character recognition/i],
  ["Speech", /\bspeech\b|text[- ]to[- ]speech|\btts\b|voice synthesis/i],
  ["Automation", /\bautomation\b|\bautomates?\b|\bautomating\b/i],
  ["Translation", /\btranslation\b|\btranslate[sd]?\b/i],
  ["Search", /\bsearch\b|retrieval engine/i],
  ["Monitoring", /\bmonitor(?:ing|s)?\b|observability/i],
  ["Code Analysis", /\bcode analysis\b|analy[sz](?:e|es|ing) code/i],
];

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      const key = value.toLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function inferCapabilities(
  record: CsvRecord,
  existingCapabilities: string[],
): string[] {
  const haystack = [
    record.Summary,
    record["Key Takeaway"],
    record["Action Reason"],
    record.Topic,
  ]
    .filter(Boolean)
    .join("\n");
  const inferred = CAPABILITY_PATTERNS.filter(([, pattern]) =>
    pattern.test(haystack),
  ).map(([label]) => label);
  return unique([...existingCapabilities, ...inferred]);
}

export function inferTechStack(record: CsvRecord): string[] {
  const haystack = [
    record["Raw Input"],
    record.Summary,
    record["Key Takeaway"],
    record.Subtopics,
  ]
    .filter(Boolean)
    .join("\n");

  return TECH_STACK_PATTERNS.filter(([, pattern]) => pattern.test(haystack)).map(
    ([label]) => label,
  );
}

export function parseLegacyDate(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function rowsToRecords(rows: string[][]): CsvRecord[] {
  if (rows.length === 0) return [];
  const headers = rows[0].map((header) =>
    header.replace(/^\uFEFF/, "").trim(),
  );
  return rows.slice(1).map((row) =>
    Object.fromEntries(
      headers.map((header, index) => [header, row[index]?.trim() ?? ""]),
    ),
  );
}

function buildFavorite(resource: Resource, csvRecord: CsvRecord): GitHubFavorite {
  const reviewedAt = parseLegacyDate(csvRecord["Last AI Processed At"]);
  const shortSummary =
    resource.cardSummary ??
    resource.keyTakeaway ??
    resource.summary ??
    "";
  const whySaved =
    resource.keyTakeaway ??
    csvRecord["Action Reason"] ??
    csvRecord["Post Angle"] ??
    "";

  return {
    id: resource.id,
    githubUrl: resource.url,
    title: resource.title,
    shortSummary,
    capabilities: inferCapabilities(csvRecord, resource.tags),
    techStack: inferTechStack(csvRecord),
    // The legacy CSV did not contain a genuine personal-note field. Keeping it
    // empty is more honest than repurposing AI/social editorial copy.
    personalNote: "",
    whySaved,
    // Last AI processing is the earliest reliable per-record timestamp in the
    // legacy source. Records without it remain explicitly unknown.
    discoveredAt: reviewedAt,
    lastReviewedAt: reviewedAt,
    // Initial health is provisional until the scheduled GitHub API check writes
    // lastCheckedAt. The enum intentionally has no ambiguous "unknown" state.
    health: "active",
    lastCheckedAt: null,
    lastPushedAt: null,
    githubArchived: null,
    githubDisabled: null,
    editorial: {
      topic: resource.category,
      subcategory: resource.subcategory,
      resourceType: resource.type,
      quality: resource.quality,
      fullSummary: resource.summary ?? resource.detailSummary ?? "",
      detailSummary: resource.detailSummary,
      priority: resource.priority,
      action: resource.action,
      primaryAudience: csvRecord["Primary Audience"] || undefined,
      bestFor: resource.bestFor,
      accessNote: resource.accessNote,
    },
  };
}

export async function migrateGitHubFavorites(options: {
  inputPath: string;
  outputPath: string;
  publicOutputPath?: string;
  migratedAt?: string;
}): Promise<GitHubFavoritesCollection> {
  const csvContent = await fs.readFile(options.inputPath, "utf8");
  const csvRecords = rowsToRecords(parseCSV(csvContent));
  const resources = await loadAndTransformGitHubCsv(options.inputPath);
  const recordsByUrl = new Map(
    csvRecords.map((record) => [record.URL, record] as const),
  );

  const favorites = resources.map((resource) => {
    const csvRecord = recordsByUrl.get(resource.url);
    if (!csvRecord) {
      throw new Error(`Missing legacy CSV row for ${resource.url}`);
    }
    return buildFavorite(resource, csvRecord);
  });

  const collection: GitHubFavoritesCollection = {
    schemaVersion: 1,
    migratedAt: options.migratedAt ?? new Date().toISOString(),
    source: path.basename(options.inputPath),
    records: favorites,
  };

  await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
  await fs.writeFile(
    options.outputPath,
    `${JSON.stringify(collection, null, 2)}\n`,
    "utf8",
  );
  if (options.publicOutputPath) {
    await fs.mkdir(path.dirname(options.publicOutputPath), {
      recursive: true,
    });
    await fs.writeFile(
      options.publicOutputPath,
      `${JSON.stringify(collection, null, 2)}\n`,
      "utf8",
    );
  }

  return collection;
}

function getArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const inputPath = path.resolve(
    getArgument("--input") ?? "../github-content-library.csv",
  );
  const outputPath = path.resolve(
    getArgument("--output") ?? "data/github-favorites.json",
  );
  const publicOutputPath = path.resolve(
    getArgument("--public-output") ??
      "public/data/github-favorites.json",
  );
  const migratedAt = getArgument("--migrated-at");

  const collection = await migrateGitHubFavorites({
    inputPath,
    outputPath,
    publicOutputPath,
    migratedAt,
  });
  console.log(
    `Migrated ${collection.records.length} GitHub favorites to ${outputPath}`,
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
