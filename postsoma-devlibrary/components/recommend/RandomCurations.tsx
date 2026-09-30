"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import {
  IntentKey,
  INTENT_DEFINITIONS,
  getResourceIntent,
  IntentMeta,
} from "@/lib/utils/intent";
import curatedSurpriseData from "@/data/curated-surprise.json";

export interface CuratedResourceItem {
  id: string;
  title: string;
  language: string;
  type: string;
  category: string;
  subcategory?: string;
  collection?: string;
  tags: string[];
  url: string;
  sourceDomain: string;
  isGitHubRepo: boolean;
  isPreferred: boolean;
}

const CURATED_SURPRISE_MAP = new Map<string, string>(
  curatedSurpriseData.map((item) => [item.resourceId, item.curatorNote])
);

function formatIntentCategory(r: CuratedResourceItem): string {
  const catUpper = (r.category || "").toUpperCase().trim();
  if (
    catUpper === "BY PROGRAMMING LANGUAGE" ||
    catUpper === "BY SUBJECT" ||
    catUpper === "语言相关" ||
    catUpper === "语言无关"
  ) {
    if (r.subcategory && r.subcategory.trim()) {
      return r.subcategory.trim();
    }
    if (r.tags && r.tags.length > 1 && r.tags[1] && !r.tags[1].toUpperCase().includes("BY ")) {
      return r.tags[1].trim();
    }
    return catUpper.includes("LANGUAGE") || catUpper.includes("语言") ? "编程语言" : "计算机科学";
  }
  return r.category ? r.category.replace(/^\d+\s*-\s*/, "").trim() : "综合资源";
}

interface RandomCurationsProps {
  resources: CuratedResourceItem[];
}

interface IntentCardState {
  key: IntentKey;
  meta: IntentMeta;
  data: CuratedResourceItem | null;
  curatorNote?: string;
}

const INTENT_ORDER: IntentKey[] = [
  "read",
  "build",
  "practice",
  "reference",
  "surprise",
];

export default function RandomCurations({ resources }: RandomCurationsProps) {
  const [cards, setCards] = useState<IntentCardState[]>([]);
  const [rotate, setRotate] = useState(false);

  const shuffle = useCallback(() => {
    if (resources.length === 0) return;

    setRotate((prev) => !prev);

    // Group resources into intent pools
    const pools: Record<"read" | "build" | "practice" | "reference", CuratedResourceItem[]> = {
      read: [],
      build: [],
      practice: [],
      reference: [],
    };

    for (const r of resources) {
      const intent = getResourceIntent(r);
      if (intent && pools[intent]) {
        pools[intent].push(r);
      }
    }

    // BUILD pool: prefer learning-friendly categories if abundant
    const preferredBuild = pools.build.filter((r) => r.isPreferred);
    const effectiveBuildPool =
      preferredBuild.length >= 3 ? preferredBuild : pools.build;

    const selectedIds = new Set<string>();
    const selectedDomains = new Set<string>();

    const drawResource = (
      pool: CuratedResourceItem[]
    ): CuratedResourceItem | null => {
      const candidates = pool.filter((r) => !selectedIds.has(r.id));
      if (candidates.length === 0) return null;

      const nonDuplicateDomainCandidates = candidates.filter(
        (r) => !r.sourceDomain || !selectedDomains.has(r.sourceDomain)
      );

      const chosen =
        nonDuplicateDomainCandidates.length > 0
          ? nonDuplicateDomainCandidates[
              Math.floor(Math.random() * nonDuplicateDomainCandidates.length)
            ]
          : candidates[Math.floor(Math.random() * candidates.length)];

      selectedIds.add(chosen.id);
      if (chosen.sourceDomain) {
        selectedDomains.add(chosen.sourceDomain);
      }
      return chosen;
    };

    // Draw one sample for each intent slot in fixed 5-dimensional order
    const nextCards: IntentCardState[] = INTENT_ORDER.map((key) => {
      const meta = INTENT_DEFINITIONS[key];
      let item: CuratedResourceItem | null = null;
      let note: string | undefined = undefined;

      if (key === "read") {
        item = drawResource(pools.read.length > 0 ? pools.read : resources);
      } else if (key === "build") {
        item = drawResource(
          effectiveBuildPool.length > 0 ? effectiveBuildPool : pools.build
        );
      } else if (key === "practice") {
        item = drawResource(
          pools.practice.length > 0 ? pools.practice : resources
        );
      } else if (key === "reference") {
        item = drawResource(
          pools.reference.length > 0 ? pools.reference : resources
        );
      } else if (key === "surprise") {
        // Draw from the curated prize pool first
        const surpriseCandidates = resources.filter((r) =>
          CURATED_SURPRISE_MAP.has(r.id)
        );
        const effectiveSurprisePool =
          surpriseCandidates.length > 0 ? surpriseCandidates : resources;
        item = drawResource(effectiveSurprisePool);
        if (item) {
          note = CURATED_SURPRISE_MAP.get(item.id);
        }
      }

      return {
        key,
        meta,
        data: item,
        curatorNote: note,
      };
    });

    setCards(nextCards);
  }, [resources]);

  useEffect(() => {
    shuffle();
  }, [shuffle]);

  if (cards.length === 0) return null;

  return (
    <section className="border-t border-archive-border pt-12 pb-12 animate-fade-in">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <span className="font-mono text-xs text-archive-accent/80 uppercase tracking-widest block mb-2">
            {"// 五维意图导览 · INTENT.GATEWAY"}
          </span>
          <h2 className="font-display text-2xl text-archive-text mb-1 font-bold">
            Five Ways Into The Catalog
          </h2>
          <p className="font-sans text-xs text-archive-subtle">
            告别技术分类迷宫，根据当下学习阶段直达对应起点的精选示例。
          </p>
        </div>

        {/* Demoted subtle secondary outline button */}
        <button
          onClick={shuffle}
          className="btn-outline text-xs font-mono px-3.5 py-1.5 shrink-0 h-8 flex items-center justify-center gap-1.5 hover:border-archive-accent/60 hover:text-archive-accent transition-all"
        >
          <Icon
            name="shuffle"
            size={13}
            className={`transition-transform duration-300 ${rotate ? "rotate-180" : ""}`}
          />
          换一批示例
        </button>
      </div>

      {/* 5-Column Intent Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {cards.map((card) => {
          const { meta, data: r, curatorNote } = card;

          if (!r) {
            return (
              <div
                key={meta.key}
                className="archive-card p-4 relative overflow-hidden flex flex-col justify-between min-h-[250px] border-archive-border/40 bg-archive-surface/5 opacity-80"
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-archive-border/30" />
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="font-mono text-[9px] text-archive-subtle uppercase tracking-wider font-semibold">
                      {"// "}{meta.order}. {meta.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-archive-subtle/70 leading-relaxed font-sans mb-3">
                    {meta.problemSolved}
                  </p>
                </div>
                <div className="pt-3 border-t border-archive-border/40 mt-3">
                  <Link
                    href={meta.exploreHref}
                    className="text-[10px] font-mono text-archive-accent hover:text-archive-accent-glow hover:underline block text-center"
                  >
                    分类归档 →
                  </Link>
                </div>
              </div>
            );
          }

          const isSurprise = meta.key === "surprise";

          return (
            <div
              key={meta.key}
              className={`archive-card p-4 relative overflow-hidden flex flex-col justify-between min-h-[250px] transition-all duration-200 hover:-translate-y-0.5 hover:border-archive-border-glow ${
                isSurprise
                  ? "border-archive-accent/50 bg-archive-accent/[0.02] shadow-sm shadow-archive-accent/5"
                  : ""
              }`}
            >
              <div
                className={`absolute top-0 left-0 w-full h-[2px] ${
                  isSurprise ? "bg-archive-accent" : "bg-archive-accent/40"
                }`}
              />

              <div>
                {/* Intent order and name header */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-1.5 text-archive-accent">
                    <Icon name={meta.icon} size={13} />
                    <span className="font-mono text-[9px] text-archive-accent uppercase tracking-wider font-semibold">
                      {"// "}{meta.order}. {meta.name}
                    </span>
                    {isSurprise && (
                      <span className="font-mono text-[8px] px-1 py-0.2 rounded bg-archive-accent/20 text-archive-accent border border-archive-accent/30 tracking-tight">
                        精选奖池
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-archive-subtle/70 uppercase select-none">
                    {r.language === "zh" ? "中文" : "EN"}
                  </span>
                </div>

                {/* Problem solved OR Curator Note as visual highlight */}
                {isSurprise && curatorNote ? (
                  <div className="mb-2.5 p-2 rounded bg-archive-accent/10 border border-archive-accent/25 text-archive-text">
                    <div className="flex items-center gap-1 font-mono text-[9px] text-archive-accent font-semibold mb-1">
                      <span>★ PostSoma 推薦</span>
                    </div>
                    <p className="text-[11px] leading-snug font-sans text-archive-text font-medium">
                      “{curatorNote}”
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-archive-subtle/90 leading-relaxed font-sans mb-2.5 line-clamp-2">
                    {meta.problemSolved}
                  </p>
                )}

                <div className="border-t border-archive-border/40 my-2" />

                {/* Resource Title */}
                <h3 className="font-display text-xs text-archive-text line-clamp-2 mb-1.5 leading-snug font-medium hover:text-archive-accent transition-colors">
                  <Link href={`/resource/${r.id}`}>{r.title}</Link>
                </h3>

                {/* Resource Whisper line */}
                <p className="font-mono text-[9px] text-archive-subtle/70 truncate select-none">
                  {formatIntentCategory(r)} · {r.type}
                  {r.sourceDomain && <span> · {r.sourceDomain}</span>}
                </p>
              </div>

              {/* Action Link (Single focused CTA) */}
              <div className="pt-2.5 border-t border-archive-border/40 mt-3 flex items-center justify-end">
                <Link
                  href={`/resource/${r.id}`}
                  className="text-[10px] font-mono text-archive-accent hover:text-archive-accent-glow hover:underline"
                >
                  {meta.actionLabel} →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
