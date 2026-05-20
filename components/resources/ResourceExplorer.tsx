"use client";

import { useState, useMemo, useTransition, useRef, useEffect } from "react";
import type { Resource, ResourceTocNode } from "@/lib/types/resource";
import ResourceSearch from "@/components/resources/ResourceSearch";
import ResourceGrid from "@/components/resources/ResourceGrid";
import ResourceToc from "@/components/resources/ResourceToc";
import EmptyState from "@/components/ui/EmptyState";
import { searchResources } from "@/lib/data/search";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function doesTocPathExist(nodes: ResourceTocNode[], targetPath: string[]): boolean {
  if (!targetPath || targetPath.length === 0) return true;
  for (const node of nodes) {
    if (node.path.join(":") === targetPath.join(":")) return true;
    if (node.children && doesTocPathExist(node.children, targetPath)) return true;
  }
  return false;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResourceExplorerProps {
  resources: Resource[];
  categories: string[];
  tocNodes: Record<string, Record<string, ResourceTocNode[]>>;
  collections: { id: string; label: string; count: number }[];
}

// ─── Path Breadcrumb Pill ─────────────────────────────────────────────────────

function PathPill({
  path,
  onClear,
}: {
  path: string[];
  onClear: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-teal-500/8 border border-teal-500/20 rounded-full px-3 py-1 text-xs animate-fade-in">
      <span className="font-mono text-[10px] text-archive-subtle mr-0.5">path:</span>
      <span className="font-sans text-teal-300 font-medium truncate max-w-[220px]">
        {path.join(" → ")}
      </span>
      <button
        onClick={onClear}
        className="text-archive-subtle hover:text-teal-300 transition-colors font-mono font-bold text-xs ml-0.5 shrink-0"
        title="Clear directory filter"
      >
        ×
      </button>
    </div>
  );
}

// ─── Collection Tab ───────────────────────────────────────────────────────────

function CollectionTab({
  collection,
  isActive,
  onClick,
}: {
  collection: { id: string; label: string; count: number };
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 whitespace-nowrap border ${
        isActive
          ? "bg-archive-border/30 text-archive-accent border-archive-border shadow-sm"
          : "text-archive-subtle hover:bg-archive-border/10 hover:text-archive-text border-transparent"
      }`}
    >
      {collection.label}
      <span className="ml-2 font-mono text-[10px] opacity-55 tabular-nums">
        {collection.count.toLocaleString()}
      </span>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResourceExplorer({
  resources,
  categories,
  tocNodes,
  collections,
}: ResourceExplorerProps) {
  // ── State: single source of truth for all dimensions ──────────────────────
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"all" | "zh" | "en">("all");
  const [selectedCollection, setSelectedCollection] = useState<string>("books");
  const [selectedTocPath, setSelectedTocPath] = useState<string[] | null>(null);
  const [, startTransition] = useTransition();

  const resultsTopRef = useRef<HTMLDivElement | null>(null);

  // ── Reactive TOC data: always current for (collection, language) ───────────
  const tocAllLangs = useMemo(() => {
    const collectionToc = tocNodes[selectedCollection] ?? {};
    return {
      zh: (collectionToc["zh"] ?? []) as ResourceTocNode[],
      en: (collectionToc["en"] ?? []) as ResourceTocNode[],
      all: (collectionToc["all"] ?? []) as ResourceTocNode[],
    };
  }, [tocNodes, selectedCollection]);

  // Flatten all nodes for path validation
  const flatActiveNodes = useMemo(() => {
    return tocAllLangs[language] ?? tocAllLangs.all ?? [];
  }, [tocAllLangs, language]);

  // ── Clear stale path after collection/language switch ─────────────────────
  useEffect(() => {
    if (selectedTocPath && !doesTocPathExist(flatActiveNodes, selectedTocPath)) {
      setSelectedTocPath(null);
    }
  }, [flatActiveNodes, selectedTocPath]);

  // ── Multi-dimension search/filter results ─────────────────────────────────
  const results = useMemo(() => {
    return searchResources(resources, {
      query,
      language,
      category: "all",
      collection: selectedCollection,
      tocPath: selectedTocPath ?? undefined,
      limit: 300,
    });
  }, [resources, query, language, selectedCollection, selectedTocPath]);

  const hasActiveFilters =
    query !== "" || language !== "all" || selectedTocPath !== null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleClear() {
    startTransition(() => {
      setQuery("");
      setLanguage("all");
      setSelectedTocPath(null);
    });
  }

  function handleCollectionSelect(colId: string) {
    if (selectedCollection === colId) return;
    startTransition(() => {
      setSelectedCollection(colId);
      // Reset path since new collection may have different TOC shape
      setSelectedTocPath(null);
    });
  }

  function handleSelectTocPath(path: string[] | null) {
    startTransition(() => {
      setSelectedTocPath(path);
      // Soft scroll to results anchor (doesn't jump aggressively)
      requestAnimationFrame(() => {
        resultsTopRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    });
  }

  function handleLanguageChange(lang: "all" | "zh" | "en") {
    startTransition(() => {
      setLanguage(lang);
      // Path may become invalid for new language; effect will clean it up
    });
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Collection Tabs ─────────────────────────────────────────────── */}
      {collections && collections.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-archive-border/50 no-scrollbar">
          {collections.map((col) => (
            <CollectionTab
              key={col.id}
              collection={col}
              isActive={selectedCollection === col.id}
              onClick={() => handleCollectionSelect(col.id)}
            />
          ))}
        </div>
      )}

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <ResourceSearch
        value={query}
        onChange={(val) => startTransition(() => setQuery(val))}
        resultCount={results.length}
      />

      {/* ── Active Filter State Summary ──────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap min-h-[28px]">
        {/* Path breadcrumb pill */}
        {selectedTocPath && selectedTocPath.length > 0 && (
          <PathPill
            path={selectedTocPath}
            onClear={() => startTransition(() => setSelectedTocPath(null))}
          />
        )}

        {/* Language pill (shown when not "all") */}
        {language !== "all" && (
          <div className="inline-flex items-center gap-1.5 bg-archive-border/20 border border-archive-border/40 rounded-full px-3 py-1 text-xs animate-fade-in">
            <span className="font-mono text-[10px] text-archive-subtle mr-0.5">lang:</span>
            <span className="font-sans text-archive-text font-medium">
              {language === "zh" ? "中文" : "English"}
            </span>
            <button
              onClick={() => startTransition(() => setLanguage("all"))}
              className="text-archive-subtle hover:text-archive-accent transition-colors font-mono font-bold text-xs ml-0.5 shrink-0"
            >
              ×
            </button>
          </div>
        )}

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="ml-auto font-mono text-xs text-archive-subtle hover:text-archive-text transition-colors"
          >
            Clear all ×
          </button>
        )}
      </div>

      {/* ── Results Count ────────────────────────────────────────────────── */}
      <div
        ref={resultsTopRef}
        className="flex items-center gap-4 border-t border-archive-border/50 pt-3 scroll-mt-8"
      >
        <span className="font-mono text-xs text-archive-subtle">
          <span className="text-archive-text font-semibold tabular-nums">
            {results.length.toLocaleString()}
          </span>{" "}
          resource{results.length !== 1 ? "s" : ""}
          {hasActiveFilters && " found"}
        </span>
        {/* Active collection badge */}
        <span className="font-mono text-[10px] text-archive-subtle opacity-50 border border-archive-border/40 px-2 py-0.5 rounded-full">
          {collections.find((c) => c.id === selectedCollection)?.label ?? selectedCollection}
        </span>
      </div>

      {/* ── Dual Layout: Mini Rail + Card Grid ──────────────────────────── */}
      <div className="flex gap-0 w-full items-start">
        {/* Sticky Mini Rail — desktop only */}
        <div className="hidden lg:block sticky top-6 shrink-0 self-start z-40">
          <ResourceToc
            tocAllLangs={tocAllLangs}
            selectedCollection={selectedCollection}
            language={language}
            onLanguageChange={handleLanguageChange}
            selectedPath={selectedTocPath}
            onSelectPath={handleSelectTocPath}
          />
        </div>

        {/* Mobile: collapsible flat TOC */}
        <details className="lg:hidden w-full group mb-4 border border-archive-border/40 rounded-lg overflow-hidden">
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-mono text-archive-subtle hover:text-archive-text list-none py-2.5 px-4 bg-archive-surface/60">
            <svg
              className="w-3.5 h-3.5 transition-transform group-open:rotate-90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Directory
            {selectedTocPath && (
              <span className="ml-auto text-teal-400 text-[10px] truncate max-w-[160px]">
                {selectedTocPath[selectedTocPath.length - 1]}
              </span>
            )}
          </summary>
          {/* Mobile language toggle */}
          <div className="flex gap-1.5 px-4 pt-3 pb-1">
            {(["all", "en", "zh"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`text-xs font-mono px-2.5 py-1 rounded-md border transition-all ${
                  language === lang
                    ? "text-teal-300 bg-teal-500/10 border-teal-500/20"
                    : "text-archive-subtle border-archive-border/40 hover:text-archive-text hover:bg-white/[0.04]"
                }`}
              >
                {lang === "zh" ? "中文" : lang === "en" ? "EN" : "All"}
              </button>
            ))}
          </div>
          <div className="px-3 pb-3 pt-1 flex flex-col gap-0.5 max-h-64 overflow-y-auto">
            {flatActiveNodes.map((node) => (
              <button
                key={node.id}
                disabled={node.resourceCount === 0}
                onClick={() =>
                  handleSelectTocPath(
                    selectedTocPath?.join(":") === node.path.join(":") ? null : node.path
                  )
                }
                className={`text-left px-3 py-2 rounded-md text-sm transition-all duration-150 ${
                  node.resourceCount === 0
                    ? "opacity-30 pointer-events-none"
                    : selectedTocPath?.join(":") === node.path.join(":")
                    ? "text-teal-300 bg-teal-500/10 border border-teal-500/20"
                    : "text-archive-subtle hover:text-archive-text hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                {node.label}
                <span className="ml-2 font-mono text-[10px] opacity-50">
                  {node.resourceCount}
                </span>
              </button>
            ))}
          </div>
        </details>

        {/* Card Grid */}
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
              action={{ label: "Clear all filters", onClick: handleClear }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
