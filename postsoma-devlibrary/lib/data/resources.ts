import type { Resource, ResourceType, Difficulty } from "@/lib/types/resource";
import type { LearningPath, WeeklyPick } from "@/lib/types/learning-path";
import fs from "fs/promises";
import path from "path";

// This module is the single seam between the frontend and the static JSON data.
// All resource access goes through here.

// ─── Interactive Collection Type Normaliser ────────────────────────────────────
// Many resources inside the "interactive" collection carry stale upstream type
// tags (mostly "book") because they were assigned automatically during ingestion.
// This normaliser corrects them conservatively at the data-access layer so every
// downstream consumer (cards, drawers, TOC, search) sees correct semantics.
//
// Heuristics priority order:
//   1. URL domain signals  – strongest signal (explicit known domains)
//   2. URL path / title keywords  – secondary pattern matching
//   3. Collection-level fallback  – "book" inside interactive → "interactive"
//
// Non-interactive items (docs, tutorials) are preserved where appropriate.
// This function is ONLY applied to collection === "interactive".

const INTERACTIVE_DOMAINS: string[] = [
  // Coding games / gamified learning
  "codecombat.com", "codingfantasy.com", "flexboxdefense.com",
  "cssgridgarden.com", "flukeout.github.io", "knightsoftheflexboxtable.com",
  "regexcrossword.com", "codingbat.com", "jschallenger.com",
  "css-speedrun.netlify.app", "cmdchallenge.com", "overthewire.org",
  // Browser playgrounds, REPLs, live compilers
  "cpp.sh", "godbolt.org", "sharplab.io", "codapi.org", "jdoodle.com",
  "programiz.com", "mycompiler.io", "onlinegdb.com", "cffiddle.org",
  "trycf.com", "clojurescript.net", "tryclj.com", "tryerlang.org",
  "tryhaskell.org", "try.redis.io", "try.ocamlpro.com", "tryobjectivec.codeschool.com",
  "try.jquery.com", "tryapl.org", "tourofrust.com", "dtolnay.github.io",
  "code.labstack.com", "ide.codingblocks.com", "ide.codingminutes.com",
  "onecompiler.com", "scholarhat.com", "interviewbit.com",
  // Interactive explainers / visualisers
  "explainshell.com", "pythontutor.com", "visualgo.net",
  "algorithm-visualizer.org", "cs.usfca.edu",
  "onlywei.github.io", "poloclub.github.io", "transformer-explainer",
  // Koan / exercise repos / hands-on practice
  "rustlings", "rust-lang/rustlings", "sethvincent/javascripting",
  "git-game", "gazler/githug",
  "cdarwin/go-koans", "torbjoernk/CppKoans",
  "razetime.github.io", "abrudz.github.io",
  // Cloud labs / guided sandboxes
  "run.qwiklabs.com", "cloud.google.com/training/free-labs",
  // Runestone interactive textbooks
  "runestone.academy",
  // Select Stars / SQL practice
  "selectstarsql.com", "sqlteaching.com", "sqlbolt.com",
  // Other well-known interactive tools
  "scala-exercises.org", "futurecoder.io", "cscircles.cemc.uwaterloo.ca",
  "linuxjourney.com", "nodeschool.io", "exposnitc.github.io",
  "codecrafters.io", "4clojure.com", "markm208.github.io",
  "web.mit.edu/mprat", // Terminus terminal game
  "apd.ac.uk",
];

const INTERACTIVE_URL_KEYWORDS: string[] = [
  "playground", "sandbox", "lab", "simulator", "game",
  "challenge", "practice", "koans", "crossword", "fiddle",
  "exercise", "repl", "explainshell", "codingbat", "jschallenger",
  "visualizer", "visualization", "visualgo", "animation",
  "compiler", "try", "tryruby", "trygit", "qwiklabs", "codecombat",
  "codelabs", "free-labs", "pythontutor",
];

const INTERACTIVE_TITLE_KEYWORDS: string[] = [
  "playground", "sandbox", "lab", "simulator",
  "game", "challenge", "practice",
  "koan", "crossword", "fiddle", "exercise", "repl",
  "interactive", "visualizer", "visualisation", "visualization",
  "compiler", "explainer",
];

// Title/URL keyword signals that strongly indicate tutorial (keep as-is)
const TUTORIAL_KEYWORDS: string[] = [
  "tutorial", "course", "learn ", "learning", "beginners guide",
  "getting started", "intro to", "introduction to",
];

// Signals for documentation / reference (keep as docs)
const DOCS_KEYWORDS_URL: string[] = [
  "docs.", "/docs/", "/documentation", "/reference", "/wiki",
  "/guide/", "style-guide", "/api/", "/manual/",
];
const DOCS_KEYWORDS_TITLE: string[] = [
  "documentation", "reference", "style guide", "api reference", "cheatsheet", "cheat sheet",
];

function normalizeInteractiveType(r: Resource): Resource {
  // Only touch the interactive collection
  if (r.collection !== "interactive") return r;
  // Items already correctly typed as interactive, tutorial, docs – leave them
  if (r.type === "interactive" || r.type === "course") return r;

  const url   = r.url.toLowerCase();
  const title = r.title.toLowerCase();

  // ── 1. Docs / reference signals (highest precision – keep as documentation) ──
  const looksLikeDocs =
    DOCS_KEYWORDS_URL.some((k) => url.includes(k)) ||
    DOCS_KEYWORDS_TITLE.some((k) => title.includes(k));

  if (looksLikeDocs) {
    return { ...r, type: "documentation" as ResourceType };
  }

  // ── 2. Explicit interactive domain match ──────────────────────────────────────
  const domainMatch = INTERACTIVE_DOMAINS.some(
    (d) => url.includes(d.toLowerCase())
  );
  if (domainMatch) {
    return { ...r, type: "interactive" as ResourceType };
  }

  // ── 3. URL path / title keyword signals ──────────────────────────────────────
  const urlKeywordMatch  = INTERACTIVE_URL_KEYWORDS.some((k) => url.includes(k));
  const titleKeywordMatch = INTERACTIVE_TITLE_KEYWORDS.some((k) => title.includes(k));

  if (urlKeywordMatch || titleKeywordMatch) {
    return { ...r, type: "interactive" as ResourceType };
  }

  // ── 4. Tutorial signals – preserve as tutorial ────────────────────────────────
  const looksLikeTutorial = TUTORIAL_KEYWORDS.some((k) => url.includes(k) || title.includes(k));
  if (looksLikeTutorial) {
    return { ...r, type: "tutorial" as ResourceType };
  }

  // ── 5. Collection-level fallback: "book" inside interactive is always wrong ──
  if (r.type === "book") {
    return { ...r, type: "interactive" as ResourceType };
  }

  // Unknown / article types – leave unchanged
  return r;
}

function normalizeResourceType(r: Resource): Resource {
  // 1. Interactive collection type normalisation
  if (r.collection === "interactive") {
    r = normalizeInteractiveType(r);
  }
  // 2. Courses collection: book -> course
  else if (r.collection === "courses" && r.type === "book") {
    r = { ...r, type: "course" as ResourceType };
  }
  // 3. Cheat sheets collection: book -> documentation
  else if (r.collection === "cheat_sheets" && r.type === "book") {
    r = { ...r, type: "documentation" as ResourceType };
  }
  return r;
}

let cachedResources: Resource[] | null = null;

export async function getAllResources(): Promise<Resource[]> {
  if (cachedResources) {
    return cachedResources;
  }
  try {
    const filePath = path.join(process.cwd(), "public", "data", "resources.json");
    const fileContents = await fs.readFile(filePath, "utf8");
    const raw = JSON.parse(fileContents) as Resource[];
    // Apply conservative collection-level type normalisation at the data seam.
    cachedResources = raw.map(normalizeResourceType);
    return cachedResources;
  } catch (error) {
    console.error("Failed to read resources.json", error);
    // Return empty array if JSON hasn't been generated yet
    return [];
  }
}

export async function getResourceById(id: string): Promise<Resource | undefined> {
  const resources = await getAllResources();
  return resources.find((r) => r.id === id);
}

export async function getResourcesByLanguage(
  language: "zh" | "en",
): Promise<Resource[]> {
  const resources = await getAllResources();
  return resources.filter((r) => r.language === language);
}

export async function getAllCategories(): Promise<string[]> {
  const resources = await getAllResources();
  return [...new Set(resources.map((r) => r.category))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export async function getManifest() {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "manifest.json");
    const fileContents = await fs.readFile(filePath, "utf8");
    return JSON.parse(fileContents);
  } catch {
    return null;
  }
}

export async function getToc() {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "toc.json");
    const fileContents = await fs.readFile(filePath, "utf8");
    return JSON.parse(fileContents) as Record<string, any>; // Record<string, ResourceTocNode[]>
  } catch {
    return {};
  }
}

export async function getCollections() {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "collections.json");
    const fileContents = await fs.readFile(filePath, "utf8");
    return JSON.parse(fileContents) as { id: string; label: string; count: number }[];
  } catch {
    return [];
  }
}

// ─── Extended Curation / Reading APIs ──────────────────────────────────────────

export interface GetResourcesOptions {
  language?: "zh" | "en";
  difficulty?: Difficulty | "unrated";
}

export async function getResources(options: GetResourcesOptions = {}): Promise<Resource[]> {
  let resources = await getAllResources();
  
  if (options.language) {
    resources = resources.filter((r) => r.language === options.language);
  }
  
  if (options.difficulty) {
    if (options.difficulty === "unrated") {
      resources = resources.filter((r) => !r.difficulty);
    } else {
      resources = resources.filter((r) => r.difficulty === options.difficulty);
    }
  }
  
  return resources;
}

let cachedPaths: LearningPath[] | null = null;
let cachedWeekly: WeeklyPick[] | WeeklyPick | null = null;

export async function getLearningPaths(): Promise<LearningPath[]> {
  if (cachedPaths) {
    return cachedPaths;
  }
  try {
    const filePath = path.join(process.cwd(), "public", "data", "paths.json");
    const fileContents = await fs.readFile(filePath, "utf8");
    cachedPaths = JSON.parse(fileContents) as LearningPath[];
    return cachedPaths;
  } catch (error) {
    console.error("Failed to read paths.json", error);
    return [];
  }
}

export async function getLearningPathBySlug(slug: string): Promise<LearningPath | undefined> {
  const paths = await getLearningPaths();
  return paths.find((p) => p.slug === slug);
}

export async function getWeeklyPick(): Promise<WeeklyPick | null> {
  if (cachedWeekly) {
    return cachedWeekly as WeeklyPick;
  }
  try {
    const filePath = path.join(process.cwd(), "public", "data", "weekly.json");
    const fileContents = await fs.readFile(filePath, "utf8");
    cachedWeekly = JSON.parse(fileContents) as WeeklyPick;
    return cachedWeekly;
  } catch (error) {
    console.error("Failed to read weekly.json", error);
    return null;
  }
}
