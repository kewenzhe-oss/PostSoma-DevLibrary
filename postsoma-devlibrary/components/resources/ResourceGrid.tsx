import { useMemo } from "react";
import type { Resource } from "@/lib/types/resource";
import type { GitHubFavorite } from "@/lib/types/github-favorite";
import type {
  GitHubBrowseMode,
  GitHubMatchReason,
} from "@/lib/data/github-search";
import ResourceCard from "./ResourceCard";
import TopicCard from "./TopicCard";

interface ResourceGridProps {
  resources: Resource[];
  viewMode?: "topics" | "resources";
  language?: "all" | "zh" | "en";
  onPreview?: (resource: Resource) => void;
  onPreviewTopic?: (topic: {
    topicName: string;
    category: string;
    subcategory?: string;
    resources: Resource[];
  }) => void;
  onToggleViewMode?: (mode: "topics" | "resources") => void;
  githubFavoritesById?: ReadonlyMap<string, GitHubFavorite>;
  githubBrowseMode?: GitHubBrowseMode;
  githubMatchReasonsById?: ReadonlyMap<string, GitHubMatchReason[]>;
}

function formatTimelineDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function GitHubRecallContext({ favorite }: { favorite: GitHubFavorite }) {
  const trustedDiscoveryDate =
    favorite.discoveredAtSource === "local-entry"
      ? formatTimelineDate(favorite.discoveredAt)
      : null;
  const trustedReviewDate =
    favorite.lastReviewedAtSource === "manual-review"
      ? formatTimelineDate(favorite.lastReviewedAt)
      : null;

  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 font-mono text-[9px] text-archive-subtle/65">
      {trustedDiscoveryDate && (
        <span>
          Saved ·{" "}
          <span className="text-archive-subtle">
            {trustedDiscoveryDate}
          </span>
        </span>
      )}
      <span>
        Review history ·{" "}
        <span
          className={
            trustedReviewDate
              ? "text-archive-subtle"
              : "italic text-archive-subtle/55"
          }
        >
          {trustedReviewDate
            ? `Reviewed ${trustedReviewDate}`
            : "Not established"}
        </span>
      </span>
      <span
        className={`min-w-0 basis-full truncate sm:basis-auto ${
          favorite.personalNote
            ? "text-archive-text/75"
            : "italic text-archive-subtle/45"
        }`}
        title={favorite.personalNote || "No personal note added yet."}
      >
        Personal note · {favorite.personalNote || "Not added yet"}
      </span>
    </div>
  );
}

function GitHubMatchReasons({
  reasons,
}: {
  reasons: GitHubMatchReason[];
}) {
  if (reasons.length === 0) return null;
  const visible = reasons.slice(0, 6);
  const remaining = reasons.length - visible.length;

  return (
    <div
      className="mt-1.5 flex flex-wrap items-center gap-1.5 px-3"
      aria-label="Search match reasons"
    >
      <span className="mr-0.5 font-mono text-[8px] uppercase tracking-widest text-archive-subtle/45">
        Matched
      </span>
      {visible.map((reason) => {
        const isStructured = reason.kind !== "text";
        return (
          <span
            key={`${reason.kind}-${reason.label}-${reason.value}`}
            className={`rounded-full border px-2 py-0.5 font-mono text-[8px] leading-none ${
              isStructured
                ? "border-teal-500/30 bg-teal-500/[0.06] text-teal-300/85"
                : "border-archive-border/55 bg-archive-bg/40 text-archive-subtle/70"
            }`}
          >
            {isStructured
              ? `${reason.label} · ${reason.value}`
              : reason.label}
          </span>
        );
      })}
      {remaining > 0 && (
        <span className="font-mono text-[8px] text-archive-subtle/45">
          +{remaining}
        </span>
      )}
    </div>
  );
}

export default function ResourceGrid({
  resources,
  viewMode = "resources",
  language = "all",
  onPreview,
  onPreviewTopic,
  onToggleViewMode,
  githubFavoritesById,
  githubBrowseMode = "topic",
  githubMatchReasonsById,
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
    standalones.sort(
      (a, b) =>
        a.category.localeCompare(b.category) ||
        a.title.localeCompare(b.title),
    );

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

  const isGitHubList = resources.some(
    (resource) => resource.collection === "github",
  );

  return (
    <div
      className={
        isGitHubList
          ? `flex flex-col stagger-children ${
              githubBrowseMode === "recall" ? "gap-4" : "gap-2"
            }`
          : "grid gap-3 stagger-children"
      }
      style={
        isGitHubList
          ? undefined
          : { gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }
      }
    >
      {resources.map((resource) => {
        const githubFavorite = githubFavoritesById?.get(resource.id);

        if (!isGitHubList) {
          return (
            <ResourceCard
              key={resource.id}
              resource={resource}
              language={language}
              onPreview={onPreview}
              githubFavorite={githubFavorite}
            />
          );
        }

        const matchReasons = githubMatchReasonsById?.get(resource.id) ?? [];
        return (
          <div
            key={resource.id}
            className={githubBrowseMode === "recall" ? "py-1.5" : undefined}
          >
            {githubFavorite && githubBrowseMode === "recall" && (
              <GitHubRecallContext favorite={githubFavorite} />
            )}
            <ResourceCard
              resource={resource}
              language={language}
              onPreview={onPreview}
              githubFavorite={githubFavorite}
            />
            {githubFavorite && <GitHubMatchReasons reasons={matchReasons} />}
          </div>
        );
      })}
    </div>
  );
}
