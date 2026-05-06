import Link from "next/link";
import type { Resource } from "@/lib/types/resource";
import BookmarkButton from "@/components/resources/BookmarkButton";

const TYPE_LABELS: Record<Resource["type"], string> = {
  book: "book",
  course: "course",
  tutorial: "tutorial",
  documentation: "docs",
  interactive: "interactive",
  article: "article",
  unknown: "resource",
};

interface ResourceCardProps {
  resource: Resource;
}

export default function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <article className="archive-card p-4 flex flex-col gap-3 group animate-fade-in">
      {/* Header row: badges */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={resource.language === "zh" ? "lang-badge-zh" : "lang-badge-en"}
          >
            {resource.language === "zh" ? "中文" : "EN"}
          </span>
          <span className="type-badge">{TYPE_LABELS[resource.type]}</span>
        </div>
        <BookmarkButton resourceId={resource.id} variant="icon" />
      </div>

      {/* Title */}
      <Link href={`/resource/${resource.id}`}>
        <h2 className="font-display text-base text-archive-text leading-snug group-hover:text-archive-accent-glow transition-colors duration-150 line-clamp-2">
          {resource.title}
        </h2>
      </Link>

      {/* Category breadcrumb */}
      <p className="font-mono text-xs text-archive-subtle truncate">
        {resource.category}
        {resource.subcategory && (
          <span>
            <span className="mx-1 opacity-40">/</span>
            {resource.subcategory}
          </span>
        )}
      </p>

      {/* Footer: open link + detail link */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-archive-border">
        <Link
          href={`/resource/${resource.id}`}
          className="font-mono text-xs text-archive-subtle hover:text-archive-text transition-colors"
          id={`resource-detail-${resource.id}`}
        >
          View details →
        </Link>
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          id={`resource-open-${resource.id}`}
          className="font-mono text-xs text-archive-accent-dim hover:text-archive-accent transition-colors"
          title={`Open ${resource.title}`}
        >
          ↗ Open
        </a>
      </div>
    </article>
  );
}
