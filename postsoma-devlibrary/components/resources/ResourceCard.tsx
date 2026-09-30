import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Resource } from "@/lib/types/resource";
import BookmarkButton from "@/components/resources/BookmarkButton";
import { TYPE_LABELS, getResourceDomain } from "@/lib/utils/resource";
import type { GitHubFavorite } from "@/lib/types/github-favorite";
import { GitHubHealthBadge } from "./GitHubFavoriteMeta";
import { getPrimaryCapability } from "@/lib/data/github-search";

interface ResourceCardProps {
  resource: Resource;
  language?: "all" | "zh" | "en";
  onPreview?: (resource: Resource) => void;
  githubFavorite?: GitHubFavorite;
  capabilityFrequency?: ReadonlyMap<string, number>;
}

function extractRepoIdentity(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1].replace(/\.git$/i, "")}`;
    }
    return parts[0] || "";
  } catch {
    return "";
  }
}

export default function ResourceCard({
  resource,
  language = "all",
  onPreview,
  githubFavorite,
  capabilityFrequency,
}: ResourceCardProps) {
  const searchParams = useSearchParams();

  const handleCardClick = () => {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("postsoma_last_clicked_id", resource.id);
      sessionStorage.setItem("postsoma_scroll_y", String(window.scrollY));
    }
  };

  const queryString = searchParams ? searchParams.toString() : "";
  const detailUrl = `/resource/${resource.id}${queryString ? "?" + queryString : ""}`;
  const displayLanguage = resource.facet?.language ?? resource.language;
  const displayType = resource.facet?.resourceType ?? resource.type;
  const domain = getResourceDomain(resource.url);

  // ── GitHub Row Variant (Curated open-source projects) ─────────────────────────
  if (githubFavorite) {
    const curatedNote =
      githubFavorite.whySaved?.trim() ||
      githubFavorite.editorial?.topic ||
      "Curated open-source project";

    const isHandwrittenChineseNote =
      Boolean(githubFavorite.whySaved && /[\u4e00-\u9fa5]/.test(githubFavorite.whySaved));

    const isSharedWithBooks =
      resource.url.includes("The-Accidental-CTO") ||
      resource.sourcePath === "books/free-programming-books-subjects.md" ||
      (Boolean(githubFavorite) && resource.id !== githubFavorite.id);

    const repoIdentity = extractRepoIdentity(resource.url);

    const primaryCapability = githubFavorite.capabilities?.length
      ? getPrimaryCapability(githubFavorite.capabilities, capabilityFrequency)
      : null;

    return (
      <article
        id={`resource-card-${resource.id}`}
        className="archive-card relative px-3.5 py-3 md:px-4 group animate-fade-in transition-all duration-200 hover:border-archive-border-hover active:bg-white/[0.01]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Row 1: Main Title (Clean Project Name) + Prominent Status Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-[15px] md:text-base text-archive-text leading-snug group-hover:text-archive-accent transition-colors duration-150 line-clamp-1">
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus:outline-none focus-visible:ring-1 focus-visible:ring-archive-accent rounded-sm after:absolute after:inset-0"
                  title={`Open GitHub repository: ${resource.title}`}
                >
                  {resource.title}
                </a>
              </h2>

              {githubFavorite.health === "unavailable" && (
                <span className="relative z-10 font-mono text-[9px] px-1.5 py-0.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 select-none">
                  Unavailable / 404
                </span>
              )}
              {githubFavorite.health === "archived" && (
                <span className="relative z-10 font-mono text-[9px] px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 select-none">
                  Archived
                </span>
              )}
              {isSharedWithBooks && (
                <span className="relative z-10 font-mono text-[9px] px-1.5 py-0.5 rounded border border-archive-accent/40 bg-archive-accent/10 text-archive-accent select-none">
                  Also in Books
                </span>
              )}

              <div className="relative z-10 shrink-0">
                <GitHubHealthBadge favorite={githubFavorite} showLabel={false} />
              </div>
            </div>

            {/* Row 2: Subtitle (owner/repo · language) + Primary Capability Pill */}
            <div className="flex items-center gap-2 mt-1 select-none flex-wrap">
              <p className="font-mono text-[11px] text-archive-subtle/70 truncate">
                {repoIdentity ? (
                  <span className="text-archive-subtle/85 font-mono">{repoIdentity}</span>
                ) : (
                  "repo"
                )}
                {" · "}
                {displayLanguage === "zh" ? "中文" : "EN"}
              </p>

              {primaryCapability && (
                <span className="font-mono text-[9px] text-teal-400/80 bg-teal-500/10 border border-teal-500/25 px-1.5 py-0.5 rounded tracking-tight select-none">
                  {primaryCapability}
                </span>
              )}
            </div>

            {/* Row 3: Human curated reason (whySaved) / Summary */}
            <p className="font-sans text-[11px] md:text-xs text-archive-subtle/85 leading-relaxed mt-2 line-clamp-2 select-text">
              {isHandwrittenChineseNote ? (
                <span className="font-mono text-[10px] text-archive-accent/80 mr-1.5 select-none font-medium">
                  PostSoma&apos;s note:
                </span>
              ) : (
                <span className="font-mono text-[10px] text-archive-subtle/60 mr-1.5 select-none">
                  Intro:
                </span>
              )}
              {curatedNote}
            </p>
          </div>

          {/* Right action column: Quiet star on top, quiet detail link on bottom */}
          <div className="relative z-10 flex flex-col items-end justify-between self-stretch shrink-0 pl-1">
            <BookmarkButton resourceId={resource.id} variant="icon" />
            <Link
              href={detailUrl}
              onClick={(e) => {
                e.stopPropagation();
                if (onPreview) {
                  e.preventDefault();
                  onPreview(resource);
                } else {
                  handleCardClick();
                }
              }}
              className="font-mono text-[10px] text-archive-subtle/50 hover:text-archive-accent transition-colors mt-auto pt-2"
              title={`View details for ${resource.title}`}
            >
              Details →
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // ── Large Catalog Card Variant (Books, Courses, Docs, Interactive, etc.) ──────
  return (
    <article
      id={`resource-card-${resource.id}`}
      className="archive-card relative p-4 flex flex-col justify-between group animate-fade-in transition-all duration-200 hover:border-archive-border-hover min-h-[112px] active:bg-white/[0.01]"
    >
      <div>
        {/* Row 1: Title (Dictator focus, <a> stretches over whole card) + Bookmark */}
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-[15px] md:text-base text-archive-text leading-snug group-hover:text-archive-accent transition-colors duration-150 line-clamp-2">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus:outline-none focus-visible:ring-1 focus-visible:ring-archive-accent rounded-sm after:absolute after:inset-0"
              title={`Open resource: ${resource.title}`}
            >
              {resource.title}
            </a>
          </h2>
          <div className="relative z-10 shrink-0 -mt-0.5">
            <BookmarkButton resourceId={resource.id} variant="icon" />
          </div>
        </div>

        {/* Row 2: Whisper line (type · language · domain) */}
        <p className="font-mono text-[11px] text-archive-subtle/70 mt-2 truncate select-none">
          {TYPE_LABELS[displayType] || displayType} · {displayLanguage === "zh" ? "中文" : "EN"}
          {domain && (
            <>
              {" · "}
              <span>{domain}</span>
            </>
          )}
        </p>
      </div>

      {/* Row 3: Subdued footer detail link */}
      <div className="flex justify-end mt-3 pt-1 border-t border-archive-border/30">
        <Link
          href={detailUrl}
          onClick={(e) => {
            e.stopPropagation();
            if (onPreview) {
              e.preventDefault();
              onPreview(resource);
            } else {
              handleCardClick();
            }
          }}
          className="relative z-10 font-mono text-[10px] text-archive-subtle/50 hover:text-archive-accent transition-colors"
          title={`View details for ${resource.title}`}
        >
          Details →
        </Link>
      </div>
    </article>
  );
}
