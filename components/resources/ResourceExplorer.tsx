"use client";

import { useState, useMemo, useTransition, useRef, useEffect } from "react";
import type { Resource, ResourceTocNode } from "@/lib/types/resource";
import ResourceSearch from "@/components/resources/ResourceSearch";
import ResourceFilters from "@/components/resources/ResourceFilters";
import ResourceGrid from "@/components/resources/ResourceGrid";
import ResourceToc from "@/components/resources/ResourceToc";
import EmptyState from "@/components/ui/EmptyState";
import { searchResources } from "@/lib/data/search";

function getVisibleTocNodes(
  collection: string,
  language: string,
  nodes: ResourceTocNode[]
): ResourceTocNode[] {
  if (collection === "books" && language === "en") {
    const bySubject = nodes.find((n) => n.label === "BY SUBJECT");
    return bySubject?.children ?? nodes;
  }
  return nodes;
}

function doesTocPathExist(nodes: ResourceTocNode[], targetPath: string[]): boolean {
  if (!targetPath || targetPath.length === 0) return true;
  
  for (const node of nodes) {
    if (node.path.join(":") === targetPath.join(":")) return true;
    if (node.children && doesTocPathExist(node.children, targetPath)) return true;
  }
  return false;
}

interface ResourceExplorerProps {
  resources: Resource[];
  categories: string[]; // Kept for interface compatibility, but mostly unused now
  tocNodes: Record<string, Record<string, ResourceTocNode[]>>;
  collections: { id: string; label: string; count: number }[];
}

export default function ResourceExplorer({
  resources,
  categories,
  tocNodes,
  collections,
}: ResourceExplorerProps) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"all" | "zh" | "en">("all");
  const [category, setCategory] = useState("all");
  const [selectedCollection, setSelectedCollection] = useState<string>("books");
  const [selectedTocPath, setSelectedTocPath] = useState<string[] | null>(null);
  const [, startTransition] = useTransition();

  const resultsTopRef = useRef<HTMLDivElement | null>(null);

  const rawTocNodes = tocNodes[selectedCollection]?.[language] || [];
  const visibleTocNodes = useMemo(() => {
    return getVisibleTocNodes(selectedCollection, language, rawTocNodes);
  }, [selectedCollection, language, rawTocNodes]);

  const activeTopics = useMemo(() => {
    return visibleTocNodes.map(n => n.label).sort((a, b) => a.localeCompare(b));
  }, [visibleTocNodes]);

  // Safely clear state if invalid after collection/language change
  useEffect(() => {
    if (selectedTocPath && !doesTocPathExist(visibleTocNodes, selectedTocPath)) {
      setSelectedTocPath(null);
    }
  }, [visibleTocNodes, selectedTocPath]);

  useEffect(() => {
    if (category !== "all" && !activeTopics.includes(category)) {
      setCategory("all");
    }
  }, [activeTopics, category]);

  const results = useMemo(() => {
    return searchResources(resources, { 
      query, 
      language, 
      category, 
      collection: selectedCollection,
      tocPath: selectedTocPath || undefined, 
      limit: 300 
    });
  }, [resources, query, language, category, selectedCollection, selectedTocPath]);

  const hasActiveFilters =
    query !== "" || language !== "all" || (category !== "all" && category !== "") || selectedTocPath !== null;

  function handleClear() {
    startTransition(() => {
      setQuery("");
      setLanguage("all");
      setCategory("all");
      setSelectedTocPath(null);
    });
  }

  function handleCollectionSelect(colId: string) {
    if (selectedCollection === colId) return;
    startTransition(() => {
      setSelectedCollection(colId);
      // Let effects handle invalid state clearing to avoid flash, or we can force it here
      // The effects will run right after this render anyway.
    });
  }

  function handleSelectTocPath(path: string[] | null) {
    startTransition(() => {
      setSelectedTocPath(path);
      // Auto-scroll to results top on directory click
      requestAnimationFrame(() => {
        resultsTopRef.current?.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
      });
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Collection Tabs */}
      {collections && collections.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 archive-divider-bottom no-scrollbar">
          {collections.map((col) => (
            <button
              key={col.id}
              onClick={() => handleCollectionSelect(col.id)}
              className={`px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCollection === col.id
                  ? "bg-archive-border/30 text-archive-accent"
                  : "text-archive-subtle hover:bg-archive-border/10 hover:text-archive-text"
              }`}
            >
              {col.label}
              <span className="ml-2 font-mono text-[10px] opacity-60">
                {col.count}
              </span>
            </button>
          ))}
        </div>
      )}

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
        categories={activeTopics}
        onCategoryChange={(c) => startTransition(() => setCategory(c))}
        onClear={handleClear}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Divider + count (Scroll Target) */}
      <div 
        ref={resultsTopRef}
        className="flex items-center gap-4 archive-divider pt-3 scroll-mt-24"
      >
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

      {/* Layout: TOC + Grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* TOC Sidebar */}
        <aside className="w-full lg:w-64 lg:sticky lg:top-24 shrink-0">
          <ResourceToc 
            nodes={visibleTocNodes} 
            selectedPath={selectedTocPath} 
            onSelectPath={handleSelectTocPath} 
          />
        </aside>

        {/* Grid or empty state */}
        <div className="flex-1 w-full min-w-0">
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
      </div>
    </div>
  );
}
