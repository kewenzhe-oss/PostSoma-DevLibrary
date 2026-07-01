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
  onToggleViewMode?: (mode: "topics" | "resources") => void;
}

export default function ResourceGrid({
  resources,
  viewMode = "resources",
  language = "all",
  onPreview,
  onPreviewTopic,
  onToggleViewMode,
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
    // If no aggregated topics are available, provide a clean fallback with redirection action
    if (topicCards.length === 0) {
      return (
        <div className="py-12 px-4 text-center border border-dashed border-archive-border/40 rounded bg-archive-surface/20 max-w-lg mx-auto my-6 animate-fade-in">
          <p className="text-xs text-archive-subtle font-mono mb-2">
            No Curated Topics Available
          </p>
          <p className="text-xs text-archive-muted font-sans mb-5 leading-relaxed">
            There are only standalone or miscellaneous items in this folder. Switch to &quot;Raw Data&quot; to explore all of them.
          </p>
          {onToggleViewMode && (
            <button
              onClick={() => onToggleViewMode("resources")}
              className="px-4 py-2 border border-archive-border hover:border-archive-muted text-[10px] font-mono text-archive-accent hover:text-archive-text bg-archive-surface active:scale-95 transition-all rounded"
            >
              Switch to Raw Data →
            </button>
          )}
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
        {/* Aggregated topic groups ONLY — Option B strict filter */}
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
