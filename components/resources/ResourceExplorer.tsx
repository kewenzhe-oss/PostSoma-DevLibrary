"use client";

import { useState, useMemo, useTransition, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import type { Resource, ResourceTocNode } from "@/lib/types/resource";
import ResourceSearch from "@/components/resources/ResourceSearch";
import ResourceGrid from "@/components/resources/ResourceGrid";
import ResourceToc from "@/components/resources/ResourceToc";
import EmptyState from "@/components/ui/EmptyState";
import BookmarkButton from "./BookmarkButton";
import { generateDescription, TYPE_LABELS } from "@/lib/utils/resource";
import { getProviderLabel } from "@/lib/utils/provider";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── State: single source of truth for all dimensions ──────────────────────
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"all" | "zh" | "en">("all");
  const [selectedCollection, setSelectedCollection] = useState<string>("books");
  const [selectedTocPath, setSelectedTocPath] = useState<string[] | null>(null);
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [previewTopic, setPreviewTopic] = useState<{ topicName: string; category: string; subcategory?: string; resources: Resource[] } | null>(null);
  const [viewMode, setViewMode] = useState<"topics" | "resources">("topics");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [, startTransition] = useTransition();



  // Sync viewMode default state to collection type (topics for books/courses, resources for cheat sheets/interactive)
  useEffect(() => {
    if (selectedCollection === "books" || selectedCollection === "courses") {
      setViewMode("topics");
    } else {
      setViewMode("resources");
    }
  }, [selectedCollection]);

  const resultsTopRef = useRef<HTMLDivElement | null>(null);

  // Sync state from URL search parameters on mount & searchParams changes
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const lang = (searchParams.get("lang") || "all") as "all" | "zh" | "en";
    const col = searchParams.get("col") || "books";
    const pathVal = searchParams.get("path");
    const path = pathVal ? pathVal.split(":") : null;

    setQuery((current) => (current !== q ? q : current));
    setLanguage((current) => (current !== lang ? lang : current));
    setSelectedCollection((current) => (current !== col ? col : current));
    setSelectedTocPath((current) => {
      const currentStr = current ? current.join(":") : "";
      const newStr = pathVal || "";
      return currentStr !== newStr ? path : current;
    });
  }, [searchParams]);

  // Keep stateRef in sync for debounced query sync to URL
  const stateRef = useRef({ query, language, selectedCollection, selectedTocPath });
  useEffect(() => {
    stateRef.current = { query, language, selectedCollection, selectedTocPath };
  }, [query, language, selectedCollection, selectedTocPath]);

  // Helper to synchronize active state parameters to browser URL
  const syncToUrl = (
    q: string,
    lang: string,
    col: string,
    path: string[] | null
  ) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q);
    if (lang !== "all") params.set("lang", lang);
    if (col !== "books") params.set("col", col);
    if (path && path.length > 0) params.set("path", path.join(":"));

    const qs = params.toString();
    const target = `${pathname}${qs ? "?" + qs : ""}`;
    router.replace(target, { scroll: false });
  };

  // Debounced search query URL synchronization
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  function handleQueryChange(newQuery: string) {
    setQuery(newQuery);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      syncToUrl(
        newQuery,
        stateRef.current.language,
        stateRef.current.selectedCollection,
        stateRef.current.selectedTocPath
      );
    }, 250);
  }

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

  // Lazy loading / pagination state for scroll performance
  const [visibleCount, setVisibleCount] = useState(24);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const resultsRef = useRef(results);
  resultsRef.current = results;

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setVisibleCount((prev) => Math.min(prev + 24, resultsRef.current.length));
          }
        },
        { rootMargin: "200px" }
      );
      observerRef.current.observe(node);
    }
  }, []);

  // Reset pagination count on search/filter changes
  useEffect(() => {
    setVisibleCount(24);
  }, [query, language, selectedCollection, selectedTocPath]);

  const displayedResults = useMemo(() => {
    return results.slice(0, visibleCount);
  }, [results, visibleCount]);

  // Scroll Restoration and Card Highlighting on Mount / results loaded
  useEffect(() => {
    if (typeof sessionStorage === "undefined" || results.length === 0) return;

    const lastClickedId = sessionStorage.getItem("postsoma_last_clicked_id");
    if (!lastClickedId) return;

    // Wait for the render loop to complete and element to be in the DOM
    const timer = setTimeout(() => {
      const cardElement = document.getElementById(`resource-card-${lastClickedId}`);
      if (cardElement) {
        cardElement.scrollIntoView({ block: "center", behavior: "auto" });

        // Apply visual glow highlight
        cardElement.classList.add(
          "ring-2",
          "ring-teal-500/50",
          "shadow-[0_0_15px_rgba(20,184,166,0.25)]",
          "bg-teal-500/[0.03]"
        );

        // Clear keys so it doesn't re-trigger on subsequent filters
        sessionStorage.removeItem("postsoma_last_clicked_id");
        sessionStorage.removeItem("postsoma_scroll_y");

        // Gracefully remove visual highlight classes after 2 seconds
        setTimeout(() => {
          cardElement.classList.remove(
            "ring-2",
            "ring-teal-500/50",
            "shadow-[0_0_15px_rgba(20,184,166,0.25)]",
            "bg-teal-500/[0.03]"
          );
        }, 2000);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [results]);

  const hasActiveFilters =
    query !== "" || language !== "all" || selectedTocPath !== null;

  const activeFilterCount = (language !== "all" ? 1 : 0) + (selectedTocPath ? 1 : 0);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleClear() {
    startTransition(() => {
      setQuery("");
      setLanguage("all");
      setSelectedTocPath(null);
      syncToUrl("", "all", selectedCollection, null);
    });
  }

  function handlePopularPillClick(pillValue: string) {
    startTransition(() => {
      setSelectedTocPath(null);
      setQuery(pillValue);
      syncToUrl(pillValue, language, selectedCollection, null);
    });
  }

  function handleCollectionSelect(colId: string) {
    if (selectedCollection === colId) return;
    startTransition(() => {
      setSelectedCollection(colId);
      setSelectedTocPath(null);
      syncToUrl(query, language, colId, null);
    });
  }

  function handleSelectTocPath(path: string[] | null) {
    startTransition(() => {
      setSelectedTocPath(path);
      syncToUrl(query, language, selectedCollection, path);
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
      syncToUrl(query, lang, selectedCollection, selectedTocPath);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Mobile Sticky Filter & Search Area ──────────────── */}
      <div className="sticky top-[56px] lg:relative lg:top-0 z-30 bg-archive-bg/95 backdrop-blur-md -mx-4 px-4 py-3 lg:mx-0 lg:px-0 lg:py-0 border-b border-archive-border/50 lg:border-none flex flex-col gap-3">
        {/* Search Input + Filter button on mobile */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ResourceSearch
              value={query}
              onChange={handleQueryChange}
              resultCount={results.length}
            />
          </div>
          <button
            onClick={() => setIsFilterDrawerOpen(true)}
            className="lg:hidden h-[38px] px-3.5 border border-archive-border bg-archive-surface rounded-sm text-archive-subtle hover:text-archive-text flex items-center justify-center gap-1.5 active:scale-95 active:bg-archive-muted/40 transition-all shrink-0"
            title="Open Directory & Filters"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            <span className="text-xs font-mono hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-archive-accent text-archive-bg font-mono text-[9px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Collection Tabs */}
        {collections && collections.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-archive-border/30 no-scrollbar">
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

        {/* Popular Topics Pill Bar — hidden on extra-small screens to save space */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] text-archive-subtle opacity-60">
            Popular:
          </span>
          {["React", "Python", "TypeScript", "Docker", "SQL", "AI"].map((pill) => (
            <button
              key={pill}
              onClick={() => handlePopularPillClick(pill)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono border transition-all ${
                query.toLowerCase() === pill.toLowerCase()
                  ? "border-archive-accent text-archive-accent bg-archive-accent/5"
                  : "border-archive-border text-archive-subtle hover:border-archive-muted hover:text-archive-text bg-transparent"
              }`}
            >
              #{pill.toLowerCase()}
            </button>
          ))}
        </div>

        {/* Active Filter Chips */}
        <div className="flex items-center gap-3 flex-wrap min-h-[20px] empty:hidden">
          {/* Path breadcrumb pill */}
          {selectedTocPath && selectedTocPath.length > 0 && (
            <PathPill
              path={selectedTocPath}
              onClear={() => handleSelectTocPath(null)}
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
                onClick={() => handleLanguageChange("all")}
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

        {/* Dynamic View Mode Layout Toggle */}
        <div className="ml-auto flex items-center bg-archive-surface border border-archive-border rounded p-0.5 select-none animate-fade-in shrink-0">
          <button
            onClick={() => setViewMode("topics")}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-medium transition-all ${
              viewMode === "topics"
                ? "bg-archive-border text-archive-accent shadow-sm"
                : "text-archive-subtle hover:text-archive-text"
            }`}
            title="Browse by dynamic guided topic-level clusters"
          >
            Guided Topics
          </button>
          <button
            onClick={() => setViewMode("resources")}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-medium transition-all ${
              viewMode === "resources"
                ? "bg-archive-border text-archive-accent shadow-sm"
                : "text-archive-subtle hover:text-archive-text"
            }`}
            title="Browse raw individual resources archive"
          >
            Raw Archives
          </button>
        </div>
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



        {/* Card Grid */}
        <div className="flex-1 w-full min-w-0">
          {displayedResults.length > 0 ? (
            <>
              <ResourceGrid
                resources={displayedResults}
                viewMode={viewMode}
                language={language}
                onPreview={setPreviewResource}
                onPreviewTopic={setPreviewTopic}
              />
              {results.length > visibleCount && (
                <div ref={sentinelRef} className="py-8 flex justify-center w-full">
                  <button
                    onClick={() => setVisibleCount((prev) => Math.min(prev + 24, results.length))}
                    className="px-6 py-2.5 rounded border border-archive-border hover:border-archive-muted text-xs font-mono text-archive-subtle hover:text-archive-text bg-archive-surface active:scale-95 transition-all"
                  >
                    Load More (showing {visibleCount} of {results.length})
                  </button>
                </div>
              )}
            </>
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

      {previewResource && (
        <ResourceDrawer
          resource={previewResource}
          language={language}
          onClose={() => setPreviewResource(null)}
        />
      )}

      {previewTopic && (
        <TopicDrawer
          topicName={previewTopic.topicName}
          category={previewTopic.category}
          subcategory={previewTopic.subcategory}
          resources={previewTopic.resources}
          language={language}
          onClose={() => setPreviewTopic(null)}
        />
      )}

      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        language={language}
        onLanguageChange={handleLanguageChange}
        flatActiveNodes={flatActiveNodes}
        selectedTocPath={selectedTocPath}
        onSelectTocPath={handleSelectTocPath}
        resultCount={results.length}
      />
    </div>
  );
}

// ─── Mobile Filter Drawer Component ─────────────────────────────────────────────

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: "all" | "zh" | "en";
  onLanguageChange: (lang: "all" | "zh" | "en") => void;
  flatActiveNodes: ResourceTocNode[];
  selectedTocPath: string[] | null;
  onSelectTocPath: (path: string[] | null) => void;
  resultCount: number;
}

function FilterDrawer({
  isOpen,
  onClose,
  language,
  onLanguageChange,
  flatActiveNodes,
  selectedTocPath,
  onSelectTocPath,
  resultCount,
}: FilterDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Preserve and restore body scroll correctly
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  // Focus trap, Escape key, and initial/return focus
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;

      const timer = setTimeout(() => {
        const focusables = drawerRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables && focusables.length > 0) {
          (focusables[0] as HTMLElement).focus();
        }
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Tab") {
          const focusables = drawerRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as NodeListOf<HTMLElement>;
          if (!focusables || focusables.length === 0) return;

          const first = focusables[0]!;
          const last = focusables[focusables.length - 1]!;

          if (e.shiftKey) {
            if (document.activeElement === first) {
              last.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("keydown", handleKeyDown);
        triggerRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end overflow-hidden font-sans md:hidden">
      {/* Backdrop overlay */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Sheet container */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filters and Directory"
        className={`relative w-full max-h-[85vh] bg-archive-surface border-t border-archive-border rounded-t-xl shadow-2xl flex flex-col transition-transform duration-300 ease-out transform z-10 ${
          mounted ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Drag handle decoration */}
        <div className="flex justify-center py-2 shrink-0">
          <div className="w-12 h-1 bg-archive-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-archive-border/60 shrink-0">
          <h3 className="font-mono text-xs uppercase tracking-widest text-archive-subtle font-semibold">
            Filters & Directory
          </h3>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full border border-archive-border text-archive-subtle hover:text-archive-text hover:bg-archive-border/50 transition-all text-lg font-mono"
            aria-label="Close filters"
          >
            ×
          </button>
        </div>

        {/* Scrollable contents */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 drawer-scroll">
          {/* Section 1: Language */}
          <div className="space-y-2.5">
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle border-b border-archive-border/40 pb-1 font-bold">
              Language / 语言
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {(["all", "en", "zh"] as const).map((lang) => {
                const isActive = language === lang;
                return (
                  <button
                    key={lang}
                    onClick={() => onLanguageChange(lang)}
                    className={`h-11 px-3 rounded text-xs font-mono border transition-all flex items-center justify-center active:scale-95 ${
                      isActive
                        ? "text-teal-300 bg-teal-500/10 border-teal-500/30 font-semibold"
                        : "text-archive-subtle border-archive-border/60 hover:text-archive-text"
                    }`}
                  >
                    {lang === "zh" ? "中文 (ZH)" : lang === "en" ? "English (EN)" : "All (全部)"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Directory Categories */}
          <div className="space-y-2.5">
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle border-b border-archive-border/40 pb-1 font-bold">
              Directory / 目录分类
            </h4>
            <div className="flex flex-col gap-1.5 max-h-[35vh] overflow-y-auto pr-1">
              {flatActiveNodes.length === 0 ? (
                <p className="py-4 text-xs font-mono text-archive-subtle opacity-40 text-center">
                  No categories available
                </p>
              ) : (
                flatActiveNodes.map((node) => {
                  const isSelected = selectedTocPath?.join(":") === node.path.join(":");
                  return (
                    <button
                      key={node.id}
                      disabled={node.resourceCount === 0}
                      onClick={() => {
                        onSelectTocPath(isSelected ? null : node.path);
                      }}
                      className={`text-left px-3 py-3 h-12 rounded transition-all duration-150 flex items-center justify-between border active:scale-[0.99] ${
                        node.resourceCount === 0
                          ? "opacity-25 pointer-events-none"
                          : isSelected
                          ? "text-teal-300 bg-teal-500/10 border-teal-500/30"
                          : "text-archive-subtle hover:text-archive-text bg-archive-bg/20 border-archive-border/40 hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="text-xs truncate mr-2">{node.label}</span>
                      <span className="font-mono text-[10px] opacity-55 shrink-0 bg-archive-muted/40 px-1.5 py-0.5 rounded">
                        {node.resourceCount}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-archive-border/60 bg-archive-bg/30 p-4 shrink-0 flex flex-col gap-2">
          <button
            onClick={onClose}
            className="w-full h-12 bg-teal-500 text-archive-bg text-sm font-sans font-semibold flex items-center justify-center rounded hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Show {resultCount.toLocaleString()} Resource{resultCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Resource Preview Drawer Component ──────────────────────────────────────────

interface ResourceDrawerProps {
  resource: Resource;
  language: "all" | "zh" | "en";
  onClose: () => void;
}

function ResourceDrawer({ resource, language, onClose }: ResourceDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    triggerRef.current = document.activeElement as HTMLElement;

    const animTimer = setTimeout(() => setMounted(true), 10);
    const focusTimer = setTimeout(() => {
      const focusables = drawerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables && focusables.length > 0) {
        (focusables[0] as HTMLElement).focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "Tab") {
        const focusables = drawerRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as NodeListOf<HTMLElement>;
        if (!focusables || focusables.length === 0) return;

        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalStyle;
      triggerRef.current?.focus();
    };
  }, []);

  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 250); // Wait for transition animation to finish
  };

  const queryString = searchParams ? searchParams.toString() : "";
  const detailUrl = `/resource/${resource.id}${queryString ? "?" + queryString : ""}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden font-sans">
      {/* Backdrop overlay */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Side sheet container */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Resource Details"
        className={`relative w-full sm:w-[460px] h-full bg-archive-surface border-l border-archive-border shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${
          mounted ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Subtle background glow aesthetic */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-archive-accent opacity-[0.02] rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-archive-border/60 shrink-0 bg-archive-bg/10 relative z-10">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle">
              Resource Preview
            </span>
          </div>
          <button
            onClick={handleClose}
            className="w-11 h-11 md:w-8 md:h-8 flex items-center justify-center rounded-full border border-archive-border text-archive-subtle hover:text-archive-text hover:bg-archive-border/50 hover:border-archive-muted transition-all duration-150 text-lg font-mono"
            aria-label="Close preview"
          >
            ×
          </button>
        </div>

        {/* Scrollable details */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 drawer-scroll relative z-10">
          {/* Header Row: badges & ID */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={resource.language === "zh" ? "lang-badge-zh" : "lang-badge-en"}
            >
              {resource.language === "zh" ? "中文" : "English"}
            </span>
            <span className="type-badge capitalize">{TYPE_LABELS[resource.type] || resource.type}</span>
            <span className="font-mono text-[10px] text-archive-subtle ml-auto">
              ID: {resource.id.slice(0, 8)}
            </span>
          </div>

          {/* Title */}
          <div>
            <h2 className="font-display text-2xl text-archive-text font-semibold leading-snug group-hover:text-archive-accent-glow transition-colors duration-150">
              {resource.title}
            </h2>
          </div>

          {/* Description Block */}
          <div className="bg-archive-bg/40 p-4 border border-archive-border rounded-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-archive-accent/40" />
            <p className="font-sans text-xs text-archive-subtle leading-relaxed">
              {generateDescription(resource, language)}
            </p>
          </div>

          {/* Metadata Fields */}
          <div className="space-y-4 pt-2">
            <div>
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle mb-1">
                Category
              </h4>
              <p className="font-sans text-sm text-archive-text">
                {resource.category}
                {resource.subcategory && (
                  <span>
                    <span className="mx-1.5 opacity-40">/</span>
                    {resource.subcategory}
                  </span>
                )}
              </p>
            </div>

            <div>
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle mb-1">
                Provider
              </h4>
              <p className="font-sans text-sm text-archive-text">
                {getProviderLabel(resource.url)}
              </p>
            </div>

            <div>
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle mb-1">
                Direct URL
              </h4>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-archive-accent-dim hover:text-archive-accent transition-colors break-all inline-flex items-center gap-1"
              >
                {resource.url}
                <span>↗</span>
              </a>
            </div>
          </div>

          {/* Tags */}
          <div className="pt-2 border-t border-archive-border/40">
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle mb-2">
              Tags
            </h4>
            <div className="flex gap-1.5 flex-wrap">
              {resource.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[10px] px-2.5 py-1 bg-archive-bg border border-archive-border rounded-sm text-archive-subtle hover:text-archive-text transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-archive-border/60 bg-archive-bg/30 p-6 flex flex-col gap-3 shrink-0 relative z-10">
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 bg-archive-accent text-archive-bg text-sm font-sans font-medium flex items-center justify-center gap-2 rounded-sm hover:opacity-90 transition-opacity duration-150"
          >
            Open Resource ↗
          </a>
          
          <div className="flex gap-3">
            <div className="flex-1">
              <BookmarkButton resourceId={resource.id} variant="full" />
            </div>
            <Link
              href={detailUrl}
              onClick={() => {
                // Ensure scroll position context is preserved if they go to details page from drawer
                if (typeof sessionStorage !== "undefined") {
                  sessionStorage.setItem("postsoma_last_clicked_id", resource.id);
                  sessionStorage.setItem("postsoma_scroll_y", String(window.scrollY));
                }
              }}
              className="px-4 rounded-sm border border-archive-border text-archive-subtle hover:text-archive-text hover:border-archive-muted text-xs font-sans font-medium flex items-center justify-center transition-all"
              title="Open full page"
            >
              Full Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bilingual Translation Chrome ──────────────────────────────────────────────

const UI_TEXT = {
  zh: {
    previewHeader: "主题预览",
    topicGroup: "主题分组",
    whatItCovers: "主题概述",
    whoIsItForText: "适合希望系统掌握该技术领域的开发者、学习者与进阶工程师。",
    startHere: "推荐起步",
    startHereReason: "该资源结构严谨，内容全面，非常适合作为本主题的第一个切入点。",
    providers: "优质源头与平台",
    resourcesInTopic: "收录的全部资源",
    selectToDetail: "点击下方资源查看详情或直接前往学习：",
    backToTopic: "← 返回主题概述",
    openResource: "开启学习 ↗",
    closeBtn: "关闭",
    topicBreakdown: "主题数据分析",
    langDist: "语言分布",
    resourceTypeMix: "资源类型占比",
    uniqueProviders: "合作平台与提供商",
  },
  en: {
    previewHeader: "Topic Preview",
    topicGroup: "Topic Group",
    whatItCovers: "What this topic covers",
    whoIsItForText: "Developers, students, and engineers looking to systematically master this technical domain.",
    startHere: "Recommended Start",
    startHereReason: "This resource is comprehensive and well-structured, making it the perfect first step for this topic.",
    providers: "Providers & Sources",
    resourcesInTopic: "Included Resources",
    selectToDetail: "Select a resource below to view details and launch:",
    backToTopic: "← Back to Topic Overview",
    openResource: "Open Resource ↗",
    closeBtn: "Close",
    topicBreakdown: "Topic Breakdown Analysis",
    langDist: "Language Distribution",
    resourceTypeMix: "Resource Type Mix",
    uniqueProviders: "Unique Providers",
  },
};

const COLLECTION_LABELS: Record<string, { zh: string; en: string }> = {
  books: { zh: "本书籍", en: "books" },
  courses: { zh: "门课程/资源", en: "courses/resources" },
  cheat_sheets: { zh: "个速查表", en: "cheat sheets" },
  interactive: { zh: "个互动教程", en: "interactive sites" },
  unknown: { zh: "个资源", en: "resources" },
};

// ─── Topic Preview Drawer Component ──────────────────────────────────────────

interface TopicDrawerProps {
  topicName: string;
  category: string;
  subcategory?: string;
  resources: Resource[];
  language: "all" | "zh" | "en";
  onClose: () => void;
}

function TopicDrawer({
  topicName,
  category,
  subcategory,
  resources,
  language,
  onClose,
}: TopicDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    triggerRef.current = document.activeElement as HTMLElement;

    const animTimer = setTimeout(() => setMounted(true), 10);
    const focusTimer = setTimeout(() => {
      const focusables = drawerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables && focusables.length > 0) {
        (focusables[0] as HTMLElement).focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "Tab") {
        const focusables = drawerRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as NodeListOf<HTMLElement>;
        if (!focusables || focusables.length === 0) return;

        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalStyle;
      triggerRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    if (mounted) {
      const timer = setTimeout(() => {
        const focusables = drawerRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables && focusables.length > 0) {
          (focusables[0] as HTMLElement).focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedResource, mounted]);

  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 250);
  };

  const isZh = language === "zh";
  const chrome = isZh ? UI_TEXT.zh : UI_TEXT.en;
  
  // Topic metadata
  const count = resources.length;
  const sampleResource = resources[0];
  const collectionKey = sampleResource?.collection || "unknown";
  const labelObj = COLLECTION_LABELS[collectionKey] || COLLECTION_LABELS.unknown;
  const collectionLabel = isZh ? labelObj.zh : labelObj.en;

  const summaryText = isZh
    ? `已收录 ${count} ${collectionLabel}，涵盖 ${topicName} 的核心概念、入门教程与进阶实战项目，由各大优质平台及社区提供。`
    : `A curated collection of ${count} ${collectionLabel} covering ${topicName} core fundamentals, syntax patterns, and hands-on developer projects.`;

  // Start here recommendation (featured or fallback to first)
  const recommendedResource = useMemo(() => {
    return resources.find((r) => r.quality === "featured") || resources[0];
  }, [resources]);

  // Unique list of normalized providers
  const uniqueProviders = useMemo(() => {
    const set = new Set(resources.map((r) => getProviderLabel(r.url)));
    return Array.from(set);
  }, [resources]);

  // Topic breakdown telemetry data
  const langDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of resources) {
      counts[r.language] = (counts[r.language] || 0) + 1;
    }
    return Object.entries(counts).map(([lang, cnt]) => {
      const label = lang === "zh" ? (isZh ? "中文" : "Chinese") : (isZh ? "英文" : "English");
      return `${cnt} ${label}`;
    }).join(", ");
  }, [resources, isZh]);

  const typeMix = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of resources) {
      const typeLabel = TYPE_LABELS[r.type] || r.type;
      counts[typeLabel] = (counts[typeLabel] || 0) + 1;
    }
    return Object.entries(counts).map(([type, cnt]) => {
      const displayType = isZh
        ? (type === "book" ? "书籍" : type === "course" ? "课程" : type === "tutorial" ? "教程" : type === "docs" ? "文档" : type === "interactive" ? "互动" : type === "article" ? "文章" : "资源")
        : `${type}${cnt > 1 ? "s" : ""}`;
      return isZh ? `${cnt} 个${displayType}` : `${cnt} ${displayType}`;
    }).join(", ");
  }, [resources, isZh]);

  const providerCountLabel = useMemo(() => {
    const cnt = uniqueProviders.length;
    return isZh
      ? `${cnt} 个平台`
      : `${cnt} platform${cnt > 1 ? "s" : ""}`;
  }, [uniqueProviders, isZh]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden font-sans">
      {/* Backdrop overlay */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Side sheet container */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Topic Details"
        className={`relative w-full sm:w-[460px] h-full bg-archive-surface border-l border-archive-border shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${
          mounted ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-archive-accent opacity-[0.02] rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-archive-border/60 shrink-0 bg-archive-bg/10 relative z-10">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle">
              {selectedResource ? "Resource Detail" : chrome.previewHeader}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="w-11 h-11 md:w-8 md:h-8 flex items-center justify-center rounded-full border border-archive-border text-archive-subtle hover:text-archive-text hover:bg-archive-border/50 hover:border-archive-muted transition-all duration-150 text-lg font-mono"
            aria-label="Close preview"
          >
            ×
          </button>
        </div>

        {/* Scrollable details */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 drawer-scroll relative z-10">
          {selectedResource ? (
            /* Subview: Resource-level details */
            <div className="space-y-6 animate-fade-in">
              <button
                onClick={() => setSelectedResource(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-archive-border text-xs font-mono text-archive-subtle hover:text-archive-text hover:bg-white/[0.04] transition-all"
              >
                {chrome.backToTopic}
              </button>

              <div className="flex items-center gap-2 flex-wrap pt-2">
                <span className={selectedResource.language === "zh" ? "lang-badge-zh" : "lang-badge-en"}>
                  {selectedResource.language === "zh" ? "中文" : "English"}
                </span>
                <span className="type-badge capitalize">{TYPE_LABELS[selectedResource.type] || selectedResource.type}</span>
                <span className="font-mono text-[10px] text-archive-subtle ml-auto">
                  ID: {selectedResource.id.slice(0, 8)}
                </span>
              </div>

              <div>
                <h2 className="font-display text-xl text-archive-text font-semibold leading-snug">
                  {selectedResource.title}
                </h2>
              </div>

              <div className="bg-archive-bg/40 p-4 border border-archive-border rounded-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-archive-accent/40" />
                <p className="font-sans text-xs text-archive-subtle leading-relaxed">
                  {generateDescription(selectedResource, language)}
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle mb-1">
                    Category
                  </h4>
                  <p className="font-sans text-sm text-archive-text">
                    {selectedResource.category}
                    {selectedResource.subcategory && (
                      <span>
                        <span className="mx-1.5 opacity-40">/</span>
                        {selectedResource.subcategory}
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle mb-1">
                    Provider
                  </h4>
                  <p className="font-sans text-sm text-archive-text">
                    {getProviderLabel(selectedResource.url)}
                  </p>
                </div>

                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle mb-1">
                    Direct URL
                  </h4>
                  <a
                    href={selectedResource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-archive-accent-dim hover:text-archive-accent transition-colors break-all inline-flex items-center gap-1"
                  >
                    {selectedResource.url}
                    <span>↗</span>
                  </a>
                </div>
              </div>

              <div className="pt-2 border-t border-archive-border/40">
                <h4 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle mb-2">
                  Tags
                </h4>
                <div className="flex gap-1.5 flex-wrap">
                  {selectedResource.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[10px] px-2.5 py-1 bg-archive-bg border border-archive-border rounded-sm text-archive-subtle hover:text-archive-text transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Main view: Topic-level details */
            <div className="space-y-6 animate-fade-in">
              {/* Category Breadcrumb */}
              <p className="font-mono text-[10px] text-archive-subtle tracking-wider uppercase">
                {category}
                {subcategory && (
                  <span>
                    <span className="mx-1.5 opacity-40">/</span>
                    {subcategory}
                  </span>
                )}
              </p>

              {/* Title & Count */}
              <div>
                <span className="type-badge uppercase font-mono tracking-wider font-semibold text-[10px] mb-2 inline-block">
                  {count} {collectionLabel}
                </span>
                <h2 className="font-display text-2xl text-archive-text font-semibold leading-snug">
                  {topicName}
                </h2>
              </div>

              {/* Summary Section */}
              <div className="space-y-2">
                <h4 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle border-b border-archive-border/40 pb-1">
                  {chrome.whatItCovers}
                </h4>
                <p className="font-sans text-xs text-archive-subtle leading-relaxed">
                  {summaryText}
                </p>
                <p className="font-sans text-[11px] text-archive-subtle/70 leading-relaxed italic">
                  {chrome.whoIsItForText}
                </p>
              </div>

              {/* Topic Breakdown */}
              <div className="space-y-2">
                <h4 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle border-b border-archive-border/40 pb-1">
                  {chrome.topicBreakdown}
                </h4>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px] text-archive-subtle">
                  <div className="flex flex-col gap-0.5 p-2 bg-archive-bg/30 border border-archive-border/50 rounded-sm">
                    <span className="opacity-50 uppercase tracking-wider text-[8px]">{chrome.langDist}</span>
                    <span className="text-archive-text font-medium">{langDistribution}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 p-2 bg-archive-bg/30 border border-archive-border/50 rounded-sm">
                    <span className="opacity-50 uppercase tracking-wider text-[8px]">{chrome.resourceTypeMix}</span>
                    <span className="text-archive-text font-medium">{typeMix}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 p-2 bg-archive-bg/30 border border-archive-border/50 rounded-sm col-span-2">
                    <span className="opacity-50 uppercase tracking-wider text-[8px]">{chrome.uniqueProviders}</span>
                    <span className="text-archive-text font-medium">{providerCountLabel}</span>
                  </div>
                </div>
              </div>

              {/* Start Here Recommendation */}
              {recommendedResource && (
                <div className="bg-teal-500/[0.02] border border-teal-500/20 rounded p-4 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-teal-500/50" />
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-wider font-bold text-teal-400">
                      ⭐ {chrome.startHere}
                    </span>
                    <span className="text-[9px] font-mono text-archive-subtle">
                      {getProviderLabel(recommendedResource.url)}
                    </span>
                  </div>
                  <h4 className="font-sans text-xs text-archive-text font-semibold leading-tight line-clamp-1">
                    {recommendedResource.title}
                  </h4>
                  <p className="font-sans text-[10px] text-archive-subtle leading-normal">
                    {chrome.startHereReason}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setSelectedResource(recommendedResource)}
                      className="px-2.5 py-1 rounded border border-teal-500/30 text-[10px] font-mono text-teal-300 hover:bg-teal-500/10 transition-all"
                    >
                      Inspect Details
                    </button>
                    <a
                      href={recommendedResource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-teal-500/10 hover:bg-teal-500/20 text-[10px] font-mono text-teal-300 transition-all inline-flex items-center gap-0.5"
                    >
                      {chrome.openResource}
                    </a>
                  </div>
                </div>
              )}

              {/* Providers Summary */}
              {uniqueProviders.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle border-b border-archive-border/40 pb-1">
                    {chrome.providers}
                  </h4>
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {uniqueProviders.map((prov) => (
                      <span
                        key={prov}
                        className="text-[9px] font-mono px-2 py-0.5 rounded-sm bg-archive-surface border border-archive-border text-archive-accent-dim select-none"
                      >
                        {prov}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resources drill down list */}
              <div className="space-y-3 pt-2 border-t border-archive-border/40">
                <h4 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle">
                  {chrome.resourcesInTopic} ({count})
                </h4>
                <p className="font-sans text-[10px] text-archive-subtle/80">
                  {chrome.selectToDetail}
                </p>
                <div className="space-y-2 max-h-[30vh] overflow-y-auto drawer-scroll pr-1">
                  {resources.map((res) => {
                    const prov = getProviderLabel(res.url);
                    return (
                      <div
                        key={res.id}
                        onClick={() => setSelectedResource(res)}
                        className="flex flex-col gap-1 p-2.5 border border-archive-border rounded bg-archive-surface/40 hover:bg-white/[0.03] hover:border-archive-border cursor-pointer transition-all duration-150 active:scale-[0.99] active:bg-archive-muted/40 group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[8px] opacity-40 group-hover:opacity-75 transition-opacity capitalize">
                            {TYPE_LABELS[res.type] || res.type}
                          </span>
                          <span className="font-mono text-[8px] text-archive-accent-dim">
                            {prov}
                          </span>
                        </div>
                        <h5 className="font-sans text-xs text-archive-subtle group-hover:text-archive-text transition-colors leading-tight line-clamp-1">
                          {res.title}
                        </h5>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-archive-border/60 bg-archive-bg/30 p-6 flex flex-col gap-3 shrink-0 relative z-10">
          {selectedResource ? (
            <>
              <a
                href={selectedResource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 bg-archive-accent text-archive-bg text-sm font-sans font-medium flex items-center justify-center gap-2 rounded-sm hover:opacity-90 transition-opacity duration-150"
              >
                {chrome.openResource}
              </a>
              <div className="flex gap-3">
                <div className="flex-1">
                  <BookmarkButton resourceId={selectedResource.id} variant="full" />
                </div>
                <Link
                  href={`/resource/${selectedResource.id}`}
                  className="px-4 rounded-sm border border-archive-border text-archive-subtle hover:text-archive-text hover:border-archive-muted text-xs font-sans font-medium flex items-center justify-center transition-all"
                >
                  Full Details
                </Link>
              </div>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="w-full h-11 border border-archive-border hover:border-archive-muted text-archive-text text-sm font-sans font-medium flex items-center justify-center rounded-sm transition-colors duration-150"
            >
              {chrome.closeBtn}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
