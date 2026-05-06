import { notFound } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import BookmarkButton from "@/components/resources/BookmarkButton";
import { getResourceById } from "@/lib/data/resources";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const resource = await getResourceById(params.id);
  if (!resource) return { title: "Not Found" };
  return { title: `${resource.title} — PostSoma DevLibrary` };
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

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto py-8 animate-slide-up">
        <Link
          href="/resources"
          className="inline-block font-mono text-xs text-archive-subtle hover:text-archive-text transition-colors mb-8"
        >
          ← Back to archive
        </Link>

        <article className="archive-card p-8 md:p-10 relative overflow-hidden">
          {/* Subtle background element */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-archive-accent opacity-[0.03] rounded-full blur-3xl pointer-events-none" />

          {/* Header metadata */}
          <div className="flex items-center gap-3 mb-6 flex-wrap relative z-10">
            <span
              className={
                resource.language === "zh" ? "lang-badge-zh" : "lang-badge-en"
              }
            >
              {resource.language === "zh" ? "Chinese" : "English"}
            </span>
            <span className="type-badge capitalize">{resource.type}</span>
            <span className="font-mono text-xs text-archive-subtle ml-auto">
              ID: {resource.id.slice(0, 8)}
            </span>
          </div>

          <h1 className="font-display text-3xl md:text-4xl text-archive-text leading-snug mb-6 relative z-10">
            {resource.title}
          </h1>

          <div className="flex items-start flex-col sm:flex-row gap-6 mb-10 relative z-10">
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle mb-1">
                  Category
                </h3>
                <p className="font-sans text-sm text-archive-text">
                  {resource.category}
                  {resource.subcategory && ` / ${resource.subcategory}`}
                </p>
              </div>

              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle mb-1">
                  External Link
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

            <div className="w-full sm:w-auto p-4 bg-archive-bg/50 border border-archive-border rounded-sm">
              <BookmarkButton resourceId={resource.id} variant="full" />
            </div>
          </div>

          <div className="archive-divider pt-6 flex justify-between items-center relative z-10">
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
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accent"
            >
              Open Resource ↗
            </a>
          </div>
        </article>
      </div>
    </AppShell>
  );
}
