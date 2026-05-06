import path from "node:path";

// Source files are in the parent directory (free-programming-books repo root)
const REPO_ROOT = path.resolve(__dirname, "../../../");

import type { ResourceLanguage, ResourceCollection } from "../../lib/types/resource";

export const PIPELINE_CONFIG = {
  sourceRepo: "https://github.com/EbookFoundation/free-programming-books.git",
  sourceDir: REPO_ROOT,
  targetLanguages: ["zh", "en"] as ResourceLanguage[],
  inputFiles: [
    {
      collection: "books" as ResourceCollection,
      language: "zh" as ResourceLanguage,
      path: "books/free-programming-books-zh.md",
    },
    {
      collection: "books" as ResourceCollection,
      language: "en" as ResourceLanguage,
      path: "books/free-programming-books-langs.md",
    },
    {
      collection: "books" as ResourceCollection,
      language: "en" as ResourceLanguage,
      path: "books/free-programming-books-subjects.md",
    },
    {
      collection: "cheat_sheets" as ResourceCollection,
      language: "en" as ResourceLanguage,
      path: "more/free-programming-cheatsheets.md",
    },
    {
      collection: "courses" as ResourceCollection,
      language: "en" as ResourceLanguage,
      path: "courses/free-courses-en.md",
    },
    {
      collection: "courses" as ResourceCollection,
      language: "zh" as ResourceLanguage,
      path: "courses/free-courses-zh.md",
    },
    {
      collection: "interactive" as ResourceCollection,
      language: "en" as ResourceLanguage,
      path: "more/free-programming-interactive-tutorials-en.md",
    },
    {
      collection: "interactive" as ResourceCollection,
      language: "en" as ResourceLanguage,
      path: "more/free-programming-playgrounds.md",
    },
    {
      collection: "interactive" as ResourceCollection,
      language: "zh" as ResourceLanguage,
      path: "more/free-programming-interactive-tutorials-zh.md",
    },
    {
      collection: "interactive" as ResourceCollection,
      language: "zh" as ResourceLanguage,
      path: "more/free-programming-playgrounds-zh.md",
    },
  ],
  outputFiles: {
    all: "public/data/resources.json",
    zh: "public/data/resources.zh.json",
    en: "public/data/resources.en.json",
    categories: "public/data/categories.json",
    collections: "public/data/collections.json",
    manifest: "public/data/manifest.json",
    toc: "public/data/toc.json",
  },
};
