import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
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
  const router = useRouter();

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

  const handleCardBodyClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't trigger if clicked element is interactive
    if (target.closest("button") || target.closest("a")) {
      return;
    }

    if (isDirectOutbound) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
    } else if (onPreview) {
      onPreview(resource);
    } else {
      handleCardClick();
      router.push(detailUrl);
    }
  };

  return (
    <article
      id={`resource-card-${resource.id}`}
      onClick={handleCardBodyClick}
      className="archive-card p-4 flex flex-col gap-3 group animate-fade-in transition-all duration-300 cursor-pointer active:bg-white/[0.01] md:active:bg-transparent"
    >
      {/* Row 1: badges & bookmark */}
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

      {/* Row 2: Title */}
      <Link href={detailUrl} onClick={handleTitleClick}>
        <h2 className="font-display text-base text-archive-text leading-snug group-hover:text-archive-accent-glow transition-colors duration-150 line-clamp-2">
          {resource.title}
        </h2>
      </Link>

      {/* Row 3: Category breadcrumb */}
      <p className="font-mono text-[11px] text-archive-subtle truncate">
        {resource.category}
        {resource.subcategory && (
          <span>
            <span className="mx-1 opacity-40">/</span>
            {resource.subcategory}
          </span>
        )}
      </p>

      {/* Row 4: Description */}
      <p className="font-sans text-xs text-archive-subtle/85 line-clamp-2 md:line-clamp-3 leading-relaxed">
        {generateDescription(resource, language)}
      </p>

      {/* Row 5: Footer Actions */}
      <div className="flex items-center justify-between gap-3 mt-auto pt-2 border-t border-archive-border">
        <Link
          href={detailUrl}
          className="flex-1 md:flex-initial h-11 md:h-auto bg-archive-accent text-archive-bg rounded font-sans text-xs font-semibold flex items-center justify-center transition-all duration-150 active:scale-[0.98] md:active:scale-100 md:bg-transparent md:border-none md:text-archive-subtle md:hover:text-archive-text md:font-mono md:text-xs"
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
          {language === "zh" ? "查看详情 →" : "View Details →"}
        </Link>
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          id={`resource-open-${resource.id}`}
          className="w-11 h-11 md:w-auto md:h-auto shrink-0 border border-archive-border rounded bg-archive-surface text-archive-subtle flex items-center justify-center transition-all duration-150 active:scale-[0.98] md:active:scale-100 md:border-none md:bg-transparent md:text-archive-accent-dim md:hover:text-archive-accent md:font-mono md:text-xs"
          title={`Open ${resource.title}`}
        >
          <span>↗</span>
          <span className="hidden md:inline ml-1">
            {language === "zh" ? "打开" : "Open"}
          </span>
        </a>
      </div>
    </article>
  );
}

