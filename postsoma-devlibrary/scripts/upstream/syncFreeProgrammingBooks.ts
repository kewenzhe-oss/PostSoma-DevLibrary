import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

// In the current architecture, the source repo IS the workspace.
// This script is maintained for completeness and CI environments
// where we might need to explicitly pull the latest changes before running the pipeline.

const REPO_ROOT = path.resolve(__dirname, "../../../");

async function syncUpstream() {
  console.log("🔄 Syncing upstream free-programming-books data...");
  console.log(`Target directory: ${REPO_ROOT}`);

  try {
    // Check if it's a git repo
    const gitDir = path.join(REPO_ROOT, ".git");
    const isGitRepo = await fs
      .stat(gitDir)
      .then((s) => s.isDirectory())
      .catch(() => false);

    if (isGitRepo) {
      console.log("Found existing git repository. Pulling latest changes...");
      execSync("git pull --ff-only", { cwd: REPO_ROOT, stdio: "inherit" });
      console.log("✅ Successfully pulled latest changes.");
    } else {
      console.log("Not a git repository. Skipping sync.");
      console.log(
        "Note: In production CI, this step should checkout the repo.",
      );
    }
  } catch (error) {
    console.error("❌ Failed to sync upstream:", error);
    process.exit(1);
  }
}

syncUpstream();
