import crypto from "node:crypto";
import type { Resource, ResourceLanguage } from "../../lib/types/resource";

interface ParseMarkdownInput {
  markdown: string;
  language: ResourceLanguage;
  sourcePath: string;
  updatedAt: string;
}

function createResourceId(input: {
  language: ResourceLanguage;
  title: string;
  url: string;
}): string {
  return crypto
    .createHash("sha256")
    .update(`${input.language}:${input.title}:${input.url}`)
    .digest("hex")
    .slice(0, 16);
}

function inferResourceType(title: string, url: string): Resource["type"] {
  const text = `${title} ${url}`.toLowerCase();
  if (
    text.includes("docs") ||
    text.includes("documentation") ||
    text.includes("manual") ||
    text.includes("reference")
  )
    return "documentation";
  if (
    text.includes("course") ||
    text.includes("learn") ||
    text.includes("tutorial") ||
    text.includes("教程") ||
    text.includes("入门") ||
    text.includes("指南")
  )
    return "tutorial";
  if (text.includes("interactive") || text.includes("playground"))
    return "interactive";
  if (text.includes("article") || text.includes("blog")) return "article";
  return "book";
}

// Skip lines that are index/TOC entries or HTML anchors
function isResourceLine(line: string): boolean {
  return /^[-*]\s+\[([^\]]+)\]\((https?:\/\/[^)]+)\)/.test(line);
}

export function parseMarkdownResources(input: ParseMarkdownInput): Resource[] {
  const resources: Resource[] = [];
  let category = "Uncategorized";
  let subcategory: string | undefined;

  for (const rawLine of input.markdown.split("\n")) {
    const line = rawLine.trim();

    // ## Category heading
    if (line.startsWith("## ")) {
      category = line.replace(/^##\s+/, "").trim();
      subcategory = undefined;
      continue;
    }

    // ### Subcategory heading
    if (line.startsWith("### ")) {
      subcategory = line.replace(/^###\s+/, "").trim();
      continue;
    }

    // #### deeper subcategory — keep current subcategory
    if (line.startsWith("#### ")) {
      subcategory = line.replace(/^####\s+/, "").trim();
      continue;
    }

    // Resource line: * [Title](https://url) - optional metadata
    if (!isResourceLine(line)) continue;

    const match = line.match(/^[-*]\s+\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
    if (!match) continue;

    const [, title, url] = match;
    const cleanTitle = title.trim();
    const cleanUrl = url.trim();

    if (!cleanTitle || !cleanUrl) continue;

    resources.push({
      id: createResourceId({
        language: input.language,
        title: cleanTitle,
        url: cleanUrl,
      }),
      title: cleanTitle,
      url: cleanUrl,
      language: input.language,
      category,
      subcategory,
      type: inferResourceType(cleanTitle, cleanUrl),
      tags: [category, subcategory].filter(Boolean) as string[],
      quality: "unchecked",
      source: "free-programming-books",
      sourcePath: input.sourcePath,
      originalLine: rawLine,
      updatedAt: input.updatedAt,
    });
  }

  return resources;
}
