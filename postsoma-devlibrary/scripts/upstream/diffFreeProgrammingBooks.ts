import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Resource } from "../../lib/types/resource";
import { dedupeResources, normalizeUrlForDedupe } from "../pipeline/dedupeResources";
import { parseMarkdownResources } from "../pipeline/parseMarkdown";
import { validateResources } from "../pipeline/validateResources";
import { PIPELINE_CONFIG } from "../pipeline/config";

const APP_DIR = path.resolve(__dirname, "../..");
const SNAPSHOT_TIME = "1970-01-01T00:00:00.000Z";

export interface UpstreamDiffRecord {
  id: string;
  title: string;
  url: string;
  normalizedUrl: string;
  language: Resource["language"];
  collection: Resource["collection"];
  category: string;
  subcategory?: string;
  type: Resource["type"];
  sourcePath: string;
  originalLine?: string;
}

export interface UpstreamChangedRecord {
  identity: string;
  changedFields: string[];
  before: UpstreamDiffRecord;
  after: UpstreamDiffRecord;
}

export interface PossibleReplacement {
  reason: "same-title-and-scope";
  removed: UpstreamDiffRecord;
  added: UpstreamDiffRecord;
}

export interface SnapshotDiagnostics {
  sourceDir: string;
  configuredFiles: number;
  parsedRecords: number;
  deduplicatedRecords: number;
  duplicateRecords: number;
  invalidRecords: number;
}

export interface UpstreamDiffResult {
  added: UpstreamDiffRecord[];
  removed: UpstreamDiffRecord[];
  changed: UpstreamChangedRecord[];
  possibleReplacements: PossibleReplacement[];
  diagnostics: {
    baseline: SnapshotDiagnostics;
    upstream: SnapshotDiagnostics;
    warnings: string[];
    blocked: boolean;
  };
}

interface LoadedSnapshot {
  records: Resource[];
  diagnostics: SnapshotDiagnostics;
}

interface CliOptions {
  upstreamDir: string;
  localDir: string;
  outputDir: string;
  baselineCommit: string;
  upstreamCommit: string;
  allowSuspicious: boolean;
}

const MEANINGFUL_FIELDS = [
  "title",
  "language",
  "collection",
  "category",
  "subcategory",
  "type",
  "sourcePath",
] as const;

function getArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function parseCliOptions(): CliOptions {
  const upstreamDir = getArgument("--upstream-dir");
  if (!upstreamDir) {
    throw new Error("--upstream-dir is required.");
  }

  return {
    upstreamDir: path.resolve(upstreamDir),
    localDir: path.resolve(getArgument("--local-dir") ?? PIPELINE_CONFIG.sourceDir),
    outputDir: path.resolve(
      getArgument("--output-dir") ?? path.join(APP_DIR, ".local-audit/upstream-diff"),
    ),
    baselineCommit: getArgument("--baseline-commit") ?? "unknown",
    upstreamCommit: getArgument("--upstream-commit") ?? "unknown",
    allowSuspicious: process.argv.includes("--allow-suspicious"),
  };
}

function toDiffRecord(resource: Resource): UpstreamDiffRecord {
  return {
    id: resource.id,
    title: resource.title,
    url: resource.url,
    normalizedUrl: normalizeUrlForDedupe(resource.url),
    language: resource.language,
    collection: resource.collection,
    category: resource.category,
    ...(resource.subcategory ? { subcategory: resource.subcategory } : {}),
    type: resource.type,
    sourcePath: resource.sourcePath,
    ...(resource.originalLine ? { originalLine: resource.originalLine } : {}),
  };
}

function compareMeaningfulFields(
  before: UpstreamDiffRecord,
  after: UpstreamDiffRecord,
): string[] {
  return MEANINGFUL_FIELDS.filter(
    (field) => (before[field] ?? null) !== (after[field] ?? null),
  );
}

function replacementKey(record: UpstreamDiffRecord): string {
  return [
    record.language,
    record.collection,
    record.title.replace(/\s+/g, " ").trim().toLocaleLowerCase(),
  ].join("|");
}

function sortByIdentity<T extends { normalizedUrl: string }>(records: T[]): T[] {
  return records.sort((a, b) => a.normalizedUrl.localeCompare(b.normalizedUrl));
}

export function buildUpstreamDiff(options: {
  baseline: LoadedSnapshot;
  upstream: LoadedSnapshot;
}): UpstreamDiffResult {
  const baselineByUrl = new Map(
    options.baseline.records.map((resource) => [
      normalizeUrlForDedupe(resource.url),
      toDiffRecord(resource),
    ]),
  );
  const upstreamByUrl = new Map(
    options.upstream.records.map((resource) => [
      normalizeUrlForDedupe(resource.url),
      toDiffRecord(resource),
    ]),
  );

  const added = sortByIdentity(
    [...upstreamByUrl.entries()]
      .filter(([identity]) => !baselineByUrl.has(identity))
      .map(([, record]) => record),
  );
  const removed = sortByIdentity(
    [...baselineByUrl.entries()]
      .filter(([identity]) => !upstreamByUrl.has(identity))
      .map(([, record]) => record),
  );
  const changed: UpstreamChangedRecord[] = [];

  for (const [identity, before] of baselineByUrl) {
    const after = upstreamByUrl.get(identity);
    if (!after) continue;
    const changedFields = compareMeaningfulFields(before, after);
    if (changedFields.length > 0) {
      changed.push({ identity, changedFields, before, after });
    }
  }
  changed.sort((a, b) => a.identity.localeCompare(b.identity));

  const additionsByTitle = new Map<string, UpstreamDiffRecord[]>();
  for (const record of added) {
    const key = replacementKey(record);
    additionsByTitle.set(key, [...(additionsByTitle.get(key) ?? []), record]);
  }
  const possibleReplacements: PossibleReplacement[] = [];
  for (const removedRecord of removed) {
    const candidates = additionsByTitle.get(replacementKey(removedRecord)) ?? [];
    if (candidates.length === 1) {
      possibleReplacements.push({
        reason: "same-title-and-scope",
        removed: removedRecord,
        added: candidates[0],
      });
    }
  }

  const warnings: string[] = [];
  const baselineCount = options.baseline.records.length;
  const upstreamCount = options.upstream.records.length;
  if (baselineCount > 0 && upstreamCount < baselineCount * 0.75) {
    warnings.push(
      `Upstream parsed record count fell from ${baselineCount} to ${upstreamCount}; ` +
        "automatic application must be blocked until the parser and source files are reviewed.",
    );
  }
  if (options.upstream.diagnostics.invalidRecords > 0) {
    warnings.push(
      `${options.upstream.diagnostics.invalidRecords} upstream record(s) failed validation.`,
    );
  }

  return {
    added,
    removed,
    changed,
    possibleReplacements,
    diagnostics: {
      baseline: options.baseline.diagnostics,
      upstream: options.upstream.diagnostics,
      warnings,
      blocked: warnings.length > 0,
    },
  };
}

async function loadSnapshot(sourceDir: string): Promise<LoadedSnapshot> {
  const parsed: Resource[] = [];

  for (const file of PIPELINE_CONFIG.inputFiles) {
    const fullPath = path.join(sourceDir, file.path);
    let markdown: string;
    try {
      markdown = await fs.readFile(fullPath, "utf8");
    } catch (error) {
      throw new Error(`Required source file is unavailable: ${fullPath}`, {
        cause: error,
      });
    }
    parsed.push(
      ...parseMarkdownResources({
        markdown,
        language: file.language,
        collection: file.collection,
        sourcePath: file.path,
        updatedAt: SNAPSHOT_TIME,
      }),
    );
  }

  const deduplicated = dedupeResources(parsed);
  const validation = validateResources(deduplicated);
  return {
    records: validation.valid,
    diagnostics: {
      sourceDir,
      configuredFiles: PIPELINE_CONFIG.inputFiles.length,
      parsedRecords: parsed.length,
      deduplicatedRecords: deduplicated.length,
      duplicateRecords: parsed.length - deduplicated.length,
      invalidRecords: validation.invalid.length,
    },
  };
}

function countByCollection(records: UpstreamDiffRecord[]): Record<string, number> {
  return records.reduce<Record<string, number>>((counts, record) => {
    counts[record.collection] = (counts[record.collection] ?? 0) + 1;
    return counts;
  }, {});
}

function markdownCollectionCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  return entries.length > 0
    ? entries.map(([name, count]) => `- ${name}: ${count}`).join("\n")
    : "- none";
}

function buildSummary(options: {
  result: UpstreamDiffResult;
  generatedAt: string;
  baselineCommit: string;
  upstreamCommit: string;
}): string {
  const { result } = options;
  return `# Upstream resource diff\n\n` +
    `Generated: ${options.generatedAt}\n\n` +
    `- DevLibrary baseline commit: \`${options.baselineCommit}\`\n` +
    `- EbookFoundation upstream commit: \`${options.upstreamCommit}\`\n` +
    `- Configured source files: ${result.diagnostics.upstream.configuredFiles}\n` +
    `- Added upstream: ${result.added.length}\n` +
    `- Removed upstream candidates: ${result.removed.length}\n` +
    `- Changed metadata: ${result.changed.length}\n` +
    `- Possible URL replacements: ${result.possibleReplacements.length}\n` +
    `- Safety status: ${result.diagnostics.blocked ? "BLOCKED" : "READY FOR LOCAL REVIEW"}\n\n` +
    `## Added by collection\n\n${markdownCollectionCounts(countByCollection(result.added))}\n\n` +
    `## Removed candidates by collection\n\n${markdownCollectionCounts(countByCollection(result.removed))}\n\n` +
    `## Diagnostics\n\n` +
    `- Baseline parsed/deduplicated: ${result.diagnostics.baseline.parsedRecords}/${result.diagnostics.baseline.deduplicatedRecords}\n` +
    `- Upstream parsed/deduplicated: ${result.diagnostics.upstream.parsedRecords}/${result.diagnostics.upstream.deduplicatedRecords}\n` +
    `- Upstream invalid: ${result.diagnostics.upstream.invalidRecords}\n` +
    `- Warnings: ${result.diagnostics.warnings.length}\n\n` +
    `This report is preview-only. An upstream removal is not an automatic deletion. ` +
    `Use a local AI agent and human review before changing DevLibrary data.\n`;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeReport(options: {
  outputDir: string;
  result: UpstreamDiffResult;
  generatedAt: string;
  baselineCommit: string;
  upstreamCommit: string;
}): Promise<void> {
  await fs.mkdir(options.outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(
      path.join(options.outputDir, "summary.md"),
      buildSummary(options),
      "utf8",
    ),
    writeJson(path.join(options.outputDir, "added.json"), {
      schemaVersion: 1,
      records: options.result.added,
    }),
    writeJson(path.join(options.outputDir, "removed.json"), {
      schemaVersion: 1,
      records: options.result.removed,
    }),
    writeJson(path.join(options.outputDir, "changed.json"), {
      schemaVersion: 1,
      records: options.result.changed,
      possibleReplacements: options.result.possibleReplacements,
    }),
    writeJson(path.join(options.outputDir, "diagnostics.json"), {
      schemaVersion: 1,
      ...options.result.diagnostics,
    }),
    writeJson(path.join(options.outputDir, "manifest.json"), {
      schemaVersion: 1,
      mode: "preview",
      generatedAt: options.generatedAt,
      sourceRepository: PIPELINE_CONFIG.sourceRepo,
      baselineCommit: options.baselineCommit,
      upstreamCommit: options.upstreamCommit,
      inputFiles: PIPELINE_CONFIG.inputFiles,
      counts: {
        added: options.result.added.length,
        removed: options.result.removed.length,
        changed: options.result.changed.length,
        possibleReplacements: options.result.possibleReplacements.length,
      },
      safety: {
        readOnly: true,
        blocked: options.result.diagnostics.blocked,
        canonicalDataModified: false,
      },
    }),
  ]);
}

async function main(): Promise<void> {
  const options = parseCliOptions();
  const [baseline, upstream] = await Promise.all([
    loadSnapshot(options.localDir),
    loadSnapshot(options.upstreamDir),
  ]);
  const result = buildUpstreamDiff({ baseline, upstream });
  const generatedAt = new Date().toISOString();
  await writeReport({
    outputDir: options.outputDir,
    result,
    generatedAt,
    baselineCommit: options.baselineCommit,
    upstreamCommit: options.upstreamCommit,
  });

  console.log(
    `[upstream-diff] added=${result.added.length} ` +
      `removed=${result.removed.length} changed=${result.changed.length} ` +
      `possibleReplacements=${result.possibleReplacements.length}`,
  );
  console.log(`[upstream-diff] report=${options.outputDir}`);
  if (result.diagnostics.blocked && !options.allowSuspicious) {
    throw new Error(
      "Safety diagnostics blocked automatic acceptance. Review the uploaded report.",
    );
  }
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isEntrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

