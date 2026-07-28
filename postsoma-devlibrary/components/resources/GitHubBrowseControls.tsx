"use client";

import type { ReactNode } from "react";
import {
  GITHUB_FAVORITE_HEALTH_VALUES,
  type GitHubFavoriteHealth,
} from "@/lib/types/github-favorite";
import type {
  GitHubBrowseMode,
  GitHubFacetOption,
} from "@/lib/data/github-search";
import { formatGitHubFacetLabel } from "@/lib/data/github-search";

interface GitHubBrowseControlsProps {
  mode: GitHubBrowseMode;
  onModeChange: (mode: GitHubBrowseMode) => void;
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

function FacetSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
      <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-archive-subtle/65">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 min-w-0 flex-1 rounded border border-archive-border/70 bg-archive-bg/65 px-2.5 font-mono text-[10px] text-archive-text outline-none transition-colors hover:border-archive-muted focus:border-teal-500/60 sm:w-44"
        aria-label={`Filter GitHub projects by ${label}`}
      >
        {children}
      </select>
    </label>
  );
}

export default function GitHubBrowseControls({
  mode,
  onModeChange,
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
      className="rounded-md border border-archive-border/55 bg-archive-surface/45 p-2.5 sm:p-3"
      aria-label="GitHub collection browsing controls"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="grid grid-cols-2 rounded border border-archive-border bg-archive-bg/60 p-0.5"
          role="tablist"
          aria-label="GitHub browse mode"
        >
          {(
            [
              ["topic", "按主题查找"],
              ["recall", "时光回顾"],
            ] as const
          ).map(([value, label]) => {
            const isActive = mode === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onModeChange(value)}
                className={`min-h-8 rounded px-3 text-[11px] font-medium transition-all ${
                  isActive
                    ? "bg-archive-border/70 text-teal-300 shadow-sm"
                    : "text-archive-subtle hover:text-archive-text"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {mode === "recall" && (
        <div
          className="mt-2.5 rounded border border-amber-400/15 bg-amber-400/[0.035] px-3 py-2"
          aria-label="Personal timeline status"
        >
          <p className="font-mono text-[9px] uppercase tracking-widest text-amber-200/75">
            {hasTrustedTimeline
              ? "个人时间线正在建立"
              : "个人时间线尚未建立"}
          </p>
          <p className="mt-1 font-sans text-[10px] leading-relaxed text-archive-subtle/75 sm:text-[11px]">
            {hasTrustedTimeline
              ? `已有 ${localEntryCount} 条真实本地收藏时间、${manualReviewCount} 条人工复查记录。历史批次仍不参与时间排序，当前继续按稳定库顺序展示。`
              : "历史时间来自同一批 AI 处理，不代表真实发现或个人复查。时间排序已暂停，当前按稳定库顺序展示。"}
          </p>
        </div>
      )}

      <div className="mt-2.5 flex flex-col gap-2 border-t border-archive-border/40 pt-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <FacetSelect
          label="Capability"
          value={selectedCapability}
          onChange={onCapabilityChange}
        >
          <option value="">All capabilities</option>
          {capabilityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </FacetSelect>

        <FacetSelect
          label="Stack"
          value={selectedTechStack}
          onChange={onTechStackChange}
        >
          <option value="">All tech stacks</option>
          {techStackOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </FacetSelect>

        <FacetSelect
          label="Health"
          value={selectedHealth}
          onChange={(value) =>
            onHealthChange(value as GitHubFavoriteHealth | "")
          }
        >
          <option value="">All health states</option>
          {GITHUB_FAVORITE_HEALTH_VALUES.map((health) => (
            <option key={health} value={health}>
              {formatGitHubFacetLabel(health)} ({healthCounts.get(health) ?? 0})
            </option>
          ))}
        </FacetSelect>
      </div>
    </section>
  );
}
