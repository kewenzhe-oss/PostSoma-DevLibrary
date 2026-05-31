import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Resource } from "@/lib/types/resource";
import BookmarkButton from "@/components/resources/BookmarkButton";
import { generateDescription, TYPE_LABELS } from "@/lib/utils/resource";

interface ResourceCardProps {
  resource: Resource;
  language?: "all" | "zh" | "en";
  onPreview?: (resource: Resource) => void;
}

export default function ResourceCard({ resource, language = "all", onPreview }: ResourceCardProps) {
  const searchParams = useSearchParams();
  const handleCardClick = () => {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("postsoma_last_clicked_id", resource.id);
      sessionStorage.setItem("postsoma_scroll_y", String(window.scrollY));
    }
  };

  const queryString = searchParams ? searchParams.toString() : "";
  const detailUrl = `/resource/${resource.id}${queryString ? "?" + queryString : ""}`;

  const isDirectOutbound = resource.collection === "cheat_sheets" || resource.collection === "interactive";

  const handleTitleClick = (e: React.MouseEvent) => {
    if (isDirectOutbound) {
      e.preventDefault();
      window.open(resource.url, "_blank", "noopener,noreferrer");
    } else if (onPreview) {
      e.preventDefault();
      onPreview(resource);
    } else {
      handleCardClick();
    }
  };

  return (
    <article
      id={`resource-card-${resource.id}`}
      className="archive-card p-4 flex flex-col gap-3 group animate-fade-in transition-all duration-300"
    >
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
      <Link href={detailUrl} onClick={handleTitleClick}>
        <h2 className="font-display text-base text-archive-text leading-snug group-hover:text-archive-accent-glow transition-colors duration-150 line-clamp-2">
          {resource.title}
        </h2>
      </Link>

      {/* Description */}
      <p className="font-sans text-xs text-archive-subtle/85 line-clamp-3 leading-relaxed">
        {generateDescription(resource, language)}
      </p>

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
          href={detailUrl}
          className="font-mono text-xs text-archive-subtle hover:text-archive-text transition-colors"
          id={`resource-detail-${resource.id}`}
          onClick={(e) => {
            if (onPreview) {
              e.preventDefault();
              onPreview(resource);
            } else {
              handleCardClick();
            }
          }}
        >
          Preview
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

