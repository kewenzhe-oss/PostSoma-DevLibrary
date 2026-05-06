import path from "node:path";

// Source files are in the parent directory (free-programming-books repo root)
const REPO_ROOT = path.resolve(__dirname, "../../");

export const PIPELINE_CONFIG = {
  sourceRepo: "https://github.com/EbookFoundation/free-programming-books.git",
  sourceDir: REPO_ROOT,
  targetLanguages: ["zh", "en"] as const,
  inputFiles: {
    zh: ["books/free-programming-books-zh.md"],
    en: [
      "books/free-programming-books-langs.md",
      "books/free-programming-books-subjects.md",
    ],
  },
  outputFiles: {
    all: "public/data/resources.json",
    zh: "public/data/resources.zh.json",
    en: "public/data/resources.en.json",
    categories: "public/data/categories.json",
    manifest: "public/data/manifest.json",
  },
};
