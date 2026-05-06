import type { Resource } from "../../lib/types/resource";

export interface ValidationResult {
  valid: Resource[];
  invalid: Array<{ resource: Resource; reason: string }>;
}

export function validateResources(resources: Resource[]): ValidationResult {
  const valid: Resource[] = [];
  const invalid: ValidationResult["invalid"] = [];

  for (const resource of resources) {
    if (!resource.id) {
      invalid.push({ resource, reason: "missing id" });
      continue;
    }
    if (!resource.title.trim()) {
      invalid.push({ resource, reason: "missing title" });
      continue;
    }
    if (!/^https?:\/\//.test(resource.url)) {
      invalid.push({ resource, reason: "invalid url" });
      continue;
    }
    if (resource.language !== "zh" && resource.language !== "en") {
      invalid.push({ resource, reason: "unsupported language" });
      continue;
    }
    if (!resource.category.trim()) {
      invalid.push({ resource, reason: "missing category" });
      continue;
    }
    valid.push(resource);
  }

  return { valid, invalid };
}
