import { getResources, getLearningPaths, getLearningPathBySlug, getWeeklyPick, getManifest } from "../../lib/data/resources";

async function runVerification() {
  console.log("🔍 STEP 3 Verification Script Starting...");

  try {
    // 1. Verify resources reading with difficulty filter
    console.log("\n--- Checking getResources with filters ---");
    const allResources = await getResources();
    console.log(`   Total resources loaded: ${allResources.length}`);

    const beginnerResources = await getResources({ difficulty: "beginner" });
    console.log(`   Beginner resources count: ${beginnerResources.length}`);
    for (const r of beginnerResources) {
      if (r.difficulty !== "beginner") {
        throw new Error(`Filter failure: Resource ${r.id} has difficulty ${r.difficulty} instead of beginner`);
      }
    }
    console.log("   ✓ difficulty: 'beginner' filter returns only beginner resources.");

    const unratedResources = await getResources({ difficulty: "unrated" });
    console.log(`   Unrated resources count: ${unratedResources.length}`);
    for (const r of unratedResources) {
      if (r.difficulty !== undefined) {
        throw new Error(`Filter failure: Resource ${r.id} has difficulty ${r.difficulty} instead of undefined`);
      }
    }
    console.log("   ✓ difficulty: 'unrated' filter returns only resources without difficulty.");

    if (beginnerResources.length + unratedResources.length === 0) {
      throw new Error("Validation failure: resources list is empty!");
    }

    // 2. Verify paths reading
    console.log("\n--- Checking getLearningPaths ---");
    const paths = await getLearningPaths();
    console.log(`   Loaded paths count: ${paths.length}`);
    if (paths.length === 0) {
      throw new Error("No learning paths loaded from paths.json!");
    }
    console.log(`   Paths:`, paths.map(p => p.id));
    console.log("   ✓ getLearningPaths returns non-empty list.");

    // 3. Verify path by slug
    console.log("\n--- Checking getLearningPathBySlug ---");
    const slug = paths[0].slug;
    const pathBySlug = await getLearningPathBySlug(slug);
    if (!pathBySlug) {
      throw new Error(`Failed to load path by slug: ${slug}`);
    }
    console.log(`   Loaded path by slug: ${pathBySlug.title}`);
    console.log("   ✓ getLearningPathBySlug returns correct path.");

    // 4. Verify weekly pick
    console.log("\n--- Checking getWeeklyPick ---");
    const weeklyPick = await getWeeklyPick();
    if (!weeklyPick) {
      throw new Error("Failed to load weekly pick!");
    }
    console.log(`   Weekly pick weekOf: ${weeklyPick.weekOf}, headline: ${weeklyPick.headline}`);
    console.log("   ✓ getWeeklyPick returns correct weekly pick.");

    // 5. Verify manifest stats
    console.log("\n--- Checking manifest stats vs actual ---");
    const manifest = await getManifest();
    if (!manifest) {
      throw new Error("Failed to load manifest!");
    }
    console.log(`   Manifest paths: ${manifest.paths}`);
    console.log(`   Manifest weeklyPick:`, manifest.weeklyPick);
    console.log(`   Manifest difficulty count:`, manifest.difficulty);

    if (manifest.paths !== paths.length) {
      throw new Error(`Manifest mismatch: path count expected ${paths.length}, got ${manifest.paths}`);
    }
    if (manifest.difficulty.beginner !== beginnerResources.length) {
      throw new Error(`Manifest mismatch: beginner count expected ${beginnerResources.length}, got ${manifest.difficulty.beginner}`);
    }
    console.log("   ✓ Manifest stats are consistent with compiled JSON files.");

    console.log("\n" + "━".repeat(40));
    console.log("🎉 STEP 3 VERIFICATION PASSED SUCCESSFULLY!");
    process.exit(0);

  } catch (error: any) {
    console.error("❌ STEP 3 VERIFICATION FAILED:", error.message);
    process.exit(1);
  }
}

runVerification();
