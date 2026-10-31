import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Resource } from "@/lib/types/resource";
import type { GitHubFavorite } from "@/lib/types/github-favorite";
import BookmarkButton from "@/components/resources/BookmarkButton";
import { TYPE_LABELS, getResourceDomain } from "@/lib/utils/resource";
import { GitHubHealthBadge } from "./GitHubFavoriteMeta";
import { getPrimaryCapability } from "@/lib/data/github-search";

interface ResourceCardProps {
  resource: Resource;
  language?: "all" | "zh" | "en";
  onPreview?: (resource: Resource) => void;
  githubFavorite?: GitHubFavorite;
  capabilityFrequency?: ReadonlyMap<string, number>;
}

export default function ResourceCard({ resource, onPreview, githubFavorite, capabilityFrequency }: ResourceCardProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const params = new URLSearchParams(searchParams?.toString());
  if (pathname === "/library") params.set("from", "library");
  const query = params.toString();
  const detailUrl = `/resource/${resource.id}${query ? `?${query}` : ""}`;
  const displayLanguage = resource.facet?.language ?? resource.language;
  const displayType = resource.facet?.resourceType ?? resource.type;
  const domain = getResourceDomain(resource.url);
  const capability = githubFavorite?.capabilities?.length
    ? getPrimaryCapability(githubFavorite.capabilities, capabilityFrequency)
    : null;
  const note = githubFavorite?.whySaved?.trim() || githubFavorite?.editorial?.topic;

  const openDetails = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (onPreview) {
      event.preventDefault();
      onPreview(resource);
    } else if (pathname !== "/library" && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("postsoma_last_clicked_id", resource.id);
      sessionStorage.setItem("postsoma_scroll_y", String(window.scrollY));
    }
  };

  return (
    <article id={`resource-card-${resource.id}`} className="archive-card relative p-4 flex flex-col min-w-0 group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 lang={displayLanguage === "zh" ? "zh" : "en"} className="font-display text-base text-archive-text leading-snug break-words">
            <Link href={detailUrl} onClick={openDetails} className="after:absolute after:inset-0 hover:text-archive-accent focus-visible:text-archive-accent">
              {resource.title}
            </Link>
          </h2>
          <p className="mt-2 text-xs text-archive-subtle leading-relaxed break-words">
            {TYPE_LABELS[displayType] || displayType} · {displayLanguage === "zh" ? "中文" : "英文"}{domain && ` · ${domain}`}
          </p>
          {githubFavorite && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <GitHubHealthBadge favorite={githubFavorite} />
              {capability && <span className="text-archive-subtle">{capability}</span>}
            </div>
          )}
          {note && <p className="mt-3 text-xs leading-relaxed text-archive-subtle line-clamp-2">{note}</p>}
        </div>
        <div className="relative z-10 shrink-0"><BookmarkButton resourceId={resource.id} resourceTitle={resource.title} variant="icon" /></div>
      </div>
      <div className="relative z-10 mt-4 pt-3 border-t border-archive-border/50 flex flex-wrap items-center justify-between gap-3 text-xs">
        <Link href={detailUrl} onClick={openDetails} className="text-archive-text hover:text-archive-accent">查看详情 →</Link>
        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-archive-subtle hover:text-archive-accent" aria-label={`访问${resource.title}原站（在新标签页打开）`}>
          访问原站 ↗
        </a>
      </div>
    </article>
  );
}
