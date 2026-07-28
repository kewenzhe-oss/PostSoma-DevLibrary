import path from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import type {
  GitHubFavoriteBelongsTo,
} from "../../lib/types/github-curation";
import type { ResourceType } from "../../lib/types/resource";
import {
  executeGitHubFavoriteMutation,
  loadGitHubFavoriteWorkspace,
  planAddGitHubFavorite,
  planReviewGitHubFavorite,
  type AddGitHubFavoriteInput,
  type GitHubFavoriteMutationPlan,
  type GitHubFavoriteWorkspacePaths,
  type ReviewGitHubFavoriteInput,
} from "./githubFavoriteLocal";

function getArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function getArguments(name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index++) {
    if (process.argv[index] !== name) continue;
    const value = process.argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${name} requires a value.`);
    }
    values.push(value);
  }
  return values;
}

function getListArguments(
  singularName: string,
  commaSeparatedName: string,
): string[] {
  return [
    ...getArguments(singularName),
    ...getArguments(commaSeparatedName).flatMap((value) =>
      value.split(","),
    ),
  ]
    .map((value) => value.trim())
    .filter(Boolean);
}

function getWorkspacePaths(): GitHubFavoriteWorkspacePaths {
  return {
    inputPath: path.resolve(
      getArgument("--input") ?? "data/github-favorites.json",
    ),
    publicOutputPath: path.resolve(
      getArgument("--public-output") ??
        "public/data/github-favorites.json",
    ),
    curationPath: path.resolve(
      getArgument("--curation") ??
        "data/github-favorite-curation.json",
    ),
    resourcesPath: path.resolve(
      getArgument("--resources") ?? "public/data/resources.json",
    ),
  };
}

function printHelp(): void {
  console.log(`
Local-first GitHub favorite manager

Add (dry-run by default):
  npm run github:add -- --url <github-repo> --why-saved <text>
    [--title <text>] [--summary <text>]
    [--capability <value>] [--capabilities <a,b>]
    [--stack <value>] [--tech-stack <a,b>]
    [--personal-note <text>] [--topic <text>]
    [--resource-type <type>] [--reviewed]
    [--belongs-to devlibrary|agent-skills-hub]
    [--related-learning-id <id>] [--relation-note <text>]
    [--boundary-reason <text>] [--write] [--yes]

Mark a real review (dry-run by default):
  npm run github:review -- (--id <favorite-id> | --url <github-repo>)
    [--personal-note <text>] [--why-saved <text>]
    [--write] [--yes]

Safety:
  --dry-run is optional because preview-only is the default.
  --write prints the same field-level preview, then asks for confirmation.
  --yes skips the prompt only when the write was already explicitly requested.
`);
}

function formatValue(value: unknown): string {
  if (value === undefined) return "(unset)";
  return JSON.stringify(value);
}

function printPlan(plan: GitHubFavoriteMutationPlan, write: boolean): void {
  console.log(
    `[github-favorites] ${write ? "WRITE PREVIEW" : "DRY RUN"} · ` +
      `${plan.operation}`,
  );
  console.log(`Target ID: ${plan.target.id}`);
  console.log(`Title: ${plan.target.title}`);
  console.log(`Repository: ${plan.target.githubUrl}`);
  console.log("Changes:");
  for (const change of plan.changes) {
    console.log(
      `  ${change.field}: ${formatValue(change.previous)} -> ` +
        `${formatValue(change.next)}`,
    );
  }
  if (plan.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of plan.warnings) console.log(`  ! ${warning}`);
  }
  console.log(
    "Canonical mirrors: data/github-favorites.json + " +
      "public/data/github-favorites.json",
  );
  if (plan.curationChanged) {
    console.log(
      "Manual curation sidecar will change only because explicit " +
        "curation flags were provided.",
    );
  } else {
    console.log("Manual curation sidecar will not change.");
  }
}

function buildAddInput(): AddGitHubFavoriteInput {
  const resourceType = getArgument("--resource-type") as
    | ResourceType
    | undefined;
  const belongsTo = getArgument("--belongs-to") as
    | GitHubFavoriteBelongsTo
    | undefined;
  if (
    belongsTo !== undefined &&
    belongsTo !== "devlibrary" &&
    belongsTo !== "agent-skills-hub"
  ) {
    throw new Error(
      "--belongs-to must be devlibrary or agent-skills-hub.",
    );
  }

  return {
    githubUrl: getArgument("--url") ?? "",
    whySaved: getArgument("--why-saved") ?? "",
    title: getArgument("--title"),
    shortSummary: getArgument("--summary"),
    capabilities: getListArguments(
      "--capability",
      "--capabilities",
    ),
    techStack: getListArguments("--stack", "--tech-stack"),
    personalNote: getArgument("--personal-note"),
    topic: getArgument("--topic"),
    resourceType,
    reviewed: process.argv.includes("--reviewed"),
    belongsTo,
    relatedLearningResourceIds: getArguments(
      "--related-learning-id",
    ),
    relationNote: getArgument("--relation-note"),
    boundaryReason: getArgument("--boundary-reason"),
  };
}

function buildReviewInput(): ReviewGitHubFavoriteInput {
  return {
    id: getArgument("--id"),
    githubUrl: getArgument("--url"),
    personalNote: getArgument("--personal-note"),
    whySaved: getArgument("--why-saved"),
  };
}

async function confirmWrite(): Promise<boolean> {
  if (!process.stdin.isTTY) {
    throw new Error(
      "Interactive confirmation is unavailable. Review the dry-run, then " +
        "use --write --yes for an intentional non-interactive write.",
    );
  }
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = await prompt.question(
      "Write these exact changes to local static data? [y/N] ",
    );
    return answer.trim().toLocaleLowerCase() === "y";
  } finally {
    prompt.close();
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--help")) {
    printHelp();
    return;
  }
  const operation = process.argv[2];
  if (operation !== "add" && operation !== "review") {
    throw new Error("Operation must be add or review. Use --help.");
  }
  const write = process.argv.includes("--write");
  const explicitDryRun = process.argv.includes("--dry-run");
  const yes = process.argv.includes("--yes");
  if (write && explicitDryRun) {
    throw new Error("--write and --dry-run cannot be used together.");
  }
  if (yes && !write) {
    throw new Error("--yes is only valid together with --write.");
  }

  const paths = getWorkspacePaths();
  const workspace = await loadGitHubFavoriteWorkspace(paths);
  const now = new Date().toISOString();
  const plan =
    operation === "add"
      ? planAddGitHubFavorite({
          workspace,
          input: buildAddInput(),
          now,
        })
      : planReviewGitHubFavorite({
          workspace,
          input: buildReviewInput(),
          now,
        });

  printPlan(plan, write);
  const result = await executeGitHubFavoriteMutation({
    plan,
    paths,
    write,
    confirmWrite: yes ? async () => true : confirmWrite,
  });

  if (result.status === "dry-run") {
    console.log(
      "Dry-run complete. No files were written. Re-run the same command " +
        "with --write after reviewing this preview.",
    );
    return;
  }
  if (result.status === "cancelled") {
    console.log("Write cancelled. No files were changed.");
    return;
  }

  console.log(
    `Write complete: ${result.filesWritten.length} local file(s) replaced ` +
      "with rollback protection.",
  );
  console.log("Next steps:");
  for (const step of plan.nextSteps) console.log(`  - ${step}`);
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

