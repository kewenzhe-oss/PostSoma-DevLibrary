"use client";

import { useMemo, useState } from "react";
import {
  humanizeId,
  type ResourceFacetModel,
  type ResourceFacetOption,
  type ResourceFacetSelection,
} from "@/lib/data/resource-facets";
import type {
  CanonicalTopicId,
  ResourceLanguage,
  ResourceType,
} from "@/lib/types/resource";

interface ResourceFacetPanelProps {
  model: ResourceFacetModel;
  selection: ResourceFacetSelection;
  language?: "all" | "zh" | "en";
  onLanguageChange?: (lang: "all" | "zh" | "en") => void;
  onTopicToggle: (value: CanonicalTopicId) => void;
  onSubcategoryToggle: (value: string) => void;
  onLanguageToggle: (value: ResourceLanguage) => void;
  onResourceTypeToggle: (value: ResourceType) => void;
  onClear: () => void;
  compact?: boolean;
}

/* ─────────────────────────────────────────────────────────────────────────────
   1. Language Segmented Control (三段式语言开关: 全部 | 中文 | EN)
   ───────────────────────────────────────────────────────────────────────────── */
function LanguageSegmentedControl({
  currentLanguage,
  languageOptions,
  totalCount,
  onChange,
}: {
  currentLanguage: "all" | "zh" | "en";
  languageOptions: ResourceFacetOption<ResourceLanguage>[];
  totalCount: number;
  onChange: (lang: "all" | "zh" | "en") => void;
}) {
  const zhOption = languageOptions.find((l) => l.value === "zh");
  const enOption = languageOptions.find((l) => l.value === "en");
  const zhCount = zhOption?.count ?? 0;
  const enCount = enOption?.count ?? 0;
  const allCount = languageOptions.length > 0 ? zhCount + enCount : totalCount;

  return (
    <section aria-labelledby="language-label" className="border-b border-archive-border/50 py-3.5 first:pt-0">
      <div className="mb-2 flex items-center justify-between">
        <h3
          id="language-label"
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-archive-subtle"
        >
          LANGUAGE
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-1 rounded bg-archive-bg/80 p-1 border border-archive-border/70 font-mono text-xs">
        {/* All */}
        <button
          type="button"
          onClick={() => onChange("all")}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded transition-all duration-150 cursor-pointer ${
            currentLanguage === "all"
              ? "bg-archive-accent text-archive-bg font-semibold shadow-sm"
              : "text-archive-subtle hover:text-archive-text hover:bg-white/[0.04]"
          }`}
        >
          <span>All</span>
          <span className="text-[10px] opacity-75 tabular-nums">
            {allCount > 0 ? allCount.toLocaleString() : "—"}
          </span>
        </button>

        {/* 中文 */}
        <button
          type="button"
          disabled={zhCount === 0}
          onClick={() => onChange("zh")}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded transition-all duration-150 ${
            currentLanguage === "zh"
              ? "bg-archive-accent text-archive-bg font-semibold shadow-sm cursor-pointer"
              : zhCount === 0
              ? "opacity-30 cursor-not-allowed text-archive-subtle"
              : "text-archive-subtle hover:text-archive-text hover:bg-white/[0.04] cursor-pointer"
          }`}
        >
          <span>中文</span>
          <span className="text-[10px] opacity-75 tabular-nums">
            {zhCount.toLocaleString()}
          </span>
        </button>

        {/* EN */}
        <button
          type="button"
          disabled={enCount === 0}
          onClick={() => onChange("en")}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded transition-all duration-150 ${
            currentLanguage === "en"
              ? "bg-archive-accent text-archive-bg font-semibold shadow-sm cursor-pointer"
              : enCount === 0
              ? "opacity-30 cursor-not-allowed text-archive-subtle"
              : "text-archive-subtle hover:text-archive-text hover:bg-white/[0.04] cursor-pointer"
          }`}
        >
          <span>EN</span>
          <span className="text-[10px] opacity-75 tabular-nums">
            {enCount.toLocaleString()}
          </span>
        </button>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. Subcategory Section (Top 10-12 Chips + 内嵌即时搜索 + 原文英文标签)
   ───────────────────────────────────────────────────────────────────────────── */
function SubcategorySection({
  options,
  selected,
  onToggle,
}: {
  options: ResourceFacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [showAllList, setShowAllList] = useState(false);

  // Top 10-12 chips + any currently selected items
  const topChips = useMemo(() => {
    const selectedSet = new Set(selected);
    const chips: ResourceFacetOption[] = [];

    // Always include selected options first
    for (const opt of options) {
      if (selectedSet.has(opt.value)) {
        chips.push(opt);
      }
    }

    // Fill up to 12 items with remaining top options
    for (const opt of options) {
      if (!selectedSet.has(opt.value)) {
        chips.push(opt);
        if (chips.length >= 12) break;
      }
    }
    return chips;
  }, [options, selected]);

  // Filtered list when user types in search
  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return options.filter((opt) => {
      const en = (opt.labelEn || "").toLowerCase();
      const zh = (opt.labelZh || "").toLowerCase();
      const val = opt.value.toLowerCase();
      return en.includes(term) || zh.includes(term) || val.includes(term);
    });
  }, [options, search]);

  if (options.length === 0) return null;

  return (
    <section aria-labelledby="subcategory-label" className="border-b border-archive-border/50 py-4">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3
          id="subcategory-label"
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-archive-subtle"
        >
          SUBCATEGORIES
        </h3>
        {selected.length > 0 && (
          <span className="rounded-full border border-archive-accent-dim/40 bg-archive-accent/10 px-1.5 py-0.5 font-mono text-[9px] text-archive-accent">
            {selected.length}
          </span>
        )}
      </div>

      {/* Top 10-12 Chips */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {topChips.map((option) => {
          const isSelected = selected.includes(option.value);
          const label = option.labelEn || humanizeId(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-sans transition-all duration-150 active:scale-95 cursor-pointer ${
                isSelected
                  ? "border border-archive-accent bg-archive-accent/15 text-archive-accent font-medium shadow-[inset_0_0_0_1px_rgba(200,169,110,0.5)]"
                  : "border border-archive-border/60 bg-archive-surface/40 text-archive-subtle hover:border-archive-accent/40 hover:bg-white/[0.04] hover:text-archive-text"
              }`}
            >
              <span>{label}</span>
              {isSelected ? (
                <span className="font-mono text-xs font-bold ml-0.5 opacity-80">×</span>
              ) : (
                <span className="font-mono text-[10px] opacity-60 tabular-nums">
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Inline Search Input */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search all ${options.length} subcategories…`}
          className="w-full bg-archive-bg/90 border border-archive-border/70 rounded px-2.5 py-1.5 text-xs text-archive-text font-sans placeholder:text-archive-subtle/50 focus:outline-none focus:border-archive-accent transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-archive-subtle hover:text-archive-text font-mono text-xs px-1 cursor-pointer"
          >
            ×
          </button>
        )}
      </div>

      {/* Instant Search Results Dropdown/List */}
      {search.trim() ? (
        <div className="mt-1.5 max-h-48 overflow-y-auto drawer-scroll rounded border border-archive-border/80 bg-archive-bg/95 p-1 space-y-0.5">
          {filteredOptions.length === 0 ? (
            <div className="py-3 text-center font-mono text-[11px] text-archive-subtle/60">
              No matching subcategories
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selected.includes(option.value);
              const label = option.labelEn || humanizeId(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onToggle(option.value)}
                  className={`flex w-full items-center justify-between px-2 py-1.5 rounded text-xs text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-archive-accent/15 text-archive-accent font-medium"
                      : "text-archive-subtle hover:bg-white/[0.04] hover:text-archive-text"
                  }`}
                >
                  <span className="truncate mr-2">{label}</span>
                  <span className="font-mono text-[10px] tabular-nums shrink-0 opacity-60">
                    {option.count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : (
        /* Toggle to browse full list */
        <div className="mt-1.5 flex justify-end">
          <button
            type="button"
            onClick={() => setShowAllList((prev) => !prev)}
            className="font-mono text-[10px] text-archive-accent-dim hover:text-archive-accent hover:underline py-0.5 cursor-pointer"
          >
            {showAllList ? "Collapse all ▲" : `Browse all (${options.length}) ▾`}
          </button>
        </div>
      )}

      {/* Expandable full list when toggled and no active search */}
      {!search.trim() && showAllList && (
        <div className="mt-1.5 max-h-56 overflow-y-auto drawer-scroll rounded border border-archive-border/70 bg-archive-bg/80 p-1 space-y-0.5">
          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            const label = option.labelEn || humanizeId(option.value);

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onToggle(option.value)}
                className={`flex w-full items-center justify-between px-2 py-1.5 rounded text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-archive-accent/15 text-archive-accent font-medium"
                    : "text-archive-subtle hover:bg-white/[0.04] hover:text-archive-text"
                }`}
              >
                <span className="truncate mr-2">{label}</span>
                <span className="font-mono text-[10px] tabular-nums shrink-0 opacity-60">
                  {option.count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. Topic Section (主题领域 + 微型 CSS 浅金色分布条)
   ───────────────────────────────────────────────────────────────────────────── */
function TopicSection({
  options,
  selected,
  onToggle,
}: {
  options: ResourceFacetOption<CanonicalTopicId>[];
  selected: CanonicalTopicId[];
  onToggle: (value: CanonicalTopicId) => void;
}) {
  const maxTopicCount = useMemo(
    () => Math.max(...options.map((o) => o.count), 1),
    [options]
  );

  if (options.length === 0) return null;

  return (
    <section aria-labelledby="topic-label" className="border-b border-archive-border/50 py-4">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3
          id="topic-label"
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-archive-subtle"
        >
          TOPIC
        </h3>
        {selected.length > 0 && (
          <span className="rounded-full border border-archive-accent-dim/40 bg-archive-accent/10 px-1.5 py-0.5 font-mono text-[9px] text-archive-accent">
            {selected.length}
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          const label = option.labelEn || humanizeId(option.value);
          const pct = Math.round((option.count / maxTopicCount) * 100);

          return (
            <button
              key={option.value}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => onToggle(option.value)}
              className={`group flex w-full cursor-pointer flex-col justify-center rounded-md border px-2.5 py-1.5 text-left transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:border-archive-accent-dim focus-visible:bg-white/[0.06] active:bg-archive-accent/10 ${
                isSelected
                  ? "border-archive-accent-dim bg-archive-accent/10 text-archive-accent-glow shadow-[inset_2px_0_0_rgba(200,169,110,0.75)]"
                  : "border-archive-muted/60 bg-white/[0.02] text-archive-subtle hover:border-archive-subtle/50 hover:bg-white/[0.06] hover:text-archive-text"
              }`}
            >
              <div className="flex w-full items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border text-[9px] transition-colors duration-150 ${
                    isSelected
                      ? "border-archive-accent bg-archive-accent text-archive-bg"
                      : "border-archive-subtle/70 bg-archive-bg/40 text-transparent group-hover:border-archive-accent-dim group-hover:bg-archive-accent/[0.04]"
                  }`}
                >
                  ✓
                </span>
                <span
                  className={`min-w-0 flex-1 font-sans text-xs leading-snug ${
                    isSelected ? "font-medium text-archive-accent-glow" : "font-normal text-archive-text/90"
                  }`}
                  title={label}
                >
                  {label}
                </span>

                {/* Count */}
                <span
                  className={`shrink-0 font-mono text-[10px] tabular-nums transition-colors duration-150 ${
                    isSelected
                      ? "text-archive-accent/90 font-medium"
                      : "text-archive-subtle/70 group-hover:text-archive-text/70"
                  }`}
                >
                  {option.count.toLocaleString()}
                </span>
              </div>

              {/* CSS Gold Distribution Bar beneath the title */}
              <div className="mt-1 pl-[22px] w-full">
                <div
                  className="h-1 w-full rounded-full bg-archive-border/30 overflow-hidden"
                  title={`${pct}% of max`}
                >
                  <div
                    className="h-full bg-archive-accent/70 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. Format Section (100%直接隐藏 + 98%智能折叠)
   ───────────────────────────────────────────────────────────────────────────── */
function FormatSection({
  options,
  selected,
  onToggle,
}: {
  options: ResourceFacetOption<ResourceType>[];
  selected: ResourceType[];
  onToggle: (value: ResourceType) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // 1. 100% 单一类型：直接不渲染（如 Cheat Sheets 100% Documentation）
  const nonZeroOptions = options.filter((opt) => opt.count > 0);
  if (nonZeroOptions.length <= 1 && selected.length === 0) return null;

  const total = options.reduce((sum, opt) => sum + opt.count, 0);
  const topOption = options[0];
  const isDominant = total > 0 && topOption && topOption.count / total >= 0.98;

  // 2. 98%+ 智能折叠：默认收起（如 Courses 99.4%, Interactive 99.5%）
  if (isDominant && !expanded && selected.length === 0) {
    const topPct = Math.round((topOption.count / total) * 100);
    return (
      <section aria-labelledby="format-label" className="border-b border-archive-border/50 py-3 last:border-b-0">
        <div className="flex items-center justify-between text-xs text-archive-subtle">
          <span className="font-mono text-[10px] text-archive-subtle/80">
            Format: {topPct}% {topOption.labelEn || humanizeId(topOption.value)}
          </span>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="font-mono text-[10px] text-archive-accent-dim hover:text-archive-accent hover:underline py-0.5 cursor-pointer"
          >
            Expand ▾
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="format-label" className="border-b border-archive-border/50 py-4 last:border-b-0">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3
            id="format-label"
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-archive-subtle"
          >
            FORMAT
          </h3>
          {isDominant && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="font-mono text-[9px] text-archive-subtle hover:text-archive-text underline cursor-pointer"
            >
              Collapse
            </button>
          )}
        </div>
        {selected.length > 0 && (
          <span className="rounded-full border border-archive-accent-dim/40 bg-archive-accent/10 px-1.5 py-0.5 font-mono text-[9px] text-archive-accent">
            {selected.length}
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          const label = option.labelEn || humanizeId(option.value);

          return (
            <button
              key={option.value}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => onToggle(option.value)}
              className={`group flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md border px-2.5 text-left transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:border-archive-accent-dim focus-visible:bg-white/[0.06] active:bg-archive-accent/10 lg:min-h-8 ${
                isSelected
                  ? "border-archive-accent-dim bg-archive-accent/10 text-archive-accent-glow shadow-[inset_2px_0_0_rgba(200,169,110,0.75)]"
                  : "border-archive-muted/60 bg-white/[0.02] text-archive-subtle hover:border-archive-subtle/50 hover:bg-white/[0.06] hover:text-archive-text"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border text-[10px] transition-colors duration-150 ${
                  isSelected
                    ? "border-archive-accent bg-archive-accent text-archive-bg"
                    : "border-archive-subtle/70 bg-archive-bg/40 text-transparent group-hover:border-archive-accent-dim group-hover:bg-archive-accent/[0.04]"
                }`}
              >
                ✓
              </span>
              <span
                className={`min-w-0 flex-1 truncate font-sans text-xs ${
                  isSelected ? "font-medium" : "font-normal"
                }`}
                title={label}
              >
                {label}
              </span>

              {/* Count */}
              <span
                className={`shrink-0 font-mono text-[10px] tabular-nums transition-colors duration-150 ${
                  isSelected
                    ? "text-archive-accent/90 font-medium"
                    : "text-archive-subtle/70 group-hover:text-archive-text/70"
                }`}
              >
                {option.count.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Facet Panel Component
   ───────────────────────────────────────────────────────────────────────────── */
export default function ResourceFacetPanel({
  model,
  selection,
  language,
  onLanguageChange,
  onTopicToggle,
  onSubcategoryToggle,
  onLanguageToggle,
  onResourceTypeToggle,
  onClear,
  compact = false,
}: ResourceFacetPanelProps) {
  const currentLang: "all" | "zh" | "en" =
    language !== undefined
      ? language
      : selection.languages.length === 1
      ? selection.languages[0]
      : "all";

  const selectedCount =
    selection.topics.length +
    selection.subcategories.length +
    selection.resourceTypes.length +
    (currentLang !== "all" ? 1 : 0);

  const handleLanguageSelect = (lang: "all" | "zh" | "en") => {
    if (onLanguageChange) {
      onLanguageChange(lang);
    } else {
      if (lang === "all") {
        if (selection.languages.length === 1) onLanguageToggle(selection.languages[0]);
      } else {
        if (!selection.languages.includes(lang) || selection.languages.length !== 1) {
          onLanguageToggle(lang);
        }
      }
    }
  };

  return (
    <div className={compact ? "w-full" : "w-[260px] shrink-0"}>
      <div className={compact ? "" : "sticky top-5 max-h-[calc(100vh-2.5rem)] overflow-y-auto rounded-lg border border-archive-border/70 bg-archive-surface/65 p-4 drawer-scroll"}>
        {/* Header with clear */}
        <div className="mb-3.5 flex items-start justify-between gap-3 border-b border-archive-border/50 pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-archive-accent">
              {"// REFINE ARCHIVE"}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-archive-subtle/70">
              {selectedCount > 0 ? `${selectedCount} active filters` : "Live multi-facet filtering"}
            </p>
          </div>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="min-h-7 shrink-0 cursor-pointer font-mono text-[10px] text-archive-accent hover:text-archive-accent-glow hover:underline transition-colors"
            >
              Reset all ↺
            </button>
          )}
        </div>

        {/* 1. 语言三段开关 */}
        <LanguageSegmentedControl
          currentLanguage={currentLang}
          languageOptions={model.languages}
          totalCount={model.totalCount}
          onChange={handleLanguageSelect}
        />

        {/* 2. 热门范畴 Chips + 内嵌即时搜索 */}
        <SubcategorySection
          options={model.subcategories}
          selected={selection.subcategories}
          onToggle={onSubcategoryToggle}
        />

        {/* 3. 主题领域 + CSS 浅金微型分布条 */}
        <TopicSection
          options={model.topics}
          selected={selection.topics}
          onToggle={onTopicToggle}
        />

        {/* 4. 资源载体形态 (100%隐藏 + 98%智能折叠) */}
        <FormatSection
          options={model.resourceTypes}
          selected={selection.resourceTypes}
          onToggle={onResourceTypeToggle}
        />
      </div>
    </div>
  );
}
