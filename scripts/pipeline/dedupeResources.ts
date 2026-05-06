import type { Resource } from "../../lib/types/resource";

export function normalizeUrlForDedupe(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.hostname = url.hostname.toLowerCase();

    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_")) url.searchParams.delete(key);
    }

    // Sort remaining params for consistent comparison
    url.searchParams.sort();

    return url.toString().replace(/\/$/, "");
  } catch {
    return rawUrl.trim().replace(/\/$/, "");
  }
}

export function dedupeResources(resources: Resource[]): Resource[] {
  const seen = new Set<string>();
  const result: Resource[] = [];

  for (const resource of resources) {
    const key = normalizeUrlForDedupe(resource.url);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(resource);
  }

  return result;
}
