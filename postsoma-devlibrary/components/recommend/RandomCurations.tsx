"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { TYPE_LABELS } from "@/lib/utils/resource";
import type { Resource } from "@/lib/types/resource";
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
    <section className="border-t border-archive-border pt-10 pb-14">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl text-archive-text mb-2">从这里开始探索</h2>
          <p className="text-sm text-archive-subtle">读一本书、动手练习，或随便发现一点新东西。</p>
        </div>
        <button onClick={shuffle} className="btn-outline min-h-10 text-sm flex items-center gap-2">
          <Icon name="shuffle" size={15} className={`transition-transform duration-300 ${rotate ? "rotate-180" : ""}`} />
          换一批
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-0">
        {cards.map(({ meta, data: resource, curatorNote }) => (
          <article key={meta.key} className="border-t border-archive-border py-5 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-archive-accent">{meta.name}</h3>
              {resource && <span className="text-xs text-archive-subtle">{resource.language === "zh" ? "中文" : "EN"}</span>}
            </div>
            {resource ? (
              <>
                <Link href={`/resource/${resource.id}`} className="font-display text-base leading-snug text-archive-text hover:text-archive-accent underline-offset-4 hover:underline break-words">
                  {resource.title}
                </Link>
                <p className="mt-2 text-xs text-archive-subtle leading-relaxed break-words">
                  {formatIntentCategory(resource)} · {TYPE_LABELS[resource.type as Resource["type"]] || resource.type}{resource.sourceDomain && ` · ${resource.sourceDomain}`}
                </p>
                {curatorNote && <p className="mt-3 text-xs text-archive-subtle leading-relaxed">{curatorNote}</p>}
              </>
            ) : <Link href={meta.exploreHref} className="text-sm text-archive-subtle hover:text-archive-accent">浏览相关资源 →</Link>}
          </article>
        ))}
      </div>
    </section>
  );
}
