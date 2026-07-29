import fs from "node:fs";
import path from "node:path";
import { absoluteSiteUrl, SITE_URL } from "../lib/config/site";
import { buildLlmsFiles } from "../lib/seo/llms";
import { getSitemapIndexability } from "../lib/seo/sitemap-quality";
import type { Resource } from "../lib/types/resource";

const APP_DIR = path.resolve(__dirname, "..");
const OUT_DIR = path.join(APP_DIR, "out");
const DATA_DIR = path.join(APP_DIR, "public/data");

interface AuditFailure {
  page: string;
  message: string;
}

function read(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function metaContent(html: string, property: string, attribute: "name" | "property" = "name"): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<meta[^>]+${attribute}="${escaped}"[^>]+content="([^"]*)"`, "i"))?.[1] ?? null;
}

function canonical(html: string): string | null {
  return html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1] ?? null;
}

function hasValidJsonLd(html: string): boolean {
  const blocks = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  if (blocks.length === 0) return false;
  return blocks.every((block) => {
    try {
      JSON.parse(block[1]);
      return true;
    } catch {
      return false;
    }
  });
}

function expectedCanonical(pathname: string): string {
  return pathname === "/" ? SITE_URL : absoluteSiteUrl(pathname);
}

function auditIndexablePage(
  failures: AuditFailure[],
  page: string,
  filePath: string,
  pathname: string,
): void {
  if (!fs.existsSync(filePath)) {
    failures.push({ page, message: `Missing static output: ${filePath}` });
    return;
  }

  const html = read(filePath);
  const expected = expectedCanonical(pathname);
  if (!/<title>[^<]+<\/title>/i.test(html)) {
    failures.push({ page, message: "Missing title" });
  }
  if (!metaContent(html, "description")) {
    failures.push({ page, message: "Missing description" });
  }
  if (canonical(html) !== expected) {
    failures.push({ page, message: `Canonical must be ${expected}` });
  }
  if (metaContent(html, "og:url", "property") !== expected) {
    failures.push({ page, message: `og:url must be ${expected}` });
  }
  if (!metaContent(html, "og:title", "property") || !metaContent(html, "og:description", "property")) {
    failures.push({ page, message: "Missing Open Graph title or description" });
  }
  if (!hasValidJsonLd(html)) {
    failures.push({ page, message: "Missing or invalid JSON-LD" });
  }
  if (html.includes("https://205022.xyz")) {
    failures.push({ page, message: "Contains the redirecting apex domain" });
  }
}

function main(): void {
  if (!fs.existsSync(OUT_DIR)) {
    throw new Error('Build output is missing. Run "npm run build" first.');
  }

  const resources = JSON.parse(read(path.join(DATA_DIR, "resources.json"))) as Resource[];
  const manifest = JSON.parse(read(path.join(DATA_DIR, "manifest.json")));
  const collections = JSON.parse(read(path.join(DATA_DIR, "collections.json")));
  const failures: AuditFailure[] = [];

  auditIndexablePage(failures, "home", path.join(OUT_DIR, "index.html"), "/");
  auditIndexablePage(failures, "resources", path.join(OUT_DIR, "resources.html"), "/resources");
  auditIndexablePage(failures, "recommend", path.join(OUT_DIR, "recommend.html"), "/recommend");

  for (const resource of resources) {
    auditIndexablePage(
      failures,
      `resource/${resource.id}`,
      path.join(OUT_DIR, "resource", `${resource.id}.html`),
      `/resource/${resource.id}`,
    );
  }

  const sitemap = read(path.join(OUT_DIR, "sitemap.xml"));
  const robots = read(path.join(OUT_DIR, "robots.txt"));
  if (!sitemap.includes(SITE_URL) || sitemap.includes("https://205022.xyz")) {
    failures.push({ page: "sitemap.xml", message: "Sitemap must use only the canonical www host" });
  }
  if (!robots.includes(`${SITE_URL}/sitemap.xml`) || robots.includes("https://205022.xyz")) {
    failures.push({ page: "robots.txt", message: "Robots sitemap must use only the canonical www host" });
  }
  const expectedSitemapResources = resources
    .filter((resource) => getSitemapIndexability(resource).indexable)
    .map((resource) => absoluteSiteUrl(`/resource/${resource.id}`));
  const sitemapResourceUrls = [...sitemap.matchAll(/<loc>(https:\/\/www\.205022\.xyz\/resource\/[^<]+)<\/loc>/g)]
    .map((match) => match[1]);
  const expectedSitemapSet = new Set(expectedSitemapResources);
  const actualSitemapSet = new Set(sitemapResourceUrls);
  if (
    expectedSitemapSet.size !== actualSitemapSet.size ||
    [...expectedSitemapSet].some((url) => !actualSitemapSet.has(url))
  ) {
    failures.push({
      page: "sitemap.xml",
      message: "Resource URLs do not match the sitemap quality rule",
    });
  }

  const expectedLlms = buildLlmsFiles(manifest, collections);
  if (read(path.join(APP_DIR, "public/llms.txt")) !== expectedLlms.summary) {
    failures.push({ page: "llms.txt", message: "Does not match manifest-derived content" });
  }
  if (read(path.join(APP_DIR, "public/llms-full.txt")) !== expectedLlms.full) {
    failures.push({ page: "llms-full.txt", message: "Does not match manifest-derived content" });
  }

  const libraryHtml = read(path.join(OUT_DIR, "library.html"));
  if (!/name="robots" content="noindex, follow"/i.test(libraryHtml)) {
    failures.push({ page: "library", message: "Local-only library must remain noindex" });
  }

  const pathsHtml = path.join(OUT_DIR, "paths", "python-beginner.html");
  if (fs.existsSync(pathsHtml)) {
    const html = read(pathsHtml);
    if (!/name="robots" content="noindex, follow"/i.test(html)) {
      failures.push({ page: "paths/python-beginner", message: "Redirect page must remain noindex" });
    }
  }

  const summary = {
    canonicalHost: SITE_URL,
    resourcePagesChecked: resources.length,
    topLevelPagesChecked: 3,
    failures: failures.length,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (failures.length > 0) {
    for (const failure of failures.slice(0, 30)) {
      console.error(`✗ ${failure.page}: ${failure.message}`);
    }
    if (failures.length > 30) {
      console.error(`… ${failures.length - 30} additional failures omitted.`);
    }
    process.exit(1);
  }
  console.log("✓ SEO audit passed without writing any report files.");
}

main();
