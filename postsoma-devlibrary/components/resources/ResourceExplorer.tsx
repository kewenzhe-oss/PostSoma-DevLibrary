"use client";

import { useState, useMemo, useTransition, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import type {
  CanonicalTopicId,
  Resource,
  ResourceLanguage,
  ResourceTocNode,
  ResourceType,
} from "@/lib/types/resource";
import type {
  GitHubFavorite,
  GitHubFavoriteHealth,
} from "@/lib/types/github-favorite";
import ResourceSearch, {
  type ResourceSearchChangeOptions,
} from "@/components/resources/ResourceSearch";
import ResourceGrid from "@/components/resources/ResourceGrid";
import ResourceFacetPanel from "@/components/resources/ResourceFacetPanel";
import GitHubBrowseControls from "@/components/resources/GitHubBrowseControls";
import EmptyState from "@/components/ui/EmptyState";
import BookmarkButton from "./BookmarkButton";
import { TYPE_LABELS } from "@/lib/utils/resource";
import { getProviderLabel } from "@/lib/utils/provider";
import { searchResources } from "@/lib/data/search";
import {
  buildResourceFacetModel,
  CANONICAL_TOPIC_LABELS,
  filterResourcesByFacets,
  getCanonicalTopicLabel,
  getResourceFacetBreadcrumb,
  humanizeId,
  type ResourceFacetSelection,
} from "@/lib/data/resource-facets";
import {
  buildGitHubFacetOptions,
  formatGitHubFacetLabel,
  searchGitHubFavorites,
} from "@/lib/data/github-search";
import { linkGitHubFavoritesToResources } from "@/lib/data/github-favorite-linking";
import type { GitHubBrowseMode } from "@/lib/data/github-search";
import {
  GitHubCapabilityTags,
  GitHubHealthBadge,
  GitHubResearchDetails,
} from "./GitHubFavoriteMeta";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function doesTocPathExist(nodes: ResourceTocNode[], targetPath: string[]): boolean {
  if (!targetPath || targetPath.length === 0) return true;
  for (const node of nodes) {
    if (node.path.join(":") === targetPath.join(":")) return true;
    if (node.children && doesTocPathExist(node.children, targetPath)) return true;
  }
  return false;
}

const RESOURCE_TYPE_VALUES: ResourceType[] = [
  "book",
  "course",
  "tutorial",
  "documentation",
  "interactive",
  "article",
  "app",
  "library",
  "framework",
  "cli",
  "collection",
  "extension",
  "unknown",
];

const CANONICAL_TOPIC_IDS = new Set(
  CANONICAL_TOPIC_LABELS.map((topic) => topic.id),
);

const INTERNAL_URL_SYNC_TTL_MS = 5_000;

const COLLECTION_CONTEXT: Record<string, string> = {
  books: "Build durable foundations from long-form references.",
  courses: "Follow structured instruction and guided lessons.",
  cheat_sheets: "Recall syntax and patterns at the moment of use.",
  interactive: "Practice concepts through exercises, playgrounds and visual tools.",
};

function readMultiValueParam(
  params: Readonly<URLSearchParams>,
  key: string,
): string[] {
  return params
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResourceExplorerProps {
  resources: Resource[];
  tocNodes: Record<string, Record<string, ResourceTocNode[]>>;
  collections: { id: string; label: string; count: number }[];
  githubFavorites: GitHubFavorite[];
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

function GitHubFilterPill({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/8 px-3 py-1 text-xs animate-fade-in">
      <span className="font-mono text-[10px] text-archive-subtle">
        {label}:
      </span>
      <span className="font-sans font-medium text-teal-300">{value}</span>
      <button
        type="button"
        onClick={onClear}
        className="ml-0.5 shrink-0 font-mono text-xs font-bold text-archive-subtle transition-colors hover:text-teal-300"
        aria-label={`Clear ${label} filter`}
      >
        ×
      </button>
    </div>
  );
}

function PublicFilterPill({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-archive-border/60 bg-archive-surface/80 px-3 py-1 text-xs animate-fade-in">
      <span className="font-mono text-[9px] uppercase tracking-wider text-archive-subtle/60">
        {label}
      </span>
      <span className="max-w-[180px] truncate font-sans font-medium text-archive-text">
        {value}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="ml-0.5 shrink-0 font-mono text-xs font-bold text-archive-subtle transition-colors hover:text-archive-accent"
        aria-label={`Clear ${label} ${value}`}
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
  tocNodes,
  collections,
  githubFavorites,
}: ResourceExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── State: single source of truth for all dimensions ──────────────────────
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [language, setLanguage] = useState<"all" | "zh" | "en">("all");
  const [selectedCollection, setSelectedCollection] = useState<string>("books");
  const [selectedTocPath, setSelectedTocPath] = useState<string[] | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<CanonicalTopicId[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<ResourceType[]>([]);
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [githubBrowseMode, setGithubBrowseMode] =
    useState<GitHubBrowseMode>("topic");
  const [githubCapability, setGithubCapability] = useState("");
  const [githubTechStack, setGithubTechStack] = useState("");
  const [githubHealth, setGithubHealth] =
    useState<GitHubFavoriteHealth | "">("");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [, startTransition] = useTransition();
  const showPublicFacets = selectedCollection !== "github";

  const githubFavoritesById = useMemo(
    () =>
      new Map(
        githubFavorites.map((favorite) => [favorite.id, favorite] as const),
      ),
    [githubFavorites],
  );
  const githubFavoriteLinks = useMemo(
    () => linkGitHubFavoritesToResources(resources, githubFavorites),
    [resources, githubFavorites],
  );
  // The public resource index de-duplicates external URLs. The GitHub view is
  // intentionally backed by the canonical favorites collection, so its tab
  // count must include a favorite that shares an upstream Book/Course URL.
  const displayCollections = useMemo(
    () =>
      collections.map((collection) =>
        collection.id === "github"
          ? { ...collection, count: githubFavorites.length }
          : collection,
      ),
    [collections, githubFavorites.length],
  );
  const githubCapabilityOptions = useMemo(
    () => buildGitHubFacetOptions(githubFavorites, "capabilities"),
    [githubFavorites],
  );
  const githubTechStackOptions = useMemo(
    () => buildGitHubFacetOptions(githubFavorites, "techStack"),
    [githubFavorites],
  );
  const githubHealthCounts = useMemo(() => {
    const counts = new Map<GitHubFavoriteHealth, number>();
    for (const favorite of githubFavorites) {
      if (!favorite.lastCheckedAt) continue;
      counts.set(favorite.health, (counts.get(favorite.health) ?? 0) + 1);
    }
    return counts;
  }, [githubFavorites]);
  const githubTimelineCounts = useMemo(
    () => ({
      localEntries: githubFavorites.filter(
        (favorite) => favorite.discoveredAtSource === "local-entry",
      ).length,
      manualReviews: githubFavorites.filter(
        (favorite) => favorite.lastReviewedAtSource === "manual-review",
      ).length,
    }),
    [githubFavorites],
  );

  const resultsTopRef = useRef<HTMLDivElement | null>(null);
  const latestQueryRef = useRef("");
  const pendingInternalUrlsRef = useRef(new Map<string, number>());

  // Sync state from URL search parameters on mount & searchParams changes
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const currentQueryString = searchParams.toString();
    const currentTarget = `${pathname}${currentQueryString ? "?" + currentQueryString : ""}`;
    const internalSyncStartedAt = pendingInternalUrlsRef.current.get(currentTarget);
    const isRecentInternalSync =
      internalSyncStartedAt !== undefined &&
      Date.now() - internalSyncStartedAt <= INTERNAL_URL_SYNC_TTL_MS;

    if (internalSyncStartedAt !== undefined) {
      pendingInternalUrlsRef.current.delete(currentTarget);
    }

    // A previously issued router.replace can finish after the user has typed
    // more characters. Ignore that stale internal navigation instead of
    // echoing its older q value back into the controlled input.
    if (isRecentInternalSync && q !== latestQueryRef.current) {
      return;
    }

    const lang = (searchParams.get("lang") || "all") as "all" | "zh" | "en";
    const col = searchParams.get("col") || "books";
    const pathVal = searchParams.get("path");
    const path = pathVal ? pathVal.split(":") : null;
    const topics = readMultiValueParam(searchParams, "topic").filter(
      (value): value is CanonicalTopicId =>
        CANONICAL_TOPIC_IDS.has(value as CanonicalTopicId),
    );
    const subcategories = readMultiValueParam(searchParams, "sub");
    const resourceTypes = readMultiValueParam(searchParams, "type").filter(
      (value): value is ResourceType =>
        RESOURCE_TYPE_VALUES.includes(value as ResourceType),
    );
    const githubMode =
      searchParams.get("ghmode") === "recall" ? "recall" : "topic";
    const capability = searchParams.get("cap") || "";
    const techStack = searchParams.get("stack") || "";
    const healthParam = searchParams.get("health");
    const health: GitHubFavoriteHealth | "" =
      healthParam === "active" ||
      healthParam === "quiet" ||
      healthParam === "archived" ||
      healthParam === "unavailable"
        ? healthParam
        : "";
    latestQueryRef.current = q;
    setQuery((current) => (current !== q ? q : current));
    setLanguage((current) => (current !== lang ? lang : current));
    setSelectedCollection((current) => (current !== col ? col : current));
    setSelectedTocPath((current) => {
      const currentStr = current ? current.join(":") : "";
      const newStr = pathVal || "";
      return currentStr !== newStr ? path : current;
    });
    setSelectedTopics((current) =>
      current.join(",") !== topics.join(",") ? topics : current,
    );
    setSelectedSubcategories((current) =>
      current.join(",") !== subcategories.join(",") ? subcategories : current,
    );
    setSelectedResourceTypes((current) =>
      current.join(",") !== resourceTypes.join(",") ? resourceTypes : current,
    );
    setGithubBrowseMode((current) =>
      current !== githubMode ? githubMode : current,
    );
    setGithubCapability((current) =>
      current !== capability ? capability : current,
    );
    setGithubTechStack((current) =>
      current !== techStack ? techStack : current,
    );
    setGithubHealth((current) => (current !== health ? health : current));
  }, [pathname, searchParams]);

  // Keep stateRef in sync for debounced query sync to URL
  const stateRef = useRef({
    query,
    language,
    selectedCollection,
    selectedTocPath,
    selectedTopics,
    selectedSubcategories,
    selectedResourceTypes,
    githubBrowseMode,
    githubCapability,
    githubTechStack,
    githubHealth,
  });
  useEffect(() => {
    stateRef.current = {
      query,
      language,
      selectedCollection,
      selectedTocPath,
      selectedTopics,
      selectedSubcategories,
      selectedResourceTypes,
      githubBrowseMode,
      githubCapability,
      githubTechStack,
      githubHealth,
    };
  }, [
    query,
    language,
    selectedCollection,
    selectedTocPath,
    selectedTopics,
    selectedSubcategories,
    selectedResourceTypes,
    githubBrowseMode,
    githubCapability,
    githubTechStack,
    githubHealth,
  ]);

  // Helper to synchronize active state parameters to browser URL
  const syncToUrl = useCallback(
    (
      q: string,
      lang: string,
      col: string,
      path: string[] | null,
      githubOverrides: Partial<{
        mode: GitHubBrowseMode;
        capability: string;
        techStack: string;
        health: GitHubFavoriteHealth | "";
      }> = {},
      publicFacetOverrides: Partial<{
        topics: CanonicalTopicId[];
        subcategories: string[];
        resourceTypes: ResourceType[];
      }> = {},
    ) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q);
      if (lang !== "all") params.set("lang", lang);
      if (col !== "books") params.set("col", col);
      if (path && path.length > 0) params.set("path", path.join(":"));
      if (col === "github") {
        const mode = githubOverrides.mode ?? stateRef.current.githubBrowseMode;
        const capability =
          githubOverrides.capability ?? stateRef.current.githubCapability;
        const techStack =
          githubOverrides.techStack ?? stateRef.current.githubTechStack;
        const health = githubOverrides.health ?? stateRef.current.githubHealth;

        if (mode === "recall") params.set("ghmode", mode);
        if (capability) params.set("cap", capability);
        if (techStack) params.set("stack", techStack);
        if (health) params.set("health", health);
      } else {
        const topics =
          publicFacetOverrides.topics ?? stateRef.current.selectedTopics;
        const subcategories =
          publicFacetOverrides.subcategories ??
          stateRef.current.selectedSubcategories;
        const resourceTypes =
          publicFacetOverrides.resourceTypes ??
          stateRef.current.selectedResourceTypes;
        topics.forEach((topic) => params.append("topic", topic));
        subcategories.forEach((subcategory) => params.append("sub", subcategory));
        resourceTypes.forEach((resourceType) => params.append("type", resourceType));
      }

      const qs = params.toString();
      const target = `${pathname}${qs ? "?" + qs : ""}`;
      const currentQueryString = searchParams.toString();
      const currentTarget = `${pathname}${currentQueryString ? "?" + currentQueryString : ""}`;

      if (target === currentTarget) return;

      const now = Date.now();
      for (const [pendingTarget, startedAt] of pendingInternalUrlsRef.current) {
        if (now - startedAt > INTERNAL_URL_SYNC_TTL_MS) {
          pendingInternalUrlsRef.current.delete(pendingTarget);
        }
      }
      pendingInternalUrlsRef.current.set(target, now);
      router.replace(target, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Debounced search query URL synchronization
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleQueryChange = useCallback(
    (
      newQuery: string,
      options: ResourceSearchChangeOptions = {},
    ) => {
      latestQueryRef.current = newQuery;
      setQuery(newQuery);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // IMEs emit intermediate controlled-input values while composing. Keep
      // those visible locally, but do not navigate until compositionend commits
      // the final text.
      if (options.isComposing) return;

      debounceTimer.current = setTimeout(() => {
        syncToUrl(
          newQuery,
          stateRef.current.language,
          stateRef.current.selectedCollection,
          stateRef.current.selectedTocPath,
        );
      }, options.commitImmediately ? 0 : 250);
    },
    [syncToUrl],
  );

  useEffect(
    () => () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      pendingInternalUrlsRef.current.clear();
    },
    [],
  );

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

  const publicFacetSelection = useMemo<ResourceFacetSelection>(
    () => ({
      topics: selectedTopics,
      subcategories: selectedSubcategories,
      languages: language === "all" ? [] : [language],
      resourceTypes: selectedResourceTypes,
    }),
    [language, selectedResourceTypes, selectedSubcategories, selectedTopics],
  );

  // Query first, then apply the independent facets. The complete query result
  // set is retained so each facet can calculate useful disjunctive counts.
  const publicSearchBase = useMemo(() => {
    if (selectedCollection === "github") return [];
    return searchResources(resources, {
      query,
      language: "all",
      category: "all",
      collection: selectedCollection,
      tocPath: selectedTocPath ?? undefined,
      limit: resources.length,
    });
  }, [query, resources, selectedCollection, selectedTocPath]);

  const resourceFacetModel = useMemo(
    () => buildResourceFacetModel(publicSearchBase, publicFacetSelection),
    [publicFacetSelection, publicSearchBase],
  );

  // ── Multi-dimension search/filter results ─────────────────────────────────
  const searchOutcome = useMemo(() => {
    if (selectedCollection === "github") {
      return searchGitHubFavorites(
        githubFavoriteLinks.resources,
        githubFavoriteLinks.favoritesByResourceId,
        {
          query,
          capability: githubCapability,
          techStack: githubTechStack,
          health: githubHealth,
          mode: githubBrowseMode,
          limit: githubFavoriteLinks.resources.length,
        },
      );
    }

    return {
      resources: filterResourcesByFacets(publicSearchBase, publicFacetSelection),
      matchReasonsById: new Map(),
    };
  }, [
    query,
    selectedCollection,
    publicFacetSelection,
    publicSearchBase,
    githubFavoriteLinks,
    githubCapability,
    githubTechStack,
    githubHealth,
    githubBrowseMode,
  ]);
  const results = searchOutcome.resources;
  const githubMatchReasonsById = searchOutcome.matchReasonsById;

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
  }, [
    query,
    language,
    selectedCollection,
    selectedTocPath,
    selectedTopics,
    selectedSubcategories,
    selectedResourceTypes,
    githubCapability,
    githubTechStack,
    githubHealth,
    githubBrowseMode,
  ]);

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

  const hasGitHubStructuredFilters =
    selectedCollection === "github" &&
    Boolean(githubCapability || githubTechStack || githubHealth);
  const hasActiveFilters =
    query !== "" ||
    language !== "all" ||
    selectedTocPath !== null ||
    selectedTopics.length > 0 ||
    selectedSubcategories.length > 0 ||
    selectedResourceTypes.length > 0 ||
    hasGitHubStructuredFilters;

  const activeFilterCount =
    (language !== "all" ? 1 : 0) +
    (selectedTocPath ? 1 : 0) +
    selectedTopics.length +
    selectedSubcategories.length +
    selectedResourceTypes.length +
    (selectedCollection === "github" && githubCapability ? 1 : 0) +
    (selectedCollection === "github" && githubTechStack ? 1 : 0) +
    (selectedCollection === "github" && githubHealth ? 1 : 0);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleClear() {
    startTransition(() => {
      latestQueryRef.current = "";
      setQuery("");
      setLanguage("all");
      setSelectedTocPath(null);
      setSelectedTopics([]);
      setSelectedSubcategories([]);
      setSelectedResourceTypes([]);
      if (selectedCollection === "github") {
        setGithubCapability("");
        setGithubTechStack("");
        setGithubHealth("");
      }
      syncToUrl("", "all", selectedCollection, null, {
        capability: "",
        techStack: "",
        health: "",
      }, {
        topics: [],
        subcategories: [],
        resourceTypes: [],
      });
    });
  }

  function handleCollectionSelect(colId: string) {
    if (selectedCollection === colId) return;
    startTransition(() => {
      setSelectedCollection(colId);
      setSelectedTocPath(null);
      setSelectedTopics([]);
      setSelectedSubcategories([]);
      setSelectedResourceTypes([]);
      syncToUrl(query, language, colId, null, {}, {
        topics: [],
        subcategories: [],
        resourceTypes: [],
      });
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

  function handleLanguageFacetToggle(value: ResourceLanguage) {
    const nextLanguage =
      language === "all" ? (value === "zh" ? "en" : "zh") : "all";
    handleLanguageChange(nextLanguage);
  }

  function handleTopicToggle(value: CanonicalTopicId) {
    const next = selectedTopics.includes(value)
      ? selectedTopics.filter((topic) => topic !== value)
      : [...selectedTopics, value];
    startTransition(() => {
      setSelectedTopics(next);
      syncToUrl(query, language, selectedCollection, selectedTocPath, {}, {
        topics: next,
      });
    });
  }

  function handleSubcategoryToggle(value: string) {
    const next = selectedSubcategories.includes(value)
      ? selectedSubcategories.filter((subcategory) => subcategory !== value)
      : [...selectedSubcategories, value];
    startTransition(() => {
      setSelectedSubcategories(next);
      syncToUrl(query, language, selectedCollection, selectedTocPath, {}, {
        subcategories: next,
      });
    });
  }

  function handleResourceTypeToggle(value: ResourceType) {
    const next = selectedResourceTypes.includes(value)
      ? selectedResourceTypes.filter((resourceType) => resourceType !== value)
      : [...selectedResourceTypes, value];
    startTransition(() => {
      setSelectedResourceTypes(next);
      syncToUrl(query, language, selectedCollection, selectedTocPath, {}, {
        resourceTypes: next,
      });
    });
  }

  function handleClearPublicFacets() {
    startTransition(() => {
      setLanguage("all");
      setSelectedTocPath(null);
      setSelectedTopics([]);
      setSelectedSubcategories([]);
      setSelectedResourceTypes([]);
      syncToUrl(query, "all", selectedCollection, null, {}, {
        topics: [],
        subcategories: [],
        resourceTypes: [],
      });
    });
  }

  function handleGitHubModeChange(mode: GitHubBrowseMode) {
    startTransition(() => {
      setGithubBrowseMode(mode);
      syncToUrl(query, language, selectedCollection, selectedTocPath, {
        mode,
      });
    });
  }

  function handleGitHubCapabilityChange(capability: string) {
    startTransition(() => {
      setGithubCapability(capability);
      syncToUrl(query, language, selectedCollection, selectedTocPath, {
        capability,
      });
    });
  }

  function handleGitHubTechStackChange(techStack: string) {
    startTransition(() => {
      setGithubTechStack(techStack);
      syncToUrl(query, language, selectedCollection, selectedTocPath, {
        techStack,
      });
    });
  }

  function handleGitHubHealthChange(health: GitHubFavoriteHealth | "") {
    startTransition(() => {
      setGithubHealth(health);
      syncToUrl(query, language, selectedCollection, selectedTocPath, {
        health,
      });
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
              totalCount={resources.length}
            />
          </div>
          {(showPublicFacets || selectedCollection === "github") && (
            <button
              onClick={() => setIsFilterDrawerOpen(true)}
              className="lg:hidden h-11 px-3.5 border border-archive-border bg-archive-surface rounded-sm text-archive-subtle hover:text-archive-text flex items-center justify-center gap-1.5 active:scale-95 active:bg-archive-muted/40 transition-all shrink-0 cursor-pointer"
              title="Open resource filters"
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
          )}
        </div>

        {/* Collection Tabs */}
        {collections && collections.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-archive-border/30 no-scrollbar">
          {displayCollections.map((col) => (
              <CollectionTab
                key={col.id}
                collection={col}
                isActive={selectedCollection === col.id}
                onClick={() => handleCollectionSelect(col.id)}
              />
            ))}
          </div>
        )}

        {showPublicFacets && COLLECTION_CONTEXT[selectedCollection] && (
          <p className="font-sans text-[11px] leading-relaxed text-archive-subtle/65">
            {COLLECTION_CONTEXT[selectedCollection]}
          </p>
        )}

        {selectedCollection === "github" && (
          <div className="hidden lg:block">
            <GitHubBrowseControls
              mode={githubBrowseMode}
              onModeChange={handleGitHubModeChange}
              capabilityOptions={githubCapabilityOptions}
              techStackOptions={githubTechStackOptions}
              healthCounts={githubHealthCounts}
              selectedCapability={githubCapability}
              selectedTechStack={githubTechStack}
              selectedHealth={githubHealth}
              localEntryCount={githubTimelineCounts.localEntries}
              manualReviewCount={githubTimelineCounts.manualReviews}
              onCapabilityChange={handleGitHubCapabilityChange}
              onTechStackChange={handleGitHubTechStackChange}
              onHealthChange={handleGitHubHealthChange}
            />
          </div>
        )}

        {/* Active Filter Chips - only rendered when activeFilterCount > 0 */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2.5 flex-wrap min-h-[28px] empty:hidden py-1">
            <span className="font-mono text-[11px] text-archive-accent/90 select-none shrink-0 font-medium">
              Active filters:
            </span>

            {/* Path breadcrumb pill */}
            {showPublicFacets &&
              selectedTocPath &&
              selectedTocPath.length > 0 && (
                <PathPill
                  path={selectedTocPath}
                  onClear={() => handleSelectTocPath(null)}
                />
              )}

            {/* Language pill (shown when not "all") */}
            {language !== "all" && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-archive-border/60 bg-archive-surface/80 px-3 py-1 text-xs animate-fade-in">
                <span className="font-mono text-[9px] uppercase tracking-wider text-archive-subtle/60">
                  Language
                </span>
                <span className="font-sans text-archive-text font-medium">
                  {language === "zh" ? "中文" : "EN"}
                </span>
                <button
                  type="button"
                  onClick={() => handleLanguageChange("all")}
                  className="ml-0.5 shrink-0 font-mono text-xs font-bold text-archive-subtle transition-colors hover:text-archive-accent"
                  aria-label="Clear language filter"
                >
                  ×
                </button>
              </div>
            )}

            {showPublicFacets &&
              selectedTopics.map((topic) => (
                <PublicFilterPill
                  key={topic}
                  label="Topic"
                  value={getCanonicalTopicLabel(topic, "en")}
                  onClear={() => handleTopicToggle(topic)}
                />
              ))}

            {showPublicFacets &&
              selectedSubcategories.map((subcategory) => {
                const option = resourceFacetModel.subcategories.find(
                  (candidate) => candidate.value === subcategory,
                );
                return (
                  <PublicFilterPill
                    key={subcategory}
                    label="Category"
                    value={option?.labelEn ?? humanizeId(subcategory)}
                    onClear={() => handleSubcategoryToggle(subcategory)}
                  />
                );
              })}

            {showPublicFacets &&
              selectedResourceTypes.map((resourceType) => {
                const option = resourceFacetModel.resourceTypes.find(
                  (candidate) => candidate.value === resourceType,
                );
                return (
                  <PublicFilterPill
                    key={resourceType}
                    label="Format"
                    value={option?.labelEn ?? humanizeId(resourceType)}
                    onClear={() => handleResourceTypeToggle(resourceType)}
                  />
                );
              })}

            {selectedCollection === "github" && githubCapability && (
              <GitHubFilterPill
                label="Capability"
                value={formatGitHubFacetLabel(githubCapability)}
                onClear={() => handleGitHubCapabilityChange("")}
              />
            )}

            {selectedCollection === "github" && githubTechStack && (
              <GitHubFilterPill
                label="Stack"
                value={formatGitHubFacetLabel(githubTechStack)}
                onClear={() => handleGitHubTechStackChange("")}
              />
            )}

            {selectedCollection === "github" && githubHealth && (
              <GitHubFilterPill
                label="Health"
                value={formatGitHubFacetLabel(githubHealth)}
                onClear={() => handleGitHubHealthChange("")}
              />
            )}

            {/* Clear all */}
            <button
              onClick={handleClear}
              className="ml-auto font-mono text-xs text-archive-accent hover:text-archive-accent-glow hover:underline transition-colors shrink-0 cursor-pointer"
            >
              Clear all ×
            </button>
          </div>
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
          resources
          {hasActiveFilters && " (matched)"}
        </span>
        {/* Active collection badge */}
        <span className="font-mono text-[10px] text-archive-subtle opacity-50 border border-archive-border/40 px-2 py-0.5 rounded-full">
          {displayCollections.find((c) => c.id === selectedCollection)?.label ?? selectedCollection}
        </span>
      </div>

      {/* ── Faceted archive + resource grid ─────────────────────────────── */}
      <div className="flex w-full items-start gap-5">
        {showPublicFacets && (
          <div className="hidden lg:block">
            <ResourceFacetPanel
              model={resourceFacetModel}
              selection={publicFacetSelection}
              language={language}
              onLanguageChange={handleLanguageChange}
              onTopicToggle={handleTopicToggle}
              onSubcategoryToggle={handleSubcategoryToggle}
              onLanguageToggle={handleLanguageFacetToggle}
              onResourceTypeToggle={handleResourceTypeToggle}
              onClear={handleClearPublicFacets}
            />
          </div>
        )}

        {/* Card Grid */}
        <div className="flex-1 w-full min-w-0">
          {displayedResults.length > 0 ? (
            <>
              <ResourceGrid
                resources={displayedResults}
                viewMode="resources"
                language={language}
                onPreview={setPreviewResource}
                githubFavoritesById={githubFavoritesById}
                githubFavoritesByResourceId={githubFavoriteLinks.favoritesByResourceId}
                isGitHubCollection={selectedCollection === "github"}
                githubBrowseMode={githubBrowseMode}
                githubMatchReasonsById={githubMatchReasonsById}
              />
              {results.length > visibleCount && (
                <div ref={sentinelRef} className="py-8 flex justify-center w-full">
                  <button
                    onClick={() => setVisibleCount((prev) => Math.min(prev + 24, results.length))}
                    className="px-6 py-2.5 rounded border border-archive-border hover:border-archive-muted text-xs font-mono text-archive-subtle hover:text-archive-text bg-archive-surface active:scale-95 transition-all cursor-pointer"
                  >
                    Load more (showing {visibleCount} of {results.length})
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
                  ? `No resources matching "${query}". Try broadening your search or resetting filters.`
                  : "No resources match the current filter selection. Try resetting filters."
              }
              action={{ label: "Clear all filters ×", onClick: handleClear }}
            />
          )}
        </div>
      </div>

      {previewResource && (
        <ResourceDrawer
          resource={previewResource}
          githubFavorite={
            selectedCollection === "github"
              ? githubFavoriteLinks.favoritesByResourceId.get(previewResource.id)
              : githubFavoritesById.get(previewResource.id)
          }
          language={language}
          onClose={() => setPreviewResource(null)}
        />
      )}

      {(showPublicFacets || selectedCollection === "github") && (
        <FilterDrawer
          isOpen={isFilterDrawerOpen}
          onClose={() => setIsFilterDrawerOpen(false)}
          isGitHub={selectedCollection === "github"}
          githubControls={
            <GitHubBrowseControls
              mode={githubBrowseMode}
              onModeChange={handleGitHubModeChange}
              capabilityOptions={githubCapabilityOptions}
              techStackOptions={githubTechStackOptions}
              healthCounts={githubHealthCounts}
              selectedCapability={githubCapability}
              selectedTechStack={githubTechStack}
              selectedHealth={githubHealth}
              localEntryCount={githubTimelineCounts.localEntries}
              manualReviewCount={githubTimelineCounts.manualReviews}
              onCapabilityChange={handleGitHubCapabilityChange}
              onTechStackChange={handleGitHubTechStackChange}
              onHealthChange={handleGitHubHealthChange}
            />
          }
          model={resourceFacetModel}
          selection={publicFacetSelection}
          language={language}
          onLanguageChange={handleLanguageChange}
          onTopicToggle={handleTopicToggle}
          onSubcategoryToggle={handleSubcategoryToggle}
          onLanguageToggle={handleLanguageFacetToggle}
          onResourceTypeToggle={handleResourceTypeToggle}
          onClear={
            selectedCollection === "github"
              ? () => {
                  setGithubCapability("");
                  setGithubTechStack("");
                  setGithubHealth("");
                  syncToUrl(query, language, "github", selectedTocPath, {
                    capability: "",
                    techStack: "",
                    health: "",
                  });
                }
              : handleClearPublicFacets
          }
          resultCount={results.length}
        />
      )}
    </div>
  );
}

// ─── Mobile Filter Drawer Component ─────────────────────────────────────────────

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isGitHub?: boolean;
  githubControls?: React.ReactNode;
  model: ReturnType<typeof buildResourceFacetModel>;
  selection: ResourceFacetSelection;
  language?: "all" | "zh" | "en";
  onLanguageChange?: (lang: "all" | "zh" | "en") => void;
  onTopicToggle: (value: CanonicalTopicId) => void;
  onSubcategoryToggle: (value: string) => void;
  onLanguageToggle: (value: ResourceLanguage) => void;
  onResourceTypeToggle: (value: ResourceType) => void;
  onClear: () => void;
  resultCount: number;
}

function FilterDrawer({
  isOpen,
  onClose,
  isGitHub = false,
  githubControls,
  model,
  selection,
  language,
  onLanguageChange,
  onTopicToggle,
  onSubcategoryToggle,
  onLanguageToggle,
  onResourceTypeToggle,
  onClear,
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

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="font-sans lg:hidden">
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          mounted ? "opacity-100" : "opacity-0"
        } ${mounted ? "" : "pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Sheet container */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Resource filters"
        className={`fixed left-0 right-0 bottom-0 z-[70] w-full max-h-[85vh] bg-archive-surface border-t border-archive-border rounded-t-xl shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${
          mounted ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Drag handle decoration */}
        <div className="flex justify-center py-2 shrink-0">
          <div className="w-12 h-1 bg-archive-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-archive-border/60 shrink-0">
          <h3 className="font-mono text-xs uppercase tracking-widest text-archive-accent font-semibold">
            {"// REFINE ARCHIVE"}
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-archive-border text-archive-subtle hover:text-archive-text hover:bg-archive-border/50 transition-all text-base font-mono cursor-pointer"
            aria-label="Close filters"
          >
            ×
          </button>
        </div>

        {/* Scrollable contents */}
        <div className="flex-1 overflow-y-auto px-5 py-4 drawer-scroll">
          {isGitHub ? (
            githubControls
          ) : (
            <ResourceFacetPanel
              compact
              model={model}
              selection={selection}
              language={language}
              onLanguageChange={onLanguageChange}
              onTopicToggle={onTopicToggle}
              onSubcategoryToggle={onSubcategoryToggle}
              onLanguageToggle={onLanguageToggle}
              onResourceTypeToggle={onResourceTypeToggle}
              onClear={onClear}
            />
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-archive-border/60 bg-archive-bg/90 p-4 shrink-0 flex gap-2.5 pb-safe">
          <button
            type="button"
            onClick={onClear}
            className="h-11 rounded border border-archive-border/80 px-4 font-mono text-xs text-archive-subtle transition-colors hover:text-archive-accent hover:border-archive-accent/50 cursor-pointer"
          >
            Reset all ↺
          </button>
          <button
            onClick={onClose}
            className="flex h-11 flex-1 items-center justify-center rounded bg-archive-accent hover:bg-archive-accent-glow font-mono text-xs font-semibold text-archive-bg transition-all active:scale-[0.98] cursor-pointer shadow-sm"
          >
            View {resultCount.toLocaleString()} resources →
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Resource Preview Drawer Component ──────────────────────────────────────────

interface ResourceDrawerProps {
  resource: Resource;
  githubFavorite?: GitHubFavorite;
  language: "all" | "zh" | "en";
  onClose: () => void;
}

function ResourceDrawer({
  resource,
  githubFavorite,
  language,
  onClose,
}: ResourceDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const handleClose = useCallback(() => {
    setMounted(false);
    setTimeout(onClose, 250); // Wait for transition animation to finish
  }, [onClose]);

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
  }, [handleClose]);

  const queryString = searchParams ? searchParams.toString() : "";
  const detailUrl = `/resource/${resource.id}${queryString ? "?" + queryString : ""}`;
  const facetBreadcrumb = getResourceFacetBreadcrumb(
    resource,
    language === "zh" ? "zh" : "en",
  );
  const displayLanguage = resource.facet?.language ?? resource.language;
  const displayType = resource.facet?.resourceType ?? resource.type;
  const evidenceSummary =
    resource.detailSummary ?? resource.cardSummary ?? resource.summary ?? null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="font-sans">
      {/* Backdrop overlay */}
      <div
        className={`hidden sm:block fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          mounted ? "opacity-100" : "opacity-0"
        } ${mounted ? "" : "pointer-events-none"}`}
        onClick={handleClose}
      />

      {/* Side sheet container */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Resource Details"
        className={`fixed right-0 top-0 bottom-0 z-[70] w-full sm:w-[460px] h-dvh sm:h-full bg-archive-bg sm:bg-archive-surface sm:border-l sm:border-archive-border shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${
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
              className={displayLanguage === "zh" ? "lang-badge-zh" : "lang-badge-en"}
            >
              {displayLanguage === "zh" ? "中文" : "English"}
            </span>
            <span className="type-badge capitalize">{TYPE_LABELS[displayType] || displayType}</span>
            {githubFavorite && (
              <GitHubHealthBadge favorite={githubFavorite} />
            )}
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

          {githubFavorite && (
            <GitHubCapabilityTags
              capabilities={githubFavorite.capabilities}
              maxVisible={8}
            />
          )}

          {/* Description Block */}
          {githubFavorite ? (
            <GitHubResearchDetails favorite={githubFavorite} />
          ) : (
            <div className="bg-archive-bg/40 p-4 border border-archive-border rounded-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-archive-accent/40" />
              {evidenceSummary ? (
                <p className="font-sans text-xs text-archive-subtle leading-relaxed">
                  {evidenceSummary}
                </p>
              ) : (
                <p className="font-mono text-[10px] text-archive-subtle/60 leading-relaxed">
                  Summary not yet curated. Open the original resource for verified details.
                </p>
              )}
            </div>
          )}

          {/* Metadata Fields */}
          <div className="space-y-4 pt-2">
            <div>
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle mb-1">
                Category
              </h4>
              <p className="font-sans text-sm text-archive-text">
                {facetBreadcrumb.map((segment, index) => (
                  <span key={`${segment}-${index}`}>
                    {index > 0 && <span className="mx-1.5 opacity-40">/</span>}
                    {segment}
                  </span>
                ))}
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
              {githubFavorite ? "Capabilities" : "Tags"}
            </h4>
            {githubFavorite ? (
              <GitHubCapabilityTags
                capabilities={githubFavorite.capabilities}
                maxVisible={12}
              />
            ) : (
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
            )}
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
    </div>,
    document.body
  );
}

