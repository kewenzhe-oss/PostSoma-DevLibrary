import { notFound } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import BookmarkButton from "@/components/resources/BookmarkButton";
import { getAllResources, getResourceById } from "@/lib/data/resources";
import JsonLd from "@/components/seo/JsonLd";
import type { Metadata } from "next";
import BackLink from "@/components/resources/BackLink";
import { getProviderLabel } from "@/lib/utils/provider";
import { TYPE_LABELS } from "@/lib/utils/resource";
import { getResourceFacetBreadcrumb } from "@/lib/data/resource-facets";
import { getGitHubFavoriteForResourceUi } from "@/lib/data/github-favorite-ui";
import { getGitHubFavoriteCurationForUi } from "@/lib/data/github-curation-ui";
import {
  GitHubCapabilityTags,
  GitHubHealthBadge,
  GitHubResearchDetails,
} from "@/components/resources/GitHubFavoriteMeta";
import RelatedResourceSection from "@/components/resources/RelatedResourceSection";
import type { RelatedResourceItem } from "@/components/resources/RelatedResourceSection";
import { absoluteSiteUrl } from "@/lib/config/site";
import { getResourceMetadataDescription } from "@/lib/seo/resource-metadata";

export async function generateStaticParams() {
  // getAllResources reads public/data/resources.json which is committed to the repo
  const resources = await getAllResources();

  // Safety guard: if data is unavailable at build time, log and return empty
  // (dynamicParams=false below ensures Next.js handles this gracefully)
  if (!resources || resources.length === 0) {
    console.warn(
      "[generateStaticParams] resources.json is empty or missing — " +
      "no resource detail pages will be pre-rendered."
    );
    return [];
  }

  return resources.map((r) => ({ id: r.id }));
}

// Required for output: export — disables runtime dynamic routing
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const resource = await getResourceById(params.id);
  if (!resource) return { title: "Not Found" };
  const githubFavorite = await getGitHubFavoriteForResourceUi(resource);
  const description = getResourceMetadataDescription(resource, githubFavorite);

  return {
    title: `${resource.title} — PostSoma DevLibrary`,
    description,
    alternates: {
      canonical: `/resource/${resource.id}`,
    },
    openGraph: {
      title: `${resource.title} — PostSoma DevLibrary`,
      description,
      url: `/resource/${resource.id}`,
      type: "article",
      siteName: "PostSoma DevLibrary",
      locale: (resource.facet?.language ?? resource.language) === "zh" ? "zh_TW" : "en_US",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `${resource.title} — PostSoma DevLibrary`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${resource.title} — PostSoma DevLibrary`,
      description,
      images: ["/og-image.png"],
    },
  };
}

export default async function ResourceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const resource = await getResourceById(params.id);
  
  if (!resource) {
    notFound();
  }

  const githubFavorite = await getGitHubFavoriteForResourceUi(resource);
  const allResources = await getAllResources();
  const resourcesById = new Map(
    allResources.map((item) => [item.id, item] as const),
  );
  const githubCuration = await getGitHubFavoriteCurationForUi();
  let relatedOpenSourceReferences: RelatedResourceItem[] = [];
  let relatedLearningPrerequisites: RelatedResourceItem[] = [];

  if (
    resource.collection === "books" ||
    resource.collection === "courses"
  ) {
    relatedOpenSourceReferences = githubCuration.records.flatMap(
      (curation) => {
        if (
          curation.belongsTo !== "devlibrary" ||
          !curation.relatedLearningResourceIds.includes(resource.id)
        ) {
          return [];
        }
        const relatedResource = resourcesById.get(curation.favoriteId);
        return relatedResource && curation.relationNote
          ? [{ resource: relatedResource, note: curation.relationNote }]
          : [];
      },
    );
  } else if (resource.collection === "github") {
    const curation = githubCuration.records.find(
      (record) =>
        record.favoriteId === resource.id &&
        record.belongsTo === "devlibrary",
    );
    if (curation?.relationNote) {
      relatedLearningPrerequisites =
        curation.relatedLearningResourceIds.flatMap((resourceId) => {
          const relatedResource = resourcesById.get(resourceId);
          return relatedResource
            ? [{ resource: relatedResource, note: curation.relationNote! }]
            : [];
        });
    }
  }

  const displayLanguage = resource.facet?.language ?? resource.language;
  const displayType = resource.facet?.resourceType ?? resource.type;
  const facetBreadcrumb = getResourceFacetBreadcrumb(
    resource,
    "zh",
  );
  const displayDetailSummary = resource.detailSummary || resource.summary || null;
  const displayBestFor = resource.bestFor ?? [];
  const displayAccessNote = resource.accessNote ?? null;

  return (
    <AppShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              "@id": absoluteSiteUrl(`/resource/${resource.id}#webpage`),
              "url": absoluteSiteUrl(`/resource/${resource.id}`),
              "name": `${resource.title} — PostSoma DevLibrary`,
              "description": getResourceMetadataDescription(resource, githubFavorite),
              "isPartOf": { "@id": absoluteSiteUrl("/#website") },
              "inLanguage": displayLanguage === "zh" ? "zh-Hant" : "en"
            },
            {
              "@type": "BreadcrumbList",
              "@id": absoluteSiteUrl(`/resource/${resource.id}#breadcrumb`),
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": absoluteSiteUrl("/")
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Resources",
                  "item": absoluteSiteUrl("/resources")
                },
                {
                  "@type": "ListItem",
                  "position": 3,
                  "name": resource.title,
                  "item": absoluteSiteUrl(`/resource/${resource.id}`)
                }
              ]
            }
          ]
        }}
      />
      <div className="max-w-3xl mx-auto py-8 animate-slide-up">
        <BackLink />

        <article className="archive-card p-4 sm:p-8 md:p-10 relative overflow-hidden">
          {/* Header metadata */}
          <div className="flex items-center gap-3 mb-6 flex-wrap relative z-10">
            <span
              className={
                displayLanguage === "zh" ? "lang-badge-zh" : "lang-badge-en"
              }
            >
              {displayLanguage === "zh" ? "中文" : "英文"}
            </span>
            <span className="type-badge capitalize">{TYPE_LABELS[displayType] || displayType}</span>
            {githubFavorite && <GitHubHealthBadge favorite={githubFavorite} />}
            <span className="font-mono text-xs text-archive-subtle ml-auto">
              ID: {resource.id.slice(0, 8)}
            </span>
          </div>

          <h1 className="font-display text-3xl md:text-4xl text-archive-text leading-snug mb-6 relative z-10">
            {resource.title}
          </h1>

          <div className="flex flex-wrap items-start gap-3 mb-8">
            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="btn-accent min-h-11 flex items-center justify-center px-5">访问原站 ↗</a>
            <BookmarkButton resourceId={resource.id} variant="full" />
          </div>

          {githubFavorite && (
            <div className="relative z-10 mb-5">
              <GitHubCapabilityTags
                capabilities={githubFavorite.capabilities}
                maxVisible={8}
              />
            </div>
          )}

          {/* Description and research notes */}
          <div className="mb-8 relative z-10">
            {githubFavorite && resource.collection === "github" ? (
              <GitHubResearchDetails favorite={githubFavorite} />
            ) : (
              <>
                <div className="bg-archive-bg/40 p-4 border border-archive-border rounded-sm relative overflow-hidden">
                  {displayDetailSummary ? (
                    <p className="font-sans text-sm text-archive-subtle leading-relaxed">
                      {displayDetailSummary}
                    </p>
                  ) : (
                    <p className="font-mono text-[10px] text-archive-subtle/60 leading-relaxed">
                      暂无简介，可访问原站了解详情。
                    </p>
                  )}
                </div>
                {githubFavorite && (
                  <div className="mt-4">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-teal-400">
                      GitHub 项目资料
                    </p>
                    <GitHubResearchDetails favorite={githubFavorite} />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-start flex-col sm:flex-row gap-6 mb-10 relative z-10">
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle mb-1">
                  分类
                </h3>
                <p className="font-sans text-sm text-archive-text">
                  {facetBreadcrumb.join(" / ")}
                </p>
              </div>

              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle mb-1">
                  来源
                </h3>
                <p className="font-sans text-sm text-archive-text">
                  {getProviderLabel(resource.url)}
                </p>
              </div>

              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle mb-1">
                  原站链接
                </h3>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-archive-accent-dim hover:text-archive-accent transition-colors break-all"
                >
                  {resource.url}
                </a>
              </div>
            </div>

          </div>

          {/* Editorial Decision Panel (Best For & Access Note) */}
          {(displayBestFor.length > 0 || displayAccessNote) && (
            <div className="bg-archive-surface border border-archive-border rounded-sm p-4 sm:p-5 mb-8 relative z-10 space-y-4">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-teal-400 mb-1">
                编辑备注
              </h3>
              {displayBestFor.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-sans text-xs text-archive-text font-semibold">
                    适合：
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-archive-subtle font-sans">
                    {displayBestFor.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {displayAccessNote && (
                <p className="font-sans text-xs text-archive-subtle leading-relaxed pt-1 border-t border-archive-border/30">
                  <strong className="text-archive-text font-semibold">访问说明：</strong>
                  {displayAccessNote}
                </p>
              )}
            </div>
          )}

          <RelatedResourceSection
            variant="open-source-references"
            items={relatedOpenSourceReferences}
          />

          <RelatedResourceSection
            variant="learning-prerequisites"
            items={relatedLearningPrerequisites}
          />

          {/* Low-Emphasis AI Meta Box */}
          {!githubFavorite && (resource.keyTakeaway || resource.priority || resource.action) && (
            <div className="bg-archive-surface border border-archive-border rounded-sm p-4 sm:p-5 mb-8 relative z-10 space-y-3">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle mb-1">
                AI 工作流记录
              </h3>
              {resource.keyTakeaway && (
                <p className="font-sans text-xs sm:text-sm text-archive-subtle leading-relaxed">
                  <strong className="text-archive-text font-medium">要点：</strong> {resource.keyTakeaway}
                </p>
              )}
              <div className="flex gap-4 flex-wrap text-xs font-mono text-archive-subtle/80 pt-1">
                {resource.priority && (
                  <span>
                    优先级： <span className="text-archive-text font-medium">{resource.priority}</span>
                  </span>
                )}
                {resource.action && (
                  <span>
                    建议操作： <span className="text-archive-text font-medium">{resource.action}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="archive-divider pt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 relative z-10">
            {githubFavorite ? (
              <GitHubCapabilityTags
                capabilities={githubFavorite.capabilities}
                maxVisible={12}
              />
            ) : (
              <div className="flex gap-2 flex-wrap">
                {resource.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[10px] px-2 py-1 bg-archive-bg border border-archive-border rounded-sm text-archive-subtle"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>
      </div>
    </AppShell>
  );
}
