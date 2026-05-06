"use client";

import { useState, useMemo, useTransition } from "react";
import type { Resource } from "@/lib/types/resource";
import ResourceSearch from "@/components/resources/ResourceSearch";
import ResourceFilters from "@/components/resources/ResourceFilters";
import ResourceGrid from "@/components/resources/ResourceGrid";
import EmptyState from "@/components/ui/EmptyState";
import { searchResources } from "@/lib/data/search";

interface ResourceExplorerProps {
  resources: Resource[];
  categories: string[];
}

export default function ResourceExplorer({
  resources,
  categories,
}: ResourceExplorerProps) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"all" | "zh" | "en">("all");
  const [category, setCategory] = useState("all");
  const [, startTransition] = useTransition();

  const results = useMemo(() => {
    return searchResources(resources, { query, language, category, limit: 300 });
  }, [resources, query, language, category]);

  const hasActiveFilters =
    query !== "" || language !== "all" || (category !== "all" && category !== "");

  function handleClear() {
    startTransition(() => {
      setQuery("");
      setLanguage("all");
      setCategory("all");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <ResourceSearch
        value={query}
        onChange={(val) => startTransition(() => setQuery(val))}
        resultCount={results.length}
      />

      {/* Filters */}
      <ResourceFilters
        language={language}
        onLanguageChange={(l) => startTransition(() => setLanguage(l))}
        category={category}
        categories={categories}
        onCategoryChange={(c) => startTransition(() => setCategory(c))}
        onClear={handleClear}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Divider + count */}
      <div className="flex items-center gap-4 archive-divider pt-3">
        <span className="font-mono text-xs text-archive-subtle">
          {results.length.toLocaleString()} resource
          {results.length !== 1 ? "s" : ""}
          {hasActiveFilters && ` found`}
        </span>
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="font-mono text-xs text-archive-subtle hover:text-archive-text transition-colors ml-auto"
          >
            × clear
          </button>
        )}
      </div>

      {/* Grid or empty state */}
      {results.length > 0 ? (
        <ResourceGrid resources={results} />
      ) : (
        <EmptyState
          icon="search"
          title="No resources found"
          description={
            query
              ? `No results for "${query}". Try a broader search or different filters.`
              : "No resources match the current filters."
          }
          action={{ label: "Clear filters", onClick: handleClear }}
        />
      )}
    </div>
  );
}
