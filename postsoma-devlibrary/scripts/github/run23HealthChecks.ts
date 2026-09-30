import fs from "node:fs/promises";
import path from "node:path";
import {
  checkGitHubFavoriteHealth,
} from "./checkGithubHealth";
import {
  loadGitHubFavoritesCollection,
  validateGitHubFavoritesCollection,
} from "../../lib/data/github-favorites";
import type { GitHubFavoritesCollection } from "../../lib/types/github-favorite";

async function main() {
  const dataPath = path.resolve("data/github-favorites.json");
  const publicPath = path.resolve("public/data/github-favorites.json");

  const collection = await loadGitHubFavoritesCollection(dataPath);

  // Identify the 23 items with lastCheckedAt === null
  const targetRecords = collection.records.filter(
    (record) => record.lastCheckedAt === null,
  );

  console.log(`Found ${targetRecords.length} records requiring health check.`);
  if (targetRecords.length === 0) {
    console.log("No unchecked records found.");
    return;
  }

  targetRecords.forEach((r, idx) => {
    console.log(`[${idx + 1}/${targetRecords.length}] ${r.id} - ${r.title} (${r.githubUrl})`);
  });

  const subCollection: GitHubFavoritesCollection = {
    ...collection,
    records: targetRecords,
  };

  console.log("\nStarting health check for 23 repositories (concurrency 2)...");
  const checkedSubCollection = await checkGitHubFavoriteHealth({
    collection: subCollection,
    quietDays: 180,
    concurrency: 2,
  });

  const checkedMap = new Map(
    checkedSubCollection.records.map((r) => [r.id, r] as const),
  );

  // Merge back into canonical collection
  const updatedRecords = collection.records.map((favorite) => {
    const checked = checkedMap.get(favorite.id);
    if (checked) {
      return checked;
    }
    return favorite;
  });

  const nextCollection: GitHubFavoritesCollection = {
    ...collection,
    records: updatedRecords,
  };

  const validationErrors = validateGitHubFavoritesCollection(nextCollection);
  if (validationErrors.length > 0) {
    throw new Error(
      `Updated collection failed schema validation:\n- ${validationErrors.join("\n- ")}`,
    );
  }

  const serialized = `${JSON.stringify(nextCollection, null, 2)}\n`;
  await Promise.all([
    fs.writeFile(dataPath, serialized, "utf8"),
    fs.writeFile(publicPath, serialized, "utf8"),
  ]);

  console.log(`\nHealth check successfully applied to ${targetRecords.length} records.`);
  console.log("Health results breakdown for this batch:");
  const counts = checkedSubCollection.records.reduce<Record<string, number>>(
    (acc, cur) => {
      acc[cur.health] = (acc[cur.health] ?? 0) + 1;
      return acc;
    },
    {},
  );
  console.log(JSON.stringify(counts, null, 2));

  console.log("\nDetails:");
  checkedSubCollection.records.forEach((r) => {
    console.log(
      `- ${r.title} (${r.id}): health=${r.health}, lastCheckedAt=${r.lastCheckedAt}, lastPushedAt=${r.lastPushedAt}, archived=${r.githubArchived}`,
    );
  });
}

main().catch((err) => {
  console.error("Health check execution failed:", err);
  process.exit(1);
});
