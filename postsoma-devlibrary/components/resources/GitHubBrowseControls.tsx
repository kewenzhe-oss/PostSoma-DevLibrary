"use client";

import { useMemo, useState } from "react";
import {
  GITHUB_FAVORITE_HEALTH_VALUES,
  type GitHubFavoriteHealth,
} from "@/lib/types/github-favorite";
import type {
  GitHubBrowseMode,
  GitHubFacetOption,
} from "@/lib/data/github-search";

interface GitHubBrowseControlsProps {
  mode: GitHubBrowseMode;
  onModeChange?: (mode: GitHubBrowseMode) => void;
  capabilityOptions: GitHubFacetOption[];
  techStackOptions: GitHubFacetOption[];
  healthCounts: ReadonlyMap<GitHubFavoriteHealth, number>;
  selectedCapability: string;
  selectedTechStack: string;
  selectedHealth: GitHubFavoriteHealth | "";
  localEntryCount: number;
  manualReviewCount: number;
  onCapabilityChange: (value: string) => void;
  onTechStackChange: (value: string) => void;
  onHealthChange: (value: GitHubFavoriteHealth | "") => void;
}

const HEALTH_SEGMENTS: Array<{
  value: GitHubFavoriteHealth | "";
  label: string;
}> = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "quiet", label: "Quiet" },
  { value: "archived", label: "Archived" },
  { value: "unavailable", label: "Unavailable" },
];

function HealthSegmentedControl({
  selectedHealth,
  healthCounts,
  onHealthChange,
}: {
  selectedHealth: GitHubFavoriteHealth | "";
  healthCounts: ReadonlyMap<GitHubFavoriteHealth, number>;
  onHealthChange: (value: GitHubFavoriteHealth | "") => void;
}) {
  const allCount = GITHUB_FAVORITE_HEALTH_VALUES.reduce(
    (sum, h) => sum + (healthCounts.get(h) ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-archive-subtle">
          HEALTH
        </span>
        {selectedHealth && (
          <button
            type="button"
            onClick={() => onHealthChange("")}
            className="font-mono text-[10px] text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
          >
            Reset ×
          </button>
        )}
      </div>
      <div className="grid grid-cols-5 gap-1 rounded bg-archive-bg/80 p-1 border border-archive-border/70 font-mono text-xs">
        {HEALTH_SEGMENTS.map(({ value, label }) => {
          const count = value === "" ? allCount : healthCounts.get(value) ?? 0;
          const isActive = selectedHealth === value;

          return (
            <button
              key={value}
              type="button"
              disabled={count === 0}
              onClick={() =>
                onHealthChange(isActive && value !== "" ? "" : value)
              }
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-teal-500/20 text-teal-200 font-semibold shadow-sm border border-teal-500/40"
                  : count === 0
                    ? "opacity-30 cursor-not-allowed text-archive-subtle"
                    : "text-archive-subtle hover:text-archive-text hover:bg-white/[0.04]"
              }`}
            >
              <span className="text-[11px] sm:text-xs">{label}</span>
              <span className="text-[10px] opacity-75 tabular-nums">
                {count.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GitHubFacetChipSection({
  title,
  placeholder,
  options,
  selectedValue,
  onChange,
}: {
  title: string;
  placeholder: string;
  options: GitHubFacetOption[];
  selectedValue: string;
  onChange: (value: string) => void;
}) {
  const [search, setSearch] = useState("");

  // Top 8 chips + currently selected item if not in top 8
  const topChips = useMemo(() => {
    const chips: GitHubFacetOption[] = [];
    const selectedOpt = options.find(
      (opt) => opt.value.toLowerCase() === selectedValue.toLowerCase(),
    );

    // If selected, always include selected option first
    if (selectedOpt) {
      chips.push(selectedOpt);
    }

    // Fill up to 8 with highest count options
    for (const opt of options) {
      if (
        chips.some(
          (c) => c.value.toLowerCase() === opt.value.toLowerCase(),
        )
      ) {
        continue;
      }
      chips.push(opt);
      if (chips.length >= 8) break;
    }
    return chips;
  }, [options, selectedValue]);

  // Filtered list when user types in search
  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return options.filter((opt) => {
      const label = opt.label.toLowerCase();
      const val = opt.value.toLowerCase();
      return label.includes(term) || val.includes(term);
    });
  }, [options, search]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-archive-subtle">
          {title}
        </span>
        {selectedValue && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="font-mono text-[10px] text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
          >
            Reset ×
          </button>
        )}
      </div>

      {/* Top 8 Chips */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
        {topChips.map((option) => {
          const isSelected =
            selectedValue.toLowerCase() === option.value.toLowerCase();
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(isSelected ? "" : option.value)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-sans transition-all duration-150 active:scale-95 cursor-pointer ${
                isSelected
                  ? "border border-teal-500/60 bg-teal-500/15 text-teal-300 font-medium shadow-[inset_0_0_0_1px_rgba(20,184,166,0.3)]"
                  : "border border-archive-border/60 bg-archive-surface/40 text-archive-subtle hover:border-teal-500/40 hover:bg-white/[0.04] hover:text-archive-text"
              }`}
            >
              <span>{option.label}</span>
              {isSelected ? (
                <span className="font-mono text-xs font-bold ml-0.5 opacity-80">
                  ×
                </span>
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
          placeholder={placeholder}
          className="w-full bg-archive-bg/90 border border-archive-border/70 rounded px-2.5 py-1.5 text-xs text-archive-text font-sans placeholder:text-archive-subtle/50 focus:outline-none focus:border-teal-500/60 transition-colors"
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
      {search.trim() && (
        <div className="max-h-48 overflow-y-auto drawer-scroll rounded border border-archive-border/80 bg-archive-bg/95 p-1 space-y-0.5 shadow-lg">
          {filteredOptions.length === 0 ? (
            <div className="py-2.5 text-center font-mono text-[11px] text-archive-subtle/60">
              No matches found
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected =
                selectedValue.toLowerCase() === option.value.toLowerCase();
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(isSelected ? "" : option.value);
                    setSearch("");
                  }}
                  className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded text-xs text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-teal-500/15 text-teal-300 font-medium"
                      : "text-archive-subtle hover:bg-white/[0.04] hover:text-archive-text"
                  }`}
                >
                  <span className="truncate mr-2">{option.label}</span>
                  <span className="font-mono text-[10px] tabular-nums shrink-0 opacity-60">
                    {option.count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function GitHubBrowseControls({
  mode,
  capabilityOptions,
  techStackOptions,
  healthCounts,
  selectedCapability,
  selectedTechStack,
  selectedHealth,
  localEntryCount,
  manualReviewCount,
  onCapabilityChange,
  onTechStackChange,
  onHealthChange,
}: GitHubBrowseControlsProps) {
  const hasTrustedTimeline = localEntryCount > 0 || manualReviewCount > 0;

  return (
    <section
      className="rounded-md border border-archive-border/55 bg-archive-surface/45 p-3 sm:p-4 flex flex-col gap-4"
      aria-label="GitHub collection browsing controls"
    >
      {/* Recall mode notification - only rendered if mode === "recall" */}
      {mode === "recall" && (
        <div
          className="rounded border border-amber-400/20 bg-amber-400/[0.04] px-3.5 py-2.5"
          aria-label="Personal timeline status"
        >
          <p className="font-mono text-[9px] uppercase tracking-widest text-amber-200/85 font-medium">
            {hasTrustedTimeline
              ? "Timeline in progress"
              : "Timeline not established"}
          </p>
          <p className="mt-1 font-sans text-[11px] leading-relaxed text-archive-subtle/80">
            {hasTrustedTimeline
              ? `${localEntryCount} local timestamps and ${manualReviewCount} manual reviews. Order continues by stable repository index.`
              : "Historical timestamps originate from bulk import and do not reflect personal discovery. Order continues by stable repository index."}
          </p>
        </div>
      )}

      {/* 1. 健康状态 Segmented Switch */}
      <HealthSegmentedControl
        selectedHealth={selectedHealth}
        healthCounts={healthCounts}
        onHealthChange={onHealthChange}
      />

      {/* 2 & 3. 能力 + 技术栈 Chips & Inline Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-archive-border/40">
        <GitHubFacetChipSection
          title="CAPABILITIES"
          placeholder="Search all capabilities…"
          options={capabilityOptions}
          selectedValue={selectedCapability}
          onChange={onCapabilityChange}
        />

        <GitHubFacetChipSection
          title="TECH STACK"
          placeholder="Search all stacks…"
          options={techStackOptions}
          selectedValue={selectedTechStack}
          onChange={onTechStackChange}
        />
      </div>
    </section>
  );
}
