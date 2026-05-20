"use client";

interface ResourceFiltersProps {
  language: "all" | "zh" | "en";
  onLanguageChange: (lang: "all" | "zh" | "en") => void;
  selectedTocPath: string[] | null;
  onClearTocPath: () => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

const LANG_OPTIONS = [
  { value: "all" as const, label: "All" },
  { value: "en" as const, label: "English" },
  { value: "zh" as const, label: "中文" },
];

export default function ResourceFilters({
  language,
  onLanguageChange,
  selectedTocPath,
  onClearTocPath,
  onClear,
  hasActiveFilters,
}: ResourceFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Language + Directory Path Indicator Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-archive-subtle mr-1">lang:</span>
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              id={`lang-filter-${opt.value}`}
              onClick={() => onLanguageChange(opt.value)}
              className={`filter-chip ${language === opt.value ? "active" : ""}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Selected Directory Path Pill */}
        {selectedTocPath && selectedTocPath.length > 0 && (
          <div className="flex items-center gap-1.5 bg-archive-border/20 border border-archive-border/40 rounded px-2.5 py-1 text-xs text-archive-text animate-fade-in">
            <span className="font-mono text-[10px] text-archive-subtle mr-0.5">path:</span>
            <span className="font-sans font-medium">
              {selectedTocPath.join(" → ")}
            </span>
            <button
              onClick={onClearTocPath}
              className="text-archive-subtle hover:text-archive-accent ml-1 transition-colors font-mono font-bold text-xs"
              title="Clear directory filter"
            >
              ×
            </button>
          </div>
        )}

        {hasActiveFilters && (
          <div className="ml-auto flex items-center gap-2">
            <span className="h-3 w-px bg-archive-border" />
            <button
              onClick={onClear}
              className="font-mono text-xs text-archive-subtle hover:text-archive-text transition-colors"
              id="filter-clear-btn"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

