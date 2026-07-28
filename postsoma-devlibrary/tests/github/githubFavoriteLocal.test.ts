import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { githubFavoriteToResource } from "../../lib/data/github-favorites";
import type {
  GitHubFavorite,
  GitHubFavoritesCollection,
} from "../../lib/types/github-favorite";
import type {
  GitHubFavoriteCurationCollection,
} from "../../lib/types/github-curation";
import type { Resource } from "../../lib/types/resource";
import {
  executeGitHubFavoriteMutation,
  loadGitHubFavoriteWorkspace,
  planAddGitHubFavorite,
  planReviewGitHubFavorite,
  writeFilesWithRollback,
  type GitHubFavoriteWorkspace,
  type GitHubFavoriteWorkspacePaths,
} from "../../scripts/github/githubFavoriteLocal";

const now = "2026-07-28T18:30:00.000Z";
const temporaryDirectories: string[] = [];

function makeFavorite(
  overrides: Partial<GitHubFavorite> = {},
): GitHubFavorite {
  return {
    id: "favorite-1",
    githubUrl: "https://github.com/example/existing",
    title: "Existing",
    shortSummary: "Existing summary.",
    capabilities: ["RAG"],
    techStack: ["TypeScript"],
    personalNote: "Existing note.",
    whySaved: "Existing reason.",
    discoveredAt: "2026-04-12T08:00:00.000Z",
    lastReviewedAt: "2026-04-12T08:00:00.000Z",
    health: "quiet",
    lastCheckedAt: "2026-07-27T12:00:00.000Z",
    lastPushedAt: "2025-01-01T00:00:00.000Z",
    githubArchived: false,
    githubDisabled: false,
    editorial: {
      topic: "AI",
      resourceType: "app",
      quality: "standard",
      fullSummary: "Existing full summary.",
    },
    ...overrides,
  };
}

function makeResource(
  id: string,
  collection: Resource["collection"] = "books",
): Resource {
  return {
    id,
    title: id,
    url: "https://example.com/resource",
    language: "en",
    collection,
    category: "Testing",
    type: collection === "courses" ? "course" : "book",
    tags: [],
    quality: "standard",
    source: "free-programming-books",
    sourcePath: "test",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeWorkspace(
  records: GitHubFavorite[] = [makeFavorite()],
): GitHubFavoriteWorkspace {
  return {
    collection: {
      schemaVersion: 1,
      migratedAt: "2026-04-12T09:00:00.000Z",
      source: "github-content-library.csv",
      records,
    },
    curation: {
      schemaVersion: 1,
      updatedAt: "2026-04-12T09:00:00.000Z",
      source: "manual-curation",
      records: [],
    },
    resources: [
      makeResource("book-1"),
      makeResource("course-1", "courses"),
    ],
  };
}

async function makeTemporaryWorkspace(
  workspace = makeWorkspace(),
): Promise<GitHubFavoriteWorkspacePaths> {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "postsoma-github-favorite-"),
  );
  temporaryDirectories.push(directory);
  const paths = {
    inputPath: path.join(directory, "data", "github-favorites.json"),
    publicOutputPath: path.join(
      directory,
      "public",
      "data",
      "github-favorites.json",
    ),
    curationPath: path.join(
      directory,
      "data",
      "github-favorite-curation.json",
    ),
    resourcesPath: path.join(
      directory,
      "public",
      "data",
      "resources.json",
    ),
  };
  const collectionJson = `${JSON.stringify(workspace.collection, null, 2)}\n`;
  await Promise.all([
    fs.mkdir(path.dirname(paths.inputPath), { recursive: true }),
    fs.mkdir(path.dirname(paths.publicOutputPath), { recursive: true }),
  ]);
  await Promise.all([
    fs.writeFile(paths.inputPath, collectionJson),
    fs.writeFile(paths.publicOutputPath, collectionJson),
    fs.writeFile(
      paths.curationPath,
      `${JSON.stringify(workspace.curation, null, 2)}\n`,
    ),
    fs.writeFile(
      paths.resourcesPath,
      `${JSON.stringify(workspace.resources, null, 2)}\n`,
    ),
  ]);
  return paths;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("local-first GitHub favorite additions", () => {
  it("creates an honest unverified record with a real local discovery timestamp", () => {
    const workspace = makeWorkspace();
    const plan = planAddGitHubFavorite({
      workspace,
      now,
      input: {
        githubUrl:
          "https://github.com/NewOwner/NewRepo/tree/main/examples",
        whySaved: "Compare its local-first architecture.",
        capabilities: ["RAG", "rag", " Automation "],
        techStack: ["TypeScript"],
      },
    });
    const added = plan.nextCollection.records.at(-1)!;

    expect(added).toMatchObject({
      githubUrl: "https://github.com/NewOwner/NewRepo",
      title: "NewOwner / NewRepo",
      whySaved: "Compare its local-first architecture.",
      capabilities: ["RAG", "Automation"],
      techStack: ["TypeScript"],
      personalNote: "",
      discoveredAt: now,
      discoveredAtSource: "local-entry",
      lastReviewedAt: null,
      health: "active",
      lastCheckedAt: null,
      lastPushedAt: null,
      githubArchived: null,
      githubDisabled: null,
      editorial: {
        quality: "unchecked",
        fullSummary: "",
      },
    });
    expect(added).not.toHaveProperty("lastReviewedAtSource");
    expect(plan.warnings.join(" ")).toContain("unverified");
    expect(workspace.collection.records).toHaveLength(1);

    const resource = githubFavoriteToResource(
      added,
      "2026-07-01T00:00:00.000Z",
    );
    expect(resource).toMatchObject({
      id: added.id,
      url: added.githubUrl,
      collection: "github",
      quality: "unchecked",
      createdAt: now,
    });
  });

  it("sets a review timestamp only after an explicit reviewed declaration", () => {
    const plan = planAddGitHubFavorite({
      workspace: makeWorkspace(),
      now,
      input: {
        githubUrl: "https://github.com/example/reviewed-on-entry",
        whySaved: "I tested this before saving it.",
        reviewed: true,
      },
    });

    expect(plan.nextCollection.records.at(-1)).toMatchObject({
      discoveredAt: now,
      discoveredAtSource: "local-entry",
      lastReviewedAt: now,
      lastReviewedAtSource: "manual-review",
    });
  });

  it("rejects invalid and duplicate repository URLs, including deep links", () => {
    const workspace = makeWorkspace();

    expect(() =>
      planAddGitHubFavorite({
        workspace,
        now,
        input: {
          githubUrl: "https://example.com/not-github",
          whySaved: "Invalid.",
        },
      }),
    ).toThrow("must be an HTTPS repository URL");

    expect(() =>
      planAddGitHubFavorite({
        workspace,
        now,
        input: {
          githubUrl:
            "https://github.com/example/existing/blob/main/README.md",
          whySaved: "Duplicate.",
        },
      }),
    ).toThrow("already saved as favorite-1");
  });

  it("adds manual curation only from explicit, valid user input", () => {
    const plan = planAddGitHubFavorite({
      workspace: makeWorkspace(),
      now,
      input: {
        githubUrl: "https://github.com/example/learning-reference",
        whySaved: "Use after the course.",
        belongsTo: "devlibrary",
        relatedLearningResourceIds: ["course-1"],
        relationNote: "Read after completing the course.",
      },
    });

    expect(plan.curationChanged).toBe(true);
    expect(plan.nextCuration.records.at(-1)).toEqual({
      favoriteId: plan.target.id,
      belongsTo: "devlibrary",
      relatedLearningResourceIds: ["course-1"],
      relationNote: "Read after completing the course.",
    });
  });

  it("warns about Agent Skills Hub-shaped repositories without auto-routing", () => {
    const workspace = makeWorkspace();
    const plan = planAddGitHubFavorite({
      workspace,
      now,
      input: {
        githubUrl: "https://github.com/example/example-mcp",
        whySaved: "Hold for a manual product-boundary decision.",
      },
    });

    expect(plan.warnings.join(" ")).toContain(
      "Consider Agent Skills Hub",
    );
    expect(plan.curationChanged).toBe(false);
    expect(plan.nextCuration).toBe(workspace.curation);
  });
});

describe("explicit GitHub favorite review operations", () => {
  it("updates only review provenance and user-submitted editorial fields", () => {
    const original = makeFavorite();
    const workspace = makeWorkspace([original]);
    const plan = planReviewGitHubFavorite({
      workspace,
      now,
      input: {
        githubUrl:
          "https://github.com/example/existing/tree/main/examples",
        personalNote: "Tested the examples locally.",
      },
    });
    const reviewed = plan.nextCollection.records[0];

    expect(reviewed).toEqual({
      ...original,
      personalNote: "Tested the examples locally.",
      lastReviewedAt: now,
      lastReviewedAtSource: "manual-review",
    });
    expect(plan.nextCuration).toBe(workspace.curation);
    expect(workspace.collection.records[0]).toEqual(original);
  });

  it("rejects missing targets and ambiguous target arguments", () => {
    const workspace = makeWorkspace();

    expect(() =>
      planReviewGitHubFavorite({
        workspace,
        now,
        input: { id: "missing" },
      }),
    ).toThrow("was not found");

    expect(() =>
      planReviewGitHubFavorite({
        workspace,
        now,
        input: {
          id: "favorite-1",
          githubUrl: "https://github.com/example/existing",
        },
      }),
    ).toThrow("exactly one review target");
  });
});

describe("local mutation safety", () => {
  it("leaves both static copies byte-identical and unchanged in dry-run", async () => {
    const paths = await makeTemporaryWorkspace();
    const workspace = await loadGitHubFavoriteWorkspace(paths);
    const before = await fs.readFile(paths.inputPath, "utf8");
    const plan = planAddGitHubFavorite({
      workspace,
      now,
      input: {
        githubUrl: "https://github.com/example/dry-run",
        whySaved: "Preview this addition.",
      },
    });

    await expect(
      executeGitHubFavoriteMutation({
        plan,
        paths,
        write: false,
      }),
    ).resolves.toEqual({ status: "dry-run" });
    await expect(fs.readFile(paths.inputPath, "utf8")).resolves.toBe(before);
    await expect(fs.readFile(paths.publicOutputPath, "utf8")).resolves.toBe(
      before,
    );
  });

  it("does not write when explicit confirmation is declined", async () => {
    const paths = await makeTemporaryWorkspace();
    const workspace = await loadGitHubFavoriteWorkspace(paths);
    const before = await fs.readFile(paths.inputPath, "utf8");
    const plan = planReviewGitHubFavorite({
      workspace,
      now,
      input: { id: "favorite-1" },
    });

    await expect(
      executeGitHubFavoriteMutation({
        plan,
        paths,
        write: true,
        confirmWrite: async () => false,
      }),
    ).resolves.toEqual({ status: "cancelled" });
    await expect(fs.readFile(paths.inputPath, "utf8")).resolves.toBe(before);
    await expect(fs.readFile(paths.publicOutputPath, "utf8")).resolves.toBe(
      before,
    );
  });

  it("atomically keeps canonical/public copies identical after a confirmed write", async () => {
    const paths = await makeTemporaryWorkspace();
    const workspace = await loadGitHubFavoriteWorkspace(paths);
    const plan = planAddGitHubFavorite({
      workspace,
      now,
      input: {
        githubUrl: "https://github.com/example/confirmed",
        whySaved: "Confirmed local fixture.",
      },
    });

    const result = await executeGitHubFavoriteMutation({
      plan,
      paths,
      write: true,
      confirmWrite: async () => true,
    });
    const [canonicalRaw, publicRaw, reloaded] = await Promise.all([
      fs.readFile(paths.inputPath, "utf8"),
      fs.readFile(paths.publicOutputPath, "utf8"),
      loadGitHubFavoriteWorkspace(paths),
    ]);

    expect(result.status).toBe("written");
    expect(publicRaw).toBe(canonicalRaw);
    expect(reloaded.collection.records).toHaveLength(2);
    expect(reloaded.collection.records.at(-1)?.id).toBe(plan.target.id);
  });

  it("refuses mutation when canonical and public inputs already differ", async () => {
    const paths = await makeTemporaryWorkspace();
    const publicValue = JSON.parse(
      await fs.readFile(paths.publicOutputPath, "utf8"),
    ) as GitHubFavoritesCollection;
    publicValue.records[0].title = "Drifted public title";
    await fs.writeFile(
      paths.publicOutputPath,
      `${JSON.stringify(publicValue, null, 2)}\n`,
    );

    await expect(loadGitHubFavoriteWorkspace(paths)).rejects.toThrow(
      "Canonical and public GitHub favorite copies differ",
    );
  });

  it("restores prior files if a later atomic replacement fails", async () => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), "postsoma-github-rollback-"),
    );
    temporaryDirectories.push(directory);
    const firstPath = path.join(directory, "first.json");
    const invalidSecondPath = path.join(directory, "existing-directory");
    await fs.writeFile(firstPath, "original\n");
    await fs.mkdir(invalidSecondPath);

    await expect(
      writeFilesWithRollback([
        { filePath: firstPath, content: "replacement\n" },
        { filePath: invalidSecondPath, content: "cannot replace directory\n" },
      ]),
    ).rejects.toThrow();
    await expect(fs.readFile(firstPath, "utf8")).resolves.toBe(
      "original\n",
    );
  });
});
