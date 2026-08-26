import type {
  CanonicalTopicId,
  Resource,
  ResourceLanguage,
  ResourceType,
} from "@/lib/types/resource";

export interface ResourceFacetSelection {
  topics: CanonicalTopicId[];
  subcategories: string[];
  languages: ResourceLanguage[];
  resourceTypes: ResourceType[];
}

export interface ResourceFacetOption<T extends string = string> {
  value: T;
  labelEn: string;
  labelZh: string | null;
  count: number;
}

export interface ResourceFacetModel {
  topics: ResourceFacetOption<CanonicalTopicId>[];
  subcategories: ResourceFacetOption[];
  languages: ResourceFacetOption<ResourceLanguage>[];
  resourceTypes: ResourceFacetOption<ResourceType>[];
  classifiedCount: number;
}

export const CANONICAL_TOPIC_LABELS: ReadonlyArray<{
  id: CanonicalTopicId;
  en: string;
  zh: string;
}> = [
  { id: "cs-foundations", en: "CS Foundations", zh: "计算机科学基础" },
  { id: "programming-languages", en: "Programming Languages", zh: "编程语言" },
  { id: "web-development", en: "Web Development", zh: "Web 开发" },
  { id: "mobile-development", en: "Mobile Development", zh: "移动开发" },
  { id: "embedded-iot-robotics", en: "Embedded, IoT & Robotics", zh: "嵌入式、物联网与机器人" },
  { id: "ai-data-science", en: "AI & Data Science", zh: "人工智能与数据科学" },
  { id: "databases-data-engineering", en: "Databases & Data", zh: "数据库与数据工程" },
  { id: "cloud-devops-sre", en: "Cloud, DevOps & SRE", zh: "云计算、DevOps 与 SRE" },
  { id: "systems-networking", en: "Systems & Networking", zh: "系统与网络" },
  { id: "cybersecurity-privacy", en: "Security & Privacy", zh: "网络安全与隐私" },
  { id: "software-engineering", en: "Software Engineering", zh: "软件工程" },
  { id: "developer-tools-automation", en: "Developer Tools", zh: "开发工具与自动化" },
  { id: "graphics-design-games", en: "Graphics, Design & Games", zh: "图形、设计与游戏开发" },
  { id: "blockchain-web3", en: "Blockchain & Web3", zh: "区块链与 Web3" },
  { id: "career-professional", en: "Career & Practice", zh: "职业与专业实践" },
  { id: "general-meta", en: "General & Meta", zh: "综合与元资源" },
];

const TOPIC_LABEL_BY_ID = new Map(
  CANONICAL_TOPIC_LABELS.map((topic) => [topic.id, topic] as const),
);

const RESOURCE_TYPE_LABELS: Partial<Record<ResourceType, string>> = {
  book: "Book",
  course: "Course",
  tutorial: "Tutorial",
  documentation: "Documentation",
  interactive: "Interactive",
  article: "Article",
  app: "App",
  library: "Library",
  framework: "Framework",
  cli: "CLI",
  collection: "Collection",
  extension: "Extension",
  unknown: "Other",
};

type FacetDimension = keyof ResourceFacetSelection;

function resourceValue(resource: Resource, dimension: FacetDimension): string | null {
  if (dimension === "topics") return resource.facet?.canonicalTopic ?? null;
  if (dimension === "subcategories") return resource.facet?.subcategory?.id ?? null;
  if (dimension === "languages") return resource.facet?.language ?? resource.language;
  return resource.facet?.resourceType ?? resource.type;
}

export function resourceMatchesFacetSelection(
  resource: Resource,
  selection: ResourceFacetSelection,
  ignore?: FacetDimension,
): boolean {
  const dimensions: FacetDimension[] = [
    "topics",
    "subcategories",
    "languages",
    "resourceTypes",
  ];

  return dimensions.every((dimension) => {
    if (dimension === ignore) return true;
    const selected = selection[dimension] as string[];
    if (selected.length === 0) return true;
    const value = resourceValue(resource, dimension);
    return value !== null && selected.includes(value);
  });
}

export function filterResourcesByFacets(
  resources: Resource[],
  selection: ResourceFacetSelection,
): Resource[] {
  return resources.filter((resource) =>
    resourceMatchesFacetSelection(resource, selection),
  );
}

function countValues(
  resources: Resource[],
  selection: ResourceFacetSelection,
  dimension: FacetDimension,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const resource of resources) {
    if (!resourceMatchesFacetSelection(resource, selection, dimension)) continue;
    const value = resourceValue(resource, dimension);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

export function buildResourceFacetModel(
  resources: Resource[],
  selection: ResourceFacetSelection,
): ResourceFacetModel {
  const topicCounts = countValues(resources, selection, "topics");
  const subcategoryCounts = countValues(resources, selection, "subcategories");
  const languageCounts = countValues(resources, selection, "languages");
  const resourceTypeCounts = countValues(resources, selection, "resourceTypes");

  const subcategoryLabels = new Map<
    string,
    { labelEn: string; labelZh: string | null }
  >();
  for (const resource of resources) {
    const subcategory = resource.facet?.subcategory;
    if (subcategory && !subcategoryLabels.has(subcategory.id)) {
      subcategoryLabels.set(subcategory.id, {
        labelEn: subcategory.labelEn,
        labelZh: subcategory.labelZh,
      });
    }
  }

  const topics = CANONICAL_TOPIC_LABELS.map((topic) => ({
    value: topic.id,
    labelEn: topic.en,
    labelZh: topic.zh,
    count: topicCounts.get(topic.id) ?? 0,
  })).filter((option) => option.count > 0 || selection.topics.includes(option.value));

  const subcategories = [...subcategoryCounts.entries()]
    .map(([value, count]) => {
      const labels = subcategoryLabels.get(value);
      return {
        value,
        labelEn: labels?.labelEn ?? value.replace(/-/g, " "),
        labelZh: labels?.labelZh ?? null,
        count,
      };
    })
    .filter(
      (option) =>
        option.count > 0 || selection.subcategories.includes(option.value),
    )
    .sort((a, b) => b.count - a.count || a.labelEn.localeCompare(b.labelEn));

  const languageOptions: ResourceFacetOption<ResourceLanguage>[] = [
    {
      value: "en",
      labelEn: "English",
      labelZh: "英文",
      count: languageCounts.get("en") ?? 0,
    },
    {
      value: "zh",
      labelEn: "Chinese",
      labelZh: "中文",
      count: languageCounts.get("zh") ?? 0,
    },
  ];
  const languages = languageOptions.filter(
    (option) => option.count > 0 || selection.languages.includes(option.value),
  );

  const resourceTypes = [...resourceTypeCounts.entries()]
    .map(([value, count]) => ({
      value: value as ResourceType,
      labelEn: RESOURCE_TYPE_LABELS[value as ResourceType] ?? value,
      labelZh: null,
      count,
    }))
    .filter(
      (option) =>
        option.count > 0 || selection.resourceTypes.includes(option.value),
    )
    .sort((a, b) => b.count - a.count || a.labelEn.localeCompare(b.labelEn));

  return {
    topics,
    subcategories,
    languages,
    resourceTypes,
    classifiedCount: resources.filter((resource) => Boolean(resource.facet)).length,
  };
}

export function getCanonicalTopicLabel(
  topicId: CanonicalTopicId,
  language: "en" | "zh" = "en",
): string {
  const topic = TOPIC_LABEL_BY_ID.get(topicId);
  return topic ? topic[language] : topicId;
}

export function getResourceFacetBreadcrumb(
  resource: Resource,
  language: "en" | "zh" = "en",
): string[] {
  if (!resource.facet) {
    return [resource.category, resource.subcategory].filter(
      (value): value is string => Boolean(value),
    );
  }

  const subcategory = resource.facet.subcategory;
  return [
    getCanonicalTopicLabel(resource.facet.canonicalTopic, language),
    subcategory
      ? language === "zh"
        ? subcategory.labelZh ?? subcategory.labelEn
        : subcategory.labelEn
      : null,
  ].filter((value): value is string => Boolean(value));
}
