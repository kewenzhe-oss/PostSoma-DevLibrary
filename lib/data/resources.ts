import type { Resource } from "@/lib/types/resource";
import fs from "fs/promises";
import path from "path";

// This module is the single seam between the frontend and the static JSON data.
// All resource access goes through here.

export async function getAllResources(): Promise<Resource[]> {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "resources.json");
    const fileContents = await fs.readFile(filePath, "utf8");
    return JSON.parse(fileContents) as Resource[];
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
