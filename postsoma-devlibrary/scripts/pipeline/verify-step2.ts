import fs from "node:fs";
import path from "node:path";
import type { Resource } from "../../lib/types/resource";
import type { LearningPath, WeeklyPick } from "../../lib/types/learning-path";

const APP_DIR = path.resolve(__dirname, "../../");
const REPO_ROOT = path.resolve(__dirname, "../../../");

function runVerification() {
  console.log("🔍 STEP 2 Verification Script Starting...");
  console.log(`REPO_ROOT: ${REPO_ROOT}`);
  console.log(`APP_DIR: ${APP_DIR}`);

  // 1. Verify JSON file paths
  const difficultyPath = path.join(REPO_ROOT, "data/overlays/difficulty.json");
  const pathFilePath = path.join(REPO_ROOT, "data/paths/python-beginner.json");
  const weeklyPath = path.join(REPO_ROOT, "data/picks/weekly.json");
  const resourcesPath = path.join(APP_DIR, "public/data/resources.json");

  let hasErrors = false;

  // Helper to load and parse JSON safely
  function loadJson(filePath: string): any {
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        hasErrors = true;
        return null;
      }
      const content = fs.readFileSync(filePath, "utf8");
      return JSON.parse(content);
    } catch (e: any) {
      console.error(`❌ Failed to parse JSON at ${filePath}:`, e.message);
      hasErrors = true;
      return null;
    }
  }

  // Load resources.json for referential integrity checks
  const resources: Resource[] = loadJson(resourcesPath) || [];
  const resourceIdsSet = new Set(resources.map((r) => r.id));
  console.log(`✅ Loaded ${resources.length} resources from compiled output.`);

  // Validate difficulty.json
  console.log("\n--- Checking difficulty.json ---");
  const difficultyData = loadJson(difficultyPath);
  if (difficultyData) {
    if (difficultyData.version !== 1) {
      console.error(`❌ Invalid difficulty.json version: expected 1, got ${difficultyData.version}`);
      hasErrors = true;
    }
    if (typeof difficultyData.resources !== "object" || difficultyData.resources === null) {
      console.error(`❌ difficulty.json 'resources' field is not an object.`);
      hasErrors = true;
    } else {
      for (const [id, diff] of Object.entries(difficultyData.resources)) {
        if (diff !== "beginner" && diff !== "intermediate" && diff !== "advanced") {
          console.error(`❌ Invalid difficulty value for ID ${id}: ${diff}`);
          hasErrors = true;
        }
        if (!resourceIdsSet.has(id)) {
          console.warn(`⚠️ Warning: resource ID ${id} in difficulty.json does not exist in resources.json`);
        }
      }
      console.log(`✅ difficulty.json has ${Object.keys(difficultyData.resources).length} mapped resources.`);
    }
  }

  // Validate python-beginner.json
  console.log("\n--- Checking python-beginner.json ---");
  const learningPath: LearningPath = loadJson(pathFilePath);
  if (learningPath) {
    const requiredPathFields: (keyof LearningPath)[] = ["id", "slug", "title", "summary", "language", "difficulty", "tags", "audience", "estimatedTotal", "steps", "updatedAt"];
    for (const f of requiredPathFields) {
      if (!(f in learningPath)) {
        console.error(`❌ Missing field in LearningPath: ${f}`);
        hasErrors = true;
      }
    }
    if (learningPath.difficulty !== "beginner" && learningPath.difficulty !== "intermediate" && learningPath.difficulty !== "advanced") {
      console.error(`❌ Invalid learning path difficulty: ${learningPath.difficulty}`);
      hasErrors = true;
    }
    if (!Array.isArray(learningPath.steps)) {
      console.error(`❌ 'steps' is not an array in LearningPath`);
      hasErrors = true;
    } else {
      learningPath.steps.forEach((step, index) => {
        const requiredStepFields = ["id", "title", "description", "estimatedTime", "difficulty", "resourceIds"];
        for (const sf of requiredStepFields) {
          if (!(sf in step)) {
            console.error(`❌ Step index ${index} missing field: ${sf}`);
            hasErrors = true;
          }
        }
        if (!Array.isArray(step.resourceIds)) {
          console.error(`❌ Step index ${index} 'resourceIds' is not an array`);
          hasErrors = true;
        } else {
          step.resourceIds.forEach((rid) => {
            if (!resourceIdsSet.has(rid)) {
              console.error(`❌ Reference Integrity Error: Path step resourceId '${rid}' does not exist in compiled resources.`);
              hasErrors = true;
            } else {
              console.log(`   ✓ Resource ID '${rid}' reference found in compiled resources.`);
            }
          });
        }
      });
    }
    console.log("✅ python-beginner.json schema check complete.");
  }

  // Validate weekly.json
  console.log("\n--- Checking weekly.json ---");
  const weeklyPick: WeeklyPick = loadJson(weeklyPath);
  if (weeklyPick) {
    const requiredWeeklyFields: (keyof WeeklyPick)[] = ["weekOf", "headline", "items"];
    for (const f of requiredWeeklyFields) {
      if (!(f in weeklyPick)) {
        console.error(`❌ Missing field in WeeklyPick: ${f}`);
        hasErrors = true;
      }
    }
    if (!Array.isArray(weeklyPick.items)) {
      console.error(`❌ 'items' is not an array in WeeklyPick`);
      hasErrors = true;
    } else {
      weeklyPick.items.forEach((item, index) => {
        if (!item.reason) {
          console.error(`❌ Item index ${index} missing 'reason'`);
          hasErrors = true;
        }
        if (item.resourceId) {
          if (!resourceIdsSet.has(item.resourceId)) {
            console.error(`❌ Reference Integrity Error: Weekly item resourceId '${item.resourceId}' does not exist in compiled resources.`);
            hasErrors = true;
          } else {
            console.log(`   ✓ Resource ID '${item.resourceId}' reference found in compiled resources.`);
          }
        }
        if (item.pathId) {
          if (item.pathId !== learningPath.id) {
            console.warn(`⚠️ Warning: Weekly item pathId '${item.pathId}' is not the loaded path ID '${learningPath.id}'.`);
          } else {
            console.log(`   ✓ Path ID '${item.pathId}' match found.`);
          }
        }
        if (!item.resourceId && !item.pathId) {
          console.error(`❌ Item index ${index} has neither 'resourceId' nor 'pathId'`);
          hasErrors = true;
        }
      });
    }
    console.log("✅ weekly.json schema check complete.");
  }

  // Check backward compatibility of old resources
  console.log("\n--- Checking backward compatibility ---");
  const testResource: Resource = resources[0];
  if (testResource) {
    console.log(`   ✓ Existing resource '${testResource.title}' loaded.`);
    const difficultyIsSafe = testResource.difficulty === undefined;
    const editorNoteIsSafe = testResource.editorNote === undefined;
    if (difficultyIsSafe && editorNoteIsSafe) {
      console.log(`✅ Old resources safely return undefined for difficulty and editorNote.`);
    } else {
      console.warn(`⚠️ Warning: test resource has difficulty or editorNote already defined.`);
    }
  }

  console.log("\n" + "━".repeat(40));
  if (hasErrors) {
    console.error("❌ STEP 2 VERIFICATION FAILED!");
    process.exit(1);
  } else {
    console.log("🎉 STEP 2 VERIFICATION PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

runVerification();
