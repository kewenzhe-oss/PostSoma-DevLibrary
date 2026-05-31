import { useMemo } from "react";
import type { Resource } from "@/lib/types/resource";
import ResourceCard from "./ResourceCard";
import TopicCard from "./TopicCard";

interface ResourceGridProps {
  resources: Resource[];
  viewMode?: "topics" | "resources";
  language?: "all" | "zh" | "en";
  onPreview?: (resource: Resource) => void;
  onPreviewTopic?: (topic: { topicName: string; category: string; subcategory?: string; resources: Resource[] }) => void;
}

export default function ResourceGrid({
  resources,
  viewMode = "resources",
  language = "all",
  onPreview,
  onPreviewTopic,
}: ResourceGridProps) {
  // Client-side grouping of resources by leaf category with dynamic hybrid threshold
  const { topicCards, standaloneCards } = useMemo(() => {
    if (viewMode !== "topics") {
      return { topicCards: [], standaloneCards: resources };
    }

    const clusters = new Map<string, Resource[]>();
    for (const res of resources) {
      const topicKey = res.subcategory || res.category || "General";
      if (!clusters.has(topicKey)) {
        clusters.set(topicKey, []);
      }
      clusters.get(topicKey)!.push(res);
    }

    const topics: Array<{
      id: string;
      topicName: string;
      category: string;
      subcategory?: string;
      resources: Resource[];
    }> = [];
    
    const standalones: Resource[] = [];

    // Aggregation threshold: if a category has >= 3 resources, cluster them under a TopicCard.
    // Otherwise, render each resource as a standard ResourceCard directly.
    for (const [topicName, items] of clusters.entries()) {
      if (items.length >= 3) {
        const first = items[0]!;
        topics.push({
          id: `topic-${topicName}-${first.id}`,
          topicName,
          category: first.category,
          subcategory: first.subcategory,
          resources: items,
        });
      } else {
        standalones.push(...items);
      }
    }

    // Sort standalone elements to keep layout predictable
    standalones.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

    return { topicCards: topics, standaloneCards: standalones };
  }, [resources, viewMode]);

  if (viewMode === "topics") {
    return (
      <div
        className="grid gap-3 stagger-children"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        }}
      >
        {/* Aggregated topic groups */}
        {topicCards.map((topic) => (
          <TopicCard
            key={topic.id}
            topicName={topic.topicName}
            category={topic.category}
            subcategory={topic.subcategory}
            resources={topic.resources}
            language={language}
            onPreview={onPreview}
            onPreviewTopic={onPreviewTopic}
          />
        ))}

        {/* Standalone items */}
        {standaloneCards.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            language={language}
            onPreview={onPreview}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid gap-3 stagger-children"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      }}
    >
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          language={language}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}
