import type { Resource } from "@/lib/types/resource";

// This module is the single seam between the frontend and the static JSON data.
// All resource access goes through here.

let _cache: Resource[] | null = null;

export async function getAllResources(): Promise<Resource[]> {
  if (_cache) return _cache;

  try {
    // Dynamic import for server-side usage — reads from public/data/resources.json
    const { default: data } = await import("@/public/data/resources.json");
    _cache = data as Resource[];
    return _cache;
  } catch {
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
    const { default: manifest } = await import("@/public/data/manifest.json");
    return manifest;
  } catch {
    return null;
  }
}
