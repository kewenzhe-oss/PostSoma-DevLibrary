import Link from "next/link";
import type { Resource } from "@/lib/types/resource";

export interface RelatedResourceItem {
  resource: Resource;
  note: string;
}

interface RelatedResourceSectionProps {
  variant: "open-source-references" | "learning-prerequisites";
  items: RelatedResourceItem[];
}

export default function RelatedResourceSection({
  variant,
  items,
}: RelatedResourceSectionProps) {
  if (items.length === 0) return null;

  const isOpenSourceReferences = variant === "open-source-references";
  const heading = isOpenSourceReferences
    ? "相关开源参考"
    : "适合学完这些书 / 课程后查看";
  const eyebrow = isOpenSourceReferences
    ? "LEARN → BUILD"
    : "LEARNED CONTEXT → BUILD";
  const description = isOpenSourceReferences
    ? "把本页知识带入真实项目，继续观察架构、实现与工程取舍。"
    : "这些学习资源提供理解该项目所需的概念背景，可先学再拆解实现。";

  return (
    <section className="mb-8 rounded-sm border border-teal-500/20 bg-teal-500/[0.025] p-4 sm:p-5 relative z-10">
      <div className="mb-4">
        <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-teal-400/70">
          {eyebrow}
        </p>
        <h2 className="font-display text-lg text-archive-text">{heading}</h2>
        <p className="mt-1 font-sans text-xs leading-relaxed text-archive-subtle">
          {description}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {items.map(({ resource, note }) => (
          <Link
            key={resource.id}
            href={`/resource/${resource.id}?col=${resource.collection}`}
            className="group rounded-sm border border-archive-border/70 bg-archive-bg/45 p-3 transition-colors hover:border-teal-500/35 hover:bg-teal-500/[0.035]"
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span className="font-mono text-[8px] uppercase tracking-widest text-teal-300/70">
                {resource.collection === "github"
                  ? "GitHub Reference"
                  : resource.collection === "courses"
                    ? "Course"
                    : "Book"}
              </span>
              <span className="ml-auto font-mono text-[9px] text-archive-subtle/40 transition-colors group-hover:text-teal-300/70">
                View →
              </span>
            </div>
            <h3 className="font-sans text-sm font-semibold leading-snug text-archive-text transition-colors group-hover:text-teal-200">
              {resource.title}
            </h3>
            <p className="mt-1.5 line-clamp-2 font-sans text-[11px] leading-relaxed text-archive-subtle/75">
              {note}
            </p>
            {resource.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {resource.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-archive-border/55 px-1.5 py-0.5 font-mono text-[8px] text-archive-subtle/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
