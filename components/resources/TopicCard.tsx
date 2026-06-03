"use client";

import type { Resource } from "@/lib/types/resource";
import { getProviderLabel } from "@/lib/utils/provider";

interface TopicCardProps {
  topicName: string;
  category: string;
  subcategory?: string;
  resources: Resource[];
  language?: "all" | "zh" | "en";
  onPreview?: (resource: Resource) => void;
  onPreviewTopic?: (topic: { topicName: string; category: string; subcategory?: string; resources: Resource[] }) => void;
}

// ─── Collection Aware Translations ──────────────────────────────────────────
const COLLECTION_LABELS: Record<string, { zh: string; en: string }> = {
  books: { zh: "本书籍", en: "books" },
  courses: { zh: "门课程/资源", en: "courses/resources" },
  cheat_sheets: { zh: "个速查表", en: "cheat sheets" },
  interactive: { zh: "个互动教程", en: "interactive sites" },
  unknown: { zh: "个资源", en: "resources" },
};



// ─── CJK character detector ───────────────────────────────────────────────────
// Used to suppress Chinese category names when the UI is not in ZH mode.
function hasCjk(str: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f]/.test(str);
}

export default function TopicCard({
  topicName,
  category,
  subcategory,
  resources,
  language = "all",
  onPreview,
  onPreviewTopic,
}: TopicCardProps) {
  const count = resources.length;
  const sampleResource = resources[0];
  if (!sampleResource) return null;

  // Deduplicate providers to keep pills neat
  const providers = Array.from(
    new Map(
      resources.map((res) => [getProviderLabel(res.url), res])
    ).values()
  );

  const isZh = language === "zh";
  
  // Use robust collection based plurals
  const collectionKey = sampleResource.collection || "unknown";
  const labelObj = COLLECTION_LABELS[collectionKey] || COLLECTION_LABELS.unknown;
  const typeLabel = isZh ? labelObj.zh : labelObj.en;

  const description = isZh
    ? `已收录 ${count} ${typeLabel}，涵盖 ${topicName} 的核心概念、入门教程与进阶实战项目，由各大优质平台及社区提供。`
    : `A curated collection of ${count} ${typeLabel} covering ${topicName} core fundamentals, syntax patterns, and hands-on developer projects.`;

  return (
    <article
      className="archive-card p-4 flex flex-col gap-3 group animate-fade-in transition-all duration-300"
    >
      {/* Row 1: Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="type-badge uppercase font-mono tracking-wider font-semibold">
          {count} {typeLabel}
        </span>
        <span className="font-mono text-[10px] text-archive-subtle opacity-70">
          Topic Group
        </span>
      </div>

      {/* Row 2: Title */}
      <div>
        <h3 className="font-display text-base text-archive-text leading-snug group-hover:text-archive-accent-glow transition-colors duration-150 line-clamp-1">
          {topicName}
        </h3>
      </div>

      {/* Row 3: Category breadcrumb */}
      <p className="font-mono text-[11px] text-archive-subtle truncate">
        {hasCjk(category) && !isZh ? "Chinese Resource" : category}
        {subcategory && !hasCjk(subcategory) && (
          <span>
            <span className="mx-1 opacity-40">/</span>
            {subcategory}
          </span>
        )}
      </p>

      {/* Row 4: Description */}
      <p className="font-sans text-xs text-archive-subtle/85 line-clamp-2 md:line-clamp-3 leading-relaxed">
        {description}
      </p>

      {/* Row 5: Providers */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {providers.map((res) => (
          <a
            key={res.id}
            href={res.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] md:text-[9px] px-2.5 py-1.5 md:px-2 md:py-0.5 rounded border border-archive-border bg-archive-bg text-archive-accent-dim hover:text-archive-accent hover:border-archive-accent-dim/40 transition-all flex items-center justify-center gap-0.5 shrink-0 min-h-[32px] md:min-h-0"
            title={`Open ${res.title}`}
          >
            {getProviderLabel(res.url)} ↗
          </a>
        ))}
      </div>

      {/* Row 6: Footer */}
      <div className="flex items-center justify-between gap-3 mt-auto pt-2 border-t border-archive-border">
        <button
          onClick={() => {
            if (onPreviewTopic) {
              onPreviewTopic({ topicName, category, subcategory, resources });
            } else if (onPreview) {
              onPreview(sampleResource);
            }
          }}
          className="flex-1 md:flex-initial h-11 md:h-auto border border-archive-border md:border-none rounded bg-archive-surface md:bg-transparent font-mono text-xs text-archive-subtle hover:text-archive-text flex items-center justify-center transition-all duration-150 active:scale-[0.98] md:active:scale-100 text-left md:text-center select-none"
        >
          Preview Topic
        </button>
        <span className="font-mono text-[10px] text-archive-subtle opacity-40 select-none">
          {resources.some((r) => r.language === "zh") ? "ZH / EN" : "EN"}
        </span>
      </div>
    </article>
  );
}
