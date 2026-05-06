import fs from "node:fs/promises";
import path from "node:path";
import { PIPELINE_CONFIG } from "./config";
import { parseMarkdownResources } from "./parseMarkdown";
import { filterTargetLanguages } from "./filterLanguages";
import { dedupeResources } from "./dedupeResources";
import { validateResources } from "./validateResources";
import { buildResourceToc } from "./buildToc";
import type { Resource } from "../../lib/types/resource";

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
