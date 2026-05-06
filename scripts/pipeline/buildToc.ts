import type { Resource, ResourceTocNode, ResourceCollection } from "../../lib/types/resource";

export function buildResourceToc(resources: Resource[]): Record<string, Record<string, ResourceTocNode[]>> {
  // First, group resources by collection
  const collections = [...new Set(resources.map((r) => r.collection))];
  const tocByCollection: Record<string, Record<string, ResourceTocNode[]>> = {};

  const buildTree = (
    resList: Resource[],
    language: "zh" | "en" | "all",
  ): ResourceTocNode[] => {
    const rootMap = new Map<string, ResourceTocNode>();

    for (const res of resList) {
      if (!res.tocPath || res.tocPath.length === 0) continue;

      let currentMap = rootMap;
      let currentPath: string[] = [];

      for (let i = 0; i < res.tocPath.length; i++) {
        const segment = res.tocPath[i];
        currentPath = [...currentPath, segment];
        const id = `${language}:${currentPath.join(":")}`;

        if (!currentMap.has(segment)) {
          currentMap.set(segment, {
            id,
            label: segment,
            language,
            level: i + 1,
            path: [...currentPath],
            resourceCount: 0,
            children: [],
          });
        }

        const node = currentMap.get(segment)!;
        node.resourceCount++; // Increment count for this level
        
        // Use the children array as a map for the next level
        if (i < res.tocPath.length - 1) {
          // Temporarily attach a map property to the node for building
          if (!(node as any)._childrenMap) {
            (node as any)._childrenMap = new Map<string, ResourceTocNode>();
          }
          currentMap = (node as any)._childrenMap;
        }
      }
    }

    // Convert internal maps back to sorted arrays
    const convertMapToArray = (map: Map<string, ResourceTocNode>): ResourceTocNode[] => {
      const nodes = Array.from(map.values());
      for (const node of nodes) {
        if ((node as any)._childrenMap) {
          node.children = convertMapToArray((node as any)._childrenMap);
          delete (node as any)._childrenMap;
        }
      }
      return nodes.sort((a, b) => a.label.localeCompare(b.label));
    };

    return convertMapToArray(rootMap);
  };

  for (const collection of collections) {
    const colResources = resources.filter((r) => r.collection === collection);
    const zhTree = buildTree(colResources.filter((r) => r.language === "zh"), "zh");
    const enTree = buildTree(colResources.filter((r) => r.language === "en"), "en");
    const allTree = buildTree(colResources, "all");

    tocByCollection[collection] = {
      zh: zhTree,
      en: enTree,
      all: allTree,
    };
  }

  return tocByCollection;
}
