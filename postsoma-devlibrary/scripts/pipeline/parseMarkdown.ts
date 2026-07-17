import crypto from "node:crypto";
import type { Resource, ResourceLanguage, ResourceCollection } from "../../lib/types/resource";

export interface ParseMarkdownInput {
  markdown: string;
  language: ResourceLanguage;
  collection: ResourceCollection;
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

export function normalizeMarkdownHeading(rawHeading: string): string {
  return rawHeading
    .replace(/<a\s+id="[^"]+"><\/a>/gi, "")
    .replace(/<a\s+name="[^"]+"><\/a>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/#+\s*$/, "")
    .trim();
}

export function parseMarkdownResources(input: ParseMarkdownInput): Resource[] {
  const resources: Resource[] = [];
  let headingStack: string[] = [];

  for (const rawLine of input.markdown.split("\n")) {
    const line = rawLine.trim();

    const headingMatch = line.match(/^(#{2,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const rawText = headingMatch[2].trim();
      headingStack[level] = normalizeMarkdownHeading(rawText);
      // Clear deeper levels
      headingStack.splice(level + 1);
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

    const activeHeadings = headingStack.filter(Boolean);
    const root = activeHeadings[0] || "Uncategorized";
    const section = activeHeadings[1];
    const subsection = activeHeadings[2];

    resources.push({
      id: createResourceId({
        language: input.language,
        title: cleanTitle,
        url: cleanUrl,
      }),
      title: cleanTitle,
      url: cleanUrl,
      language: input.language,
      collection: input.collection,
      category: root,
      subcategory: section,
      taxonomy: { root, section, subsection },
      tocPath: activeHeadings.slice(0, 3), // max 3 levels deep
      type: inferResourceType(cleanTitle, cleanUrl),
      tags: activeHeadings.slice(0, 2),
      quality: "unchecked",
      source: "free-programming-books",
      sourcePath: input.sourcePath,
      originalLine: rawLine,
      updatedAt: input.updatedAt,
    });
  }

  return resources;
}
