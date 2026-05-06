import type { Resource } from "../../lib/types/resource";

export function filterTargetLanguages(resources: Resource[]): Resource[] {
  return resources.filter(
    (resource) => resource.language === "zh" || resource.language === "en",
  );
}
