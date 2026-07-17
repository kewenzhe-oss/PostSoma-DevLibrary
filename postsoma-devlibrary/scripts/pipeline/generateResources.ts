import fs from "node:fs/promises";
import path from "node:path";
import { PIPELINE_CONFIG } from "./config";
import { parseMarkdownResources } from "./parseMarkdown";
import { filterTargetLanguages } from "./filterLanguages";
import { dedupeResources } from "./dedupeResources";
import { validateResources } from "./validateResources";
import { buildResourceToc } from "./buildToc";
import type { Resource, Difficulty } from "../../lib/types/resource";
import type { LearningPath, WeeklyPick } from "../../lib/types/learning-path";
import { loadAndTransformGitHubCsv } from "./transformCsv";

// Resolve paths relative to the postsoma-devlibrary app directory
const APP_DIR = path.resolve(__dirname, "../../");

async function readSourceFile(filePath: string): Promise<string> {
  const fullPath = path.join(PIPELINE_CONFIG.sourceDir, filePath);
  return fs.readFile(fullPath, "utf8");
}

async function writeJson(relPath: string, data: unknown): Promise<void> {
  const fullPath = path.join(APP_DIR, relPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function buildCategories(resources: Resource[]) {
  return [...new Set(resources.map((r) => r.category))]
    .sort((a, b) => a.localeCompare(b))
    .map((category) => ({
      name: category,
      count: resources.filter((r) => r.category === category).length,
    }));
}

async function main() {
  console.log("🔄 PostSoma DevLibrary — Content Pipeline");
  console.log("━".repeat(50));

  const updatedAt = new Date().toISOString();
  const parsed: Resource[] = [];
  let totalRead = 0;

  for (const fileConfig of PIPELINE_CONFIG.inputFiles) {
    console.log(`📖 Reading ${fileConfig.path} (${fileConfig.collection} - ${fileConfig.language})...`);
    try {
      const markdown = await readSourceFile(fileConfig.path);
      const resources = parseMarkdownResources({
        markdown,
        language: fileConfig.language,
        collection: fileConfig.collection,
        sourcePath: fileConfig.path,
        updatedAt,
      });
      console.log(`   → ${resources.length} resources parsed`);
      totalRead += resources.length;
      parsed.push(...resources);
    } catch (err) {
      console.error(`   ✗ Failed to read ${fileConfig.path}:`, err);
    }
  }

  console.log(`\n📂 Loading GitHub Content Library CSV...`);
  try {
    const csvPath = path.join(PIPELINE_CONFIG.sourceDir, "github-content-library.csv");
    const githubResources = await loadAndTransformGitHubCsv(csvPath);
    totalRead += githubResources.length;
    parsed.push(...githubResources);
  } catch (err) {
    console.error("❌ Failed to parse GitHub CSV:", err);
  }

  console.log(`\n📊 Pipeline stages:`);
  console.log(`   Raw parsed:     ${totalRead}`);

  const filtered = filterTargetLanguages(parsed);
  console.log(`   After filter:   ${filtered.length}`);

  const beforeDedupe = filtered.length;
  const deduped = dedupeResources(filtered);
  console.log(
    `   After dedupe:   ${deduped.length} (removed ${beforeDedupe - deduped.length} duplicates)`,
  );

  const { valid, invalid } = validateResources(deduped);
  console.log(
    `   After validate: ${valid.length} valid, ${invalid.length} invalid`,
  );

  // Load and apply difficulty overlay
  const difficultyOverlayPath = path.join(PIPELINE_CONFIG.sourceDir, "data/overlays/difficulty.json");
  const difficultyCount = { beginner: 0, intermediate: 0, advanced: 0, unrated: 0 };
  
  try {
    const overlayRaw = await fs.readFile(difficultyOverlayPath, "utf8");
    const overlayData = JSON.parse(overlayRaw);
    if (overlayData && overlayData.resources) {
      console.log(`\n🏷️ Applying difficulty overlay from ${difficultyOverlayPath}...`);
      for (const resource of valid) {
        const diff = overlayData.resources[resource.id] as Difficulty | undefined;
        if (diff) {
          resource.difficulty = diff;
          if (diff === "beginner" || diff === "intermediate" || diff === "advanced") {
            difficultyCount[diff]++;
          }
        } else {
          difficultyCount.unrated++;
        }
      }
      console.log(`   ✓ Mapped difficulty: beginner=${difficultyCount.beginner}, intermediate=${difficultyCount.intermediate}, advanced=${difficultyCount.advanced}, unrated=${difficultyCount.unrated}`);
    }
  } catch (err: any) {
    console.warn(`⚠️ Warning: Failed to load difficulty overlay (it might not exist yet):`, err.message);
    difficultyCount.unrated = valid.length;
  }

  // Load, validate and compile learning paths
  console.log(`\n🛣️ Compiling learning paths...`);
  const pathsDir = path.join(PIPELINE_CONFIG.sourceDir, "data/paths");
  const compiledPaths: LearningPath[] = [];
  const resourceIdsSet = new Set(valid.map((r) => r.id));

  try {
    const pathFiles = await fs.readdir(pathsDir);
    for (const file of pathFiles) {
      if (!file.endsWith(".json")) continue;
      const fullPath = path.join(pathsDir, file);
      const content = await fs.readFile(fullPath, "utf8");
      const pathObj = JSON.parse(content) as LearningPath;
      
      // Reference integrity check
      for (const step of pathObj.steps || []) {
        for (const rid of step.resourceIds || []) {
          if (!resourceIdsSet.has(rid)) {
            const errorMsg = `❌ Reference Integrity Error: Learning path '${pathObj.id}' references resource '${rid}' in step '${step.id}' but it does not exist in the compiled resources!`;
            console.error(errorMsg);
            throw new Error(errorMsg);
          }
        }
      }
      compiledPaths.push(pathObj);
      console.log(`   ✓ Path '${pathObj.id}' compiled successfully with ${pathObj.steps?.length || 0} steps.`);
    }
  } catch (err: any) {
    console.error("❌ Failed compiling learning paths:", err.message);
    throw err;
  }

  // Load, validate and compile weekly picks
  console.log(`\n📅 Compiling weekly picks...`);
  const weeklyPickPath = path.join(PIPELINE_CONFIG.sourceDir, "data/picks/weekly.json");
  let weeklyPickObj: WeeklyPick | null = null;

  try {
    const content = await fs.readFile(weeklyPickPath, "utf8");
    weeklyPickObj = JSON.parse(content) as WeeklyPick;
    
    // Reference integrity check
    for (const item of weeklyPickObj.items || []) {
      if (item.resourceId && !resourceIdsSet.has(item.resourceId)) {
        const errorMsg = `❌ Reference Integrity Error: Weekly pick references resource '${item.resourceId}' but it does not exist in the compiled resources!`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      if (item.pathId && !compiledPaths.some((p) => p.id === item.pathId)) {
        const errorMsg = `❌ Reference Integrity Error: Weekly pick references path '${item.pathId}' but it was not compiled!`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
    }
    console.log(`   ✓ Weekly picks for '${weeklyPickObj.weekOf}' compiled successfully.`);
  } catch (err: any) {
    console.error("❌ Failed compiling weekly picks:", err.message);
    throw err;
  }

  const zh = valid.filter((r) => r.language === "zh");
  const en = valid.filter((r) => r.language === "en");
  const categories = buildCategories(valid);
  const topCategories = [...categories]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  console.log(`\n💾 Writing output files...`);

  await writeJson(PIPELINE_CONFIG.outputFiles.all, valid);
  console.log(`   ✓ resources.json (${valid.length} total)`);

  await writeJson(PIPELINE_CONFIG.outputFiles.zh, zh);
  console.log(`   ✓ resources.zh.json (${zh.length} Chinese)`);

  await writeJson(PIPELINE_CONFIG.outputFiles.en, en);
  console.log(`   ✓ resources.en.json (${en.length} English)`);

  await writeJson(PIPELINE_CONFIG.outputFiles.categories, categories);
  console.log(`   ✓ categories.json (${categories.length} categories)`);

  const collectionsData = [...new Set(valid.map((r) => r.collection))].map((c) => ({
    id: c,
    label: c.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    count: valid.filter((r) => r.collection === c).length,
  }));
  await writeJson(PIPELINE_CONFIG.outputFiles.collections, collectionsData);
  console.log(`   ✓ collections.json (${collectionsData.length} collections)`);

  const toc = buildResourceToc(valid);
  await writeJson(PIPELINE_CONFIG.outputFiles.toc, toc);
  console.log(`   ✓ toc.json (${Object.keys(toc).length} collections in TOC)`);

  // Write paths and weekly picks output
  await writeJson(PIPELINE_CONFIG.outputFiles.paths, compiledPaths);
  console.log(`   ✓ paths.json (${compiledPaths.length} paths)`);

  await writeJson(PIPELINE_CONFIG.outputFiles.weekly, weeklyPickObj);
  console.log(`   ✓ weekly.json (weekly picks)`);

  const manifest = {
    generatedAt: updatedAt,
    sourceRepo: PIPELINE_CONFIG.sourceRepo,
    total: valid.length,
    valid: valid.length,
    invalid: invalid.length,
    duplicatesRemoved: beforeDedupe - deduped.length,
    languages: {
      zh: zh.length,
      en: en.length,
    },
    collections: Object.fromEntries(
      collectionsData.map((c) => [c.id, c.count])
    ),
    categories: Object.fromEntries(
      categories.map((c) => [c.name, c.count]),
    ),
    topCategories,
    difficulty: difficultyCount,
    paths: compiledPaths.length,
    weeklyPick: weeklyPickObj ? { weekOf: weeklyPickObj.weekOf } : null,
  };

  await writeJson(PIPELINE_CONFIG.outputFiles.manifest, manifest);
  console.log(`   ✓ manifest.json`);

  console.log(`\n✅ Pipeline complete!`);
  console.log(`   Total resources: ${valid.length}`);
  console.log(`   Chinese: ${zh.length} | English: ${en.length}`);
  console.log(`   Invalid skipped: ${invalid.length}`);
  console.log(`\nTop categories:`);
  for (const cat of topCategories.slice(0, 5)) {
    console.log(`   ${cat.name}: ${cat.count}`);
  }
}

main().catch((error) => {
  console.error("Pipeline failed:", error);
  process.exit(1);
});
