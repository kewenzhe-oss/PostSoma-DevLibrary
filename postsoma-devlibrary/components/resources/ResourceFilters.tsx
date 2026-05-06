"use client";

interface ResourceFiltersProps {
  language: "all" | "zh" | "en";
  onLanguageChange: (lang: "all" | "zh" | "en") => void;
  category: string;
  categories: string[];
  onCategoryChange: (cat: string) => void;
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
  category,
  categories,
  onCategoryChange,
  onClear,
  hasActiveFilters,
}: ResourceFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Language + clear row */}
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

        {hasActiveFilters && (
          <>
            <span className="mx-1 h-3 w-px bg-archive-border" />
            <button
              onClick={onClear}
              className="font-mono text-xs text-archive-subtle hover:text-archive-text transition-colors"
              id="filter-clear-btn"
            >
              Clear filters
            </button>
          </>
        )}
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex items-start gap-2 flex-wrap">
          <span className="font-mono text-xs text-archive-subtle mt-1 shrink-0 mr-1">
            topic:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onCategoryChange("all")}
              className={`filter-chip ${category === "all" || !category ? "active" : ""}`}
              id="cat-filter-all"
            >
              All topics
            </button>
            {categories.slice(0, 24).map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`filter-chip ${category === cat ? "active" : ""}`}
                id={`cat-filter-${cat.replace(/\s+/g, "-").toLowerCase()}`}
              >
                {cat}
              </button>
            ))}
            {categories.length > 24 && (
              <span className="font-mono text-xs text-archive-subtle mt-1">
                +{categories.length - 24} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
