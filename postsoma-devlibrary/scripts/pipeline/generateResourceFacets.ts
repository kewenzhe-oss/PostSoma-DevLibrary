import fs from "node:fs/promises";
import path from "node:path";
import type {
  CanonicalTopicId,
  Resource,
  ResourceFacetMetadata,
  ResourceLanguage,
  ResourceType,
} from "../../lib/types/resource";

const APP_DIR = path.resolve(__dirname, "../../");
const STAGING_DIR = path.join(APP_DIR, ".local-audit", "staging");
const RESOURCE_FILE = path.join(APP_DIR, "public", "data", "resources.json");
const OUTPUT_FILE = path.join(APP_DIR, "data", "resource-facets.json");

interface StagingRecord {
  existingProductionResourceId: string | null;
  collection: string;
  resourceType: ResourceType;
  lang: ResourceLanguage;
  canonicalTopic: CanonicalTopicId;
  subcategory: {
    id: string;
    labelEn: string;
    labelZh: string | null;
  } | null;
  reviewStatus: "pending" | "needs_review" | "approved" | "rejected";
}

interface StagingBatch {
  records?: StagingRecord[];
}

interface FacetSidecar {
  schemaVersion: "1.0.0";
  generatedAt: string;
  source: "local-staging-curated-preview";
  stats: {
    publicNonGitHubResources: number;
    mappedResources: number;
    coveragePercent: number;
    excludedNeedsReview: number;
    excludedAmbiguous: number;
  };
  records: Record<string, ResourceFacetMetadata>;
}

function facetSignature(record: StagingRecord): string {
  return JSON.stringify({
    canonicalTopic: record.canonicalTopic,
    subcategory: record.subcategory,
    language: record.lang,
    resourceType: record.resourceType,
  });
}

async function listBatchFiles(): Promise<string[]> {
  const entries = await fs.readdir(STAGING_DIR, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(STAGING_DIR, entry.name, "cleaned-records.json");
    try {
      await fs.access(candidate);
      files.push(candidate);
    } catch {
      // A staging folder without a cleaned-records file is not a batch input.
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

async function writeAtomically(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporaryPath, filePath);
}

async function main(): Promise<void> {
  const write = process.argv.includes("--write");
  const resources = JSON.parse(await fs.readFile(RESOURCE_FILE, "utf8")) as Resource[];
  const publicById = new Map(resources.map((resource) => [resource.id, resource]));
  const files = await listBatchFiles();
  const records: StagingRecord[] = [];

  for (const file of files) {
    const batch = JSON.parse(await fs.readFile(file, "utf8")) as StagingBatch;
    records.push(...(batch.records ?? []));
  }

  const excludedNeedsReview = records.filter(
    (record) => record.reviewStatus !== "pending" && record.reviewStatus !== "approved",
  ).length;
  const candidatesByResourceId = new Map<string, StagingRecord[]>();

  for (const record of records) {
    if (record.reviewStatus !== "pending" && record.reviewStatus !== "approved") continue;
    if (!record.existingProductionResourceId) continue;
    const resource = publicById.get(record.existingProductionResourceId);
    if (!resource || resource.collection === "github") continue;
    // The public URL de-duplicator may choose one collection as the surviving
    // identity. Never let a record from another collection overwrite it.
    if (record.collection !== resource.collection) continue;

    const bucket = candidatesByResourceId.get(resource.id) ?? [];
    bucket.push(record);
    candidatesByResourceId.set(resource.id, bucket);
  }

  const outputRecords: Record<string, ResourceFacetMetadata> = {};
  let excludedAmbiguous = 0;

  for (const [resourceId, candidates] of [...candidatesByResourceId.entries()].sort(
    ([a], [b]) => a.localeCompare(b),
  )) {
    const signatures = new Set(candidates.map(facetSignature));
    if (signatures.size !== 1) {
      excludedAmbiguous += 1;
      continue;
    }

    const record = candidates[0]!;
    outputRecords[resourceId] = {
      canonicalTopic: record.canonicalTopic,
      subcategory: record.subcategory
        ? {
            id: record.subcategory.id,
            labelEn: record.subcategory.labelEn,
            labelZh: record.subcategory.labelZh,
          }
        : null,
      language: record.lang,
      resourceType: record.resourceType,
      reviewStatus: record.reviewStatus === "approved" ? "approved" : "pending",
    };
  }

  const publicNonGitHubResources = resources.filter(
    (resource) => resource.collection !== "github",
  ).length;
  const mappedResources = Object.keys(outputRecords).length;
  const sidecar: FacetSidecar = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    source: "local-staging-curated-preview",
    stats: {
      publicNonGitHubResources,
      mappedResources,
      coveragePercent: Number(
        ((mappedResources / publicNonGitHubResources) * 100).toFixed(2),
      ),
      excludedNeedsReview,
      excludedAmbiguous,
    },
    records: outputRecords,
  };

  console.log(
    `Resource facets: ${mappedResources}/${publicNonGitHubResources} mapped ` +
      `(${sidecar.stats.coveragePercent}%), ${excludedAmbiguous} ambiguous IDs excluded.`,
  );

  if (!write) {
    console.log("Preview only. Re-run with --write to update data/resource-facets.json.");
    return;
  }

  await writeAtomically(OUTPUT_FILE, sidecar);
  console.log(`Wrote ${path.relative(APP_DIR, OUTPUT_FILE)} atomically.`);
}

main().catch((error) => {
  console.error("Failed to generate resource facets:", error);
  process.exitCode = 1;
});
