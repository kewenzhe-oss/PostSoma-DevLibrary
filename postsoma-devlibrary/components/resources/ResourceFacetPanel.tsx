"use client";

import { useEffect, useState } from "react";
import type {
  ResourceFacetModel,
  ResourceFacetOption,
  ResourceFacetSelection,
} from "@/lib/data/resource-facets";
import type {
  CanonicalTopicId,
  ResourceLanguage,
  ResourceType,
} from "@/lib/types/resource";

interface ResourceFacetPanelProps {
  model: ResourceFacetModel;
  selection: ResourceFacetSelection;
  onTopicToggle: (value: CanonicalTopicId) => void;
  onSubcategoryToggle: (value: string) => void;
  onLanguageToggle: (value: ResourceLanguage) => void;
  onResourceTypeToggle: (value: ResourceType) => void;
  onClear: () => void;
  compact?: boolean;
}

interface FacetSectionProps<T extends string> {
  id: string;
  title: string;
  options: ResourceFacetOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  displayLanguage: "en" | "zh";
  initialLimit?: number;
}

function humanizeId(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => {
      if (["ai", "api", "css", "html", "iot", "sql", "ui", "ux"].includes(part)) {
        return part.toUpperCase();
      }
      if (part === "js") return "JS";
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function FacetSection<T extends string>({
  id,
  title,
  options,
  selected,
  onToggle,
  displayLanguage,
  initialLimit = 8,
}: FacetSectionProps<T>) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [id]);

  const visibleOptions = expanded
    ? options
    : options.slice(0, initialLimit);
  const hiddenCount = Math.max(0, options.length - initialLimit);
  const selectedBadgeCount =
    id === "language" && selected.length === 2 ? 0 : selected.length;

  if (options.length === 0) return null;

  return (
    <section aria-labelledby={`${id}-label`} className="border-b border-archive-border/50 py-4 first:pt-0 last:border-b-0">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3
          id={`${id}-label`}
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-archive-subtle"
        >
          {title}
        </h3>
        {selectedBadgeCount > 0 && (
          <span className="rounded-full border border-archive-accent-dim/40 bg-archive-accent/10 px-1.5 py-0.5 font-mono text-[9px] text-archive-accent">
            {selectedBadgeCount}
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        {visibleOptions.map((option) => {
          const isSelected = selected.includes(option.value);
          const localizedLabel =
            displayLanguage === "zh" && option.labelZh
              ? option.labelZh
              : option.labelEn || humanizeId(option.value);
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
                title={localizedLabel}
              >
                {localizedLabel}
              </span>
              <span
                className={`shrink-0 font-mono text-[10px] tabular-nums transition-colors duration-150 ${
                  isSelected
                    ? "text-archive-accent/80"
                    : "text-archive-subtle/70 group-hover:text-archive-text/70"
                }`}
              >
                {option.count.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-2 min-h-11 w-full cursor-pointer rounded px-2 text-left font-mono text-[10px] text-archive-accent-dim transition-colors hover:bg-white/[0.04] hover:text-archive-accent active:bg-archive-accent/[0.06] lg:min-h-8"
        >
          {expanded ? "Show less" : `Show ${hiddenCount} more`}
        </button>
      )}
    </section>
  );
}

export default function ResourceFacetPanel({
  model,
  selection,
  onTopicToggle,
  onSubcategoryToggle,
  onLanguageToggle,
  onResourceTypeToggle,
  onClear,
  compact = false,
}: ResourceFacetPanelProps) {
  const displayLanguage: "en" | "zh" =
    selection.languages.length === 1 && selection.languages[0] === "zh"
      ? "zh"
      : "en";
  const selectedCount =
    selection.topics.length +
    selection.subcategories.length +
    selection.resourceTypes.length +
    (selection.languages.length === 1 ? 1 : 0);

  return (
    <div className={compact ? "w-full" : "w-[248px] shrink-0"}>
      <div className={compact ? "" : "sticky top-5 max-h-[calc(100vh-2.5rem)] overflow-y-auto rounded-lg border border-archive-border/70 bg-archive-surface/65 p-4 drawer-scroll"}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-archive-accent-dim">
              Refine archive
            </p>
            <p className="mt-1 font-sans text-[11px] leading-relaxed text-archive-subtle/80">
              Select one or more filters. Results update instantly.
            </p>
          </div>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="min-h-8 shrink-0 cursor-pointer font-mono text-[10px] text-archive-subtle transition-colors hover:text-archive-text"
            >
              Reset
            </button>
          )}
        </div>

        <FacetSection
          id="topic"
          title="Topic"
          options={model.topics}
          selected={selection.topics}
          onToggle={onTopicToggle}
          displayLanguage={displayLanguage}
          initialLimit={8}
        />
        <FacetSection
          id="subcategory"
          title="Subcategory"
          options={model.subcategories}
          selected={selection.subcategories}
          onToggle={onSubcategoryToggle}
          displayLanguage={displayLanguage}
          initialLimit={8}
        />
        <FacetSection
          id="language"
          title="Language"
          options={model.languages}
          selected={selection.languages}
          onToggle={onLanguageToggle}
          displayLanguage={displayLanguage}
          initialLimit={2}
        />
        <FacetSection
          id="format"
          title="Format"
          options={model.resourceTypes}
          selected={selection.resourceTypes}
          onToggle={onResourceTypeToggle}
          displayLanguage={displayLanguage}
          initialLimit={7}
        />

        {!compact && (
          <p className="mt-4 border-t border-archive-border/40 pt-3 font-mono text-[9px] leading-relaxed text-archive-subtle/45">
            {model.classifiedCount.toLocaleString()} resources use the curated taxonomy.
          </p>
        )}
      </div>
    </div>
  );
}
