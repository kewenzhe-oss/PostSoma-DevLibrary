"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";

interface SimpleResource {
  id: string;
  title: string;
  language: string;
  type: string;
  category: string;
  tags: string[];
  url: string;
  sourceDomain: string;
  isGitHubRepo: boolean;
  isPreferred: boolean;
  isHandsOn: boolean;
}

interface RandomCurationsProps {
  resources: SimpleResource[];
}

export default function RandomCurations({ resources }: RandomCurationsProps) {
  const [cards, setCards] = useState<any[]>([]);
  const [rotate, setRotate] = useState(false);

  const shuffle = () => {
    if (resources.length === 0) return;

    setRotate((prev) => !prev);

    // PRACTICE pool: interactive, compiler, playground, exercise only (books/tutorials/courses -> READ)
    const handsOnPool = resources.filter((r) => r.isHandsOn);

    // BUILD pool: github.com/owner/repo only, excluding offensive items, preferring learning categories
    const cleanGithub = resources.filter((r) => r.isGitHubRepo);
    const preferredGithub = cleanGithub.filter((r) => r.isPreferred);
    const N = 3;
    let githubPool = preferredGithub.length >= N ? preferredGithub : cleanGithub;
    if (githubPool.length < N) {
      githubPool = [];
    }

    // REFERENCE pool: documentation, cheat_sheet
    const referencePool = resources.filter((r) => r.type === "documentation" || r.type === "cheat_sheet");

    // READ pool: books, tutorials, courses
    const readingPool = resources.filter((r) => r.type === "book" || r.type === "tutorial" || r.type === "course");

    const selectedIds = new Set<string>();
    const selectedDomains = new Set<string>();

    const drawResource = (pool: SimpleResource[]): SimpleResource | null => {
      const candidates = pool.filter((r) => !selectedIds.has(r.id));
      if (candidates.length === 0) return null;

      const nonDuplicateDomainCandidates = candidates.filter(
        (r) => !r.sourceDomain || !selectedDomains.has(r.sourceDomain)
      );

      const chosen =
        nonDuplicateDomainCandidates.length > 0
          ? nonDuplicateDomainCandidates[Math.floor(Math.random() * nonDuplicateDomainCandidates.length)]
          : candidates[Math.floor(Math.random() * candidates.length)];

      selectedIds.add(chosen.id);
      if (chosen.sourceDomain) {
        selectedDomains.add(chosen.sourceDomain);
      }
      return chosen;
    };

    // Draw for each of the 5 intent slots (checking selectedIds prevents duplicate resource IDs)
    const readItem = drawResource(readingPool.length > 0 ? readingPool : resources);
    const buildItem = drawResource(githubPool);
    const practiceItem = drawResource(handsOnPool.length > 0 ? handsOnPool : resources);
    const referenceItem = drawResource(referencePool.length > 0 ? referencePool : resources);
    const surpriseItem = drawResource(resources);

    setCards([
      { slotType: "read", label: "Read", icon: "read" as const, actionLabel: "Read", data: readItem },
      { slotType: "build", label: "Build", icon: "build" as const, actionLabel: "Open repo", data: buildItem },
      { slotType: "practice", label: "Practice", icon: "practice" as const, actionLabel: "Start practice", data: practiceItem },
      { slotType: "reference", label: "Reference", icon: "reference" as const, actionLabel: "Open docs", data: referenceItem },
      { slotType: "surprise", label: "Surprise", icon: "surprise" as const, actionLabel: "Discover", data: surpriseItem },
    ]);
  };

  // Perform initial shuffle on mount
  useEffect(() => {
    shuffle();
  }, []);

  if (cards.length === 0) return null;

  return (
    <section className="border-t border-archive-border pt-12 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <span className="font-mono text-xs text-archive-accent/80 uppercase tracking-widest block mb-2">
            {"// RANDOM.CURATIONS"}
          </span>
          <h2 className="font-display text-2xl text-archive-text mb-1 font-bold">
            Five Ways Into The Catalog
          </h2>
          <p className="font-sans text-xs text-archive-subtle">
            从五种进入目录的方式中随机抽取；换一批资源，不进入预设学习路径。
          </p>
        </div>
        <button
          onClick={shuffle}
          className="btn-accent text-xs font-mono px-4 py-2 shrink-0 h-9 flex items-center justify-center gap-1.5"
        >
          <Icon
            name="shuffle"
            size={14}
            className={`transition-transform duration-300 ${rotate ? "rotate-180" : ""}`}
          />
          RESHUFFLE / 换一批
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card, index) => {
          const r = card.data as SimpleResource | null;

          // Render transparent fallback card if slot pool is empty
          if (!r) {
            return (
              <div
                key={index}
                className="archive-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[220px] border-archive-border/40 bg-archive-surface/5 opacity-80"
              >
                <div className="absolute top-0 left-0 w-full h-[3px] bg-archive-border/30" />
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="font-mono text-[9px] text-archive-subtle uppercase tracking-wider">
                      {"// "}{card.label.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-display text-sm text-archive-subtle line-clamp-3 mb-2 font-normal italic">
                    GitHub discoveries are being indexed.
                  </h3>
                  <p className="text-[10px] text-archive-subtle/70 leading-relaxed font-sans">
                    Additional open-source repositories are queued for pipeline integration.
                  </p>
                </div>
                <div className="pt-3 border-t border-archive-border/40 mt-4">
                  <Link
                    href="/resources"
                    className="text-[10px] font-mono text-archive-accent hover:text-archive-accent-glow hover:underline block text-center"
                  >
                    Explore Archive
                  </Link>
                </div>
              </div>
            );
          }

          // Render normal resource card
          return (
            <div
              key={index}
              className="archive-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[220px] transition-all duration-200 hover:-translate-y-0.5 hover:border-archive-border-glow"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-archive-accent/20" />
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <div className="flex items-center gap-1.5 text-archive-accent">
                    <Icon name={card.icon} size={14} />
                    <span className="font-mono text-[9px] text-archive-accent uppercase tracking-wider font-semibold">
                      {"// "}{card.label}
                    </span>
                  </div>
                  <span className="text-[8px] font-mono text-archive-subtle border border-archive-border/50 px-1 py-0.2 rounded-sm uppercase bg-archive-surface">
                    {r.language}
                  </span>
                </div>
                <h3 className="font-display text-sm text-archive-text line-clamp-3 mb-2 leading-snug font-medium">
                  {r.title}
                </h3>
                <div className="space-y-0.5">
                  <span className="font-mono text-[9px] text-archive-subtle/80 uppercase block">
                    Category: {r.category}
                  </span>
                  {r.sourceDomain && (
                    <span className="font-mono text-[9px] text-archive-muted block truncate">
                      Source: {r.sourceDomain}
                    </span>
                  )}
                </div>
              </div>
              <div className="pt-3 border-t border-archive-border/40 mt-4 flex items-center justify-between">
                <Link
                  href={`/resource/${r.id}`}
                  className="text-[10px] font-mono text-archive-accent hover:text-archive-accent-glow hover:underline"
                >
                  {card.actionLabel} →
                </Link>
                <Link
                  href={`/recommend?goal=${encodeURIComponent(r.category)}&lang=${r.language}&level=all&format=all`}
                  className="text-[9px] font-mono text-archive-subtle hover:text-archive-text hover:underline"
                >
                  Shortlist
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
