"use client";

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import type { ResourceTocNode } from "@/lib/types/resource";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ResourceTocProps {
  tocAllLangs: {
    zh: ResourceTocNode[];
    en: ResourceTocNode[];
    all: ResourceTocNode[];
  };
  selectedCollection: string;
  language: "all" | "zh" | "en";
  onLanguageChange: (lang: "all" | "zh" | "en") => void;
  selectedPath: string[] | null;
  onSelectPath: (path: string[] | null) => void;
  className?: string;
}

// ─── Macro-Category Definitions ────────────────────────────────────────────
// Maps every known leaf label → macro group id.
// "books" uses 2 structural top nodes, so we handle that separately via BOOKS_ROOTS.

const MACRO_GROUPS = [
  {
    id: "web",
    label: "Web",
    emoji: "🌐",
    keywords: [
      "angular", "html and css", "html & css", "javascript", "typescript",
      "css", "frontend", "web development", "web3", "react", "svelte",
      "vue", "rxjs", "coffeescript", "elm", "next.js", "nest.js", "node",
      "nodejs", "jquery", "wordpress", "ionic", "webpack", "ui/ux",
      "graphql", "rest", "jamstack", "webgl", "glsl", "gremlin",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3 12a8.959 8.959 0 01.284-2.253" />
      </svg>
    ),
  },
  {
    id: "lang",
    label: "Lang",
    emoji: "⚙️",
    keywords: [
      "python", "rust", "go", "golang", "c", "c\\", "c++", "java", "kotlin",
      "swift", "ruby", "scala", "haskell", "clojure", "clojurescript",
      "erlang", "elixir", "ocaml", "perl", "php", "r", "dart", "julia",
      "lua", "nim", "crystal", "fortran", "assembly", "apl", "ballerina",
      "gdscript", "lisp", "processing", "qb64", "v", "objective-c",
      "verilog / vhdl / systemverilog", "solidity", "pharo", "autoit",
      "windows phone", "scratch", "coffeescript", "coldfusion",
      "language agnostic", "multiple languages", "language translations",
      ".net", ".net core", ".net framework", "vba", "octave", "matlab",
      "scala", "r", "yaml", "markdown", "latex",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
  },
  {
    id: "data",
    label: "Data",
    emoji: "🗄️",
    keywords: [
      "data science", "data structures and algorithms", "algorithms & data structures",
      "algorithms", "artificial intelligence", "ai", "machine learning",
      "deep learning", "databases", "dbms", "nosql", "sql", "postgresql",
      "mongodb", "redis", "elastic", "spark", "graph theory", "graphs",
      "jupyter", "tensorflow", "r", "matlab", "octave", "cuda",
      "blockchain", "web3", "solidity", "cryptography",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
  },
  {
    id: "infra",
    label: "Infra",
    emoji: "☁️",
    keywords: [
      "devops", "docker", "kubernetes", "cloud computing", "linux", "terraform",
      "ansible", "jenkins", "puppet", "chef", "raspberry pi", "shell scripting",
      "bash", "bash / shell", "powershell", "networking", "operating systems",
      "os", "computer organization and architecture", "digital electronics",
      "system design", "robotics", "plc - programmable logic controllers",
      "selenium", "cypress", "unit testing",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
      </svg>
    ),
  },
  {
    id: "tools",
    label: "Tools",
    emoji: "🛠️",
    keywords: [
      "git", "ide and editors", "vim", "latex", "markdown", "regular expressions",
      "rego", "software engineering", "computer science", "theory",
      "compilers", "security", "information security", "game development",
      "misc", "0 - mooc", "astro", "flutter", "android", "ios",
      "springboot", "bench",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
] as const;

type MacroGroupId = (typeof MACRO_GROUPS)[number]["id"];

// Books collection has 2 structural top-nodes, not subject nodes directly.
// We handle them as special "virtual" macro groups.
const BOOKS_ROOTS = [
  {
    id: "books_bylang",
    label: "By Lang",
    emoji: "⚙️",
    matchLabels: ["BY PROGRAMMING LANGUAGE", "语言相关"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
  },
  {
    id: "books_bysubject",
    label: "Subject",
    emoji: "📚",
    matchLabels: ["BY SUBJECT", "语言无关"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
  },
] as const;

// ─── Grouping Logic ────────────────────────────────────────────────────────

function assignToMacroGroup(label: string): MacroGroupId {
  const lower = label.toLowerCase().trim();
  // Check groups in order; first match wins
  for (const group of MACRO_GROUPS) {
    if (group.keywords.some((kw) => lower === kw || lower.startsWith(kw + " ") || lower.includes(kw))) {
      return group.id;
    }
  }
  // Default fallback
  return "tools";
}

interface MacroEntry {
  id: string;
  label: string;
  icon: React.ReactNode;
  nodes: ResourceTocNode[];
  totalCount: number;
}

function buildMacroGroups(flatNodes: ResourceTocNode[]): MacroEntry[] {
  const buckets: Record<string, ResourceTocNode[]> = {};
  for (const group of MACRO_GROUPS) buckets[group.id] = [];

  for (const node of flatNodes) {
    const gid = assignToMacroGroup(node.label);
    buckets[gid].push(node);
  }

  return MACRO_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    icon: group.icon,
    nodes: buckets[group.id],
    totalCount: buckets[group.id].reduce((s, n) => s + n.resourceCount, 0),
  })).filter((g) => g.totalCount > 0); // hide empty groups
}

// ─── Accordion Node (inside drawer) ───────────────────────────────────────

function AccordionNode({
  node,
  selectedPath,
  onSelectPath,
  depth = 0,
}: {
  node: ResourceTocNode;
  selectedPath: string[] | null;
  onSelectPath: (path: string[] | null) => void;
  depth?: number;
}) {
  const isSelected = selectedPath?.join(":") === node.path.join(":");
  const hasChildren = Boolean(node.children?.length);

  const hasSelectedDescendant = useMemo(() => {
    if (!selectedPath || !hasChildren) return false;
    const sel = selectedPath.join(":");
    const check = (nodes: ResourceTocNode[]): boolean =>
      nodes.some((n) => n.path.join(":") === sel || (n.children ? check(n.children) : false));
    return check(node.children);
  }, [node.children, selectedPath, hasChildren]);

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (hasSelectedDescendant) setIsOpen(true);
  }, [hasSelectedDescendant]);

  const handleClick = useCallback(() => {
    if (hasChildren) setIsOpen((v) => !v);
    onSelectPath(isSelected ? null : node.path);
  }, [hasChildren, onSelectPath, isSelected, node.path]);

  const isEmpty = node.resourceCount === 0;

  return (
    <div className="flex flex-col">
      <button
        onClick={handleClick}
        disabled={isEmpty}
        className={[
          "group flex items-center justify-between w-full text-left rounded-lg transition-all duration-150 border",
          depth === 0 ? "px-3 py-2" : "px-2.5 py-1.5",
          isEmpty
            ? "opacity-30 cursor-not-allowed border-transparent"
            : isSelected
            ? "bg-teal-500/10 text-teal-300 border-teal-500/20"
            : "text-archive-subtle hover:text-archive-text hover:bg-white/[0.04] border-transparent hover:border-archive-border/30",
        ].join(" ")}
      >
        {/* Full label — no truncation in drawer */}
        <span className={`${depth === 0 ? "text-sm font-medium" : "text-xs"}`}>
          {node.label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          {node.resourceCount > 0 && (
            <span className="font-mono text-[10px] opacity-40 tabular-nums">
              {node.resourceCount}
            </span>
          )}
          {hasChildren && (
            <svg
              className={`w-2.5 h-2.5 transition-transform duration-200 opacity-30 group-hover:opacity-60 ${
                isOpen ? "rotate-90" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      </button>

      {hasChildren && (
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            maxHeight: isOpen ? `${node.children.length * 60 + 32}px` : "0px",
            opacity: isOpen ? 1 : 0,
          }}
        >
          <div className="ml-3 border-l border-archive-border/25 pl-0 pt-0.5 pb-1 flex flex-col gap-0.5">
            {node.children.map((child) => (
              <AccordionNode
                key={child.id}
                node={child}
                selectedPath={selectedPath}
                onSelectPath={onSelectPath}
                depth={depth + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Language Toggle ───────────────────────────────────────────────────────

function LangToggle({
  language,
  onChange,
  counts,
}: {
  language: "all" | "zh" | "en";
  onChange: (lang: "all" | "zh" | "en") => void;
  counts: { all: number; zh: number; en: number };
}) {
  // Only show options that actually have data; "all" is shown only if both langs have data
  const visibleOpts = [
    { value: "all" as const, label: "All" },
    { value: "en" as const, label: "EN" },
    { value: "zh" as const, label: "中" },
  ].filter((opt) => {
    if (opt.value === "all") return counts.en > 0 && counts.zh > 0;
    return counts[opt.value] > 0;
  });

  // If only one language exists, no toggle needed
  if (visibleOpts.length <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-1 px-1.5 py-2.5 border-t border-archive-border/30">
      {visibleOpts.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={`${opt.label} — ${counts[opt.value].toLocaleString()} resources`}
          className={`w-full flex flex-col items-center py-1.5 rounded-md text-[10px] font-mono transition-all duration-150 border ${
            language === opt.value
              ? "bg-teal-500/15 text-teal-300 border-teal-500/20"
              : "text-archive-subtle hover:text-archive-text hover:bg-white/[0.04] border-transparent"
          }`}
        >
          <span className="font-semibold">{opt.label}</span>
          <span className="opacity-40 text-[8px] tabular-nums mt-0.5">
            {counts[opt.value].toLocaleString()}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────

export default function ResourceToc({
  tocAllLangs,
  selectedCollection,
  language,
  onLanguageChange,
  selectedPath,
  onSelectPath,
  className = "",
}: ResourceTocProps) {
  // Raw flat nodes for the active language — guard against undefined during hydration
  const activeNodes = useMemo<ResourceTocNode[]>(() => {
    if (!tocAllLangs) return [];
    const raw = tocAllLangs[language] ?? tocAllLangs.all ?? [];
    // Strip nodes with zero resources — prevents empty residue in drawer and mobile TOC
    return raw.filter((n) => n.resourceCount > 0);
  }, [tocAllLangs, language]);

  // Lang resource totals for LangToggle
  const langCounts = useMemo(() => {
    if (!tocAllLangs) return { all: 0, zh: 0, en: 0 };
    const sum = (nodes: ResourceTocNode[]) =>
      (nodes ?? []).reduce((a, n) => a + n.resourceCount, 0);
    return {
      all: sum(tocAllLangs.all ?? []),
      zh: sum(tocAllLangs.zh ?? []),
      en: sum(tocAllLangs.en ?? []),
    };
  }, [tocAllLangs]);

  // ── For Books: use the 2 structural root nodes as rail items ──────────────
  const isBooksCollection = selectedCollection === "books";
  const isGithubCollection = selectedCollection === "github";

  const booksRailEntries = useMemo<MacroEntry[]>(() => {
    if (!isBooksCollection) return [];
    return BOOKS_ROOTS.map((root) => {
      const matchedNode = activeNodes.find((n) =>
        (root.matchLabels as readonly string[]).includes(n.label)
      );
      return {
        id: root.id,
        label: root.label,
        icon: root.icon,
        nodes: matchedNode ? [matchedNode] : [],
        totalCount: matchedNode?.resourceCount ?? 0,
      };
    }).filter((e) => e.totalCount > 0);
  }, [isBooksCollection, activeNodes]);

  // ── For GitHub: directly map active leaf nodes (Topic level-1) to side rails ──
  const githubRailEntries = useMemo<MacroEntry[]>(() => {
    if (!isGithubCollection) return [];
    
    // Customized semantic SVG icons for GitHub topics
    const getTopicIcon = (topicLabel: string) => {
      const lower = topicLabel.toLowerCase();
      if (lower.includes("ai") || lower.includes("llm") || lower.includes("agent") || lower.includes("model")) {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
          </svg>
        );
      }
      if (lower.includes("tool") || lower.includes("dev")) {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75" />
          </svg>
        );
      }
      if (lower.includes("data") || lower.includes("db") || lower.includes("sql") || lower.includes("scrap")) {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
          </svg>
        );
      }
      if (lower.includes("infra") || lower.includes("cloud") || lower.includes("network") || lower.includes("os")) {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
          </svg>
        );
      }
      if (lower.includes("auto") || lower.includes("flow") || lower.includes("run")) {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        );
      }
      // General fallbacks
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.904-4.43c.895-.445 1.954.12 2.399 1.014c.445.894-.12 1.954-1.014 2.399L11 23m-4.707-8.293L3 17l1.293-4.707c.214-.775.766-1.42 1.5-1.78l8.904-4.43c.895-.445 1.954.12 2.399 1.014c.445.894-.12 1.954-1.014 2.399L11.5 11" />
        </svg>
      );
    };

    return activeNodes.map((node) => ({
      id: node.id,
      label: node.label,
      icon: getTopicIcon(node.label),
      nodes: [node],
      totalCount: node.resourceCount,
    }));
  }, [isGithubCollection, activeNodes]);

  // ── For all other collections: group flat nodes into macro buckets ─────────
  const macroRailEntries = useMemo<MacroEntry[]>(() => {
    if (isBooksCollection || isGithubCollection) return [];
    return buildMacroGroups(activeNodes);
  }, [isBooksCollection, isGithubCollection, activeNodes]);

  const railEntries = isBooksCollection
    ? booksRailEntries
    : isGithubCollection
    ? githubRailEntries
    : macroRailEntries;

  // ── Drawer state ──────────────────────────────────────────────────────────
  const [openId, setOpenId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeId = pinnedId ?? openId;
  const activeEntry = railEntries.find((e) => e.id === activeId);

  const openDrawer = useCallback((id: string) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpenId(id);
  }, []);

  const scheduleClose = useCallback(() => {
    if (pinnedId) return;
    closeTimerRef.current = setTimeout(() => setOpenId(null), 180);
  }, [pinnedId]);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const togglePin = useCallback((id: string) => {
    setPinnedId((prev) => {
      const next = prev === id ? null : id;
      if (!next) setOpenId(null);
      else setOpenId(id);
      return next;
    });
  }, []);

  // Close drawer on collection/language change
  useEffect(() => {
    setOpenId(null);
    setPinnedId(null);
    onSelectPath(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollection, language]);

  // Detect if any selected path falls inside a given macro entry
  const entryHasActiveSelection = useCallback(
    (entry: MacroEntry): boolean => {
      if (!selectedPath) return false;
      const sel = selectedPath.join(":");
      const checkNode = (n: ResourceTocNode): boolean =>
        n.path.join(":") === sel || (n.children ? n.children.some(checkNode) : false);
      return entry.nodes.some(checkNode);
    },
    [selectedPath]
  );

  // Which drawer nodes to render — depends on whether it's a books/github root or macro group
  const drawerNodes = useMemo<ResourceTocNode[]>(() => {
    if (!activeEntry) return [];
    if (isBooksCollection || isGithubCollection) {
      // Books and Github: the single matched root node → render its children as the tree.
      // If there are no children (subcategories), fallback to rendering the rootNode itself.
      const rootNode = activeEntry.nodes[0];
      return (rootNode?.children && rootNode.children.length > 0)
        ? rootNode.children
        : (rootNode ? [rootNode] : []);
    }
    // Other collections: the macro group's flat members are the top-level items
    return activeEntry.nodes;
  }, [activeEntry, isBooksCollection, isGithubCollection]);

  // Progressive Disclosure: split drawer categories into visible and hidden
  const { visibleNodes, hiddenNodes } = useMemo(() => {
    const sorted = [...drawerNodes].sort((a, b) => b.resourceCount - a.resourceCount);
    if (sorted.length <= 6) {
      return { visibleNodes: sorted, hiddenNodes: [] };
    }
    
    // Find if any node in the hidden section is selected or contains the selected path
    const isSelected = (node: ResourceTocNode): boolean => {
      if (!selectedPath) return false;
      const selStr = selectedPath.join(":");
      const checkNode = (n: ResourceTocNode): boolean =>
        n.path.join(":") === selStr || (n.children ? n.children.some(checkNode) : false);
      return checkNode(node);
    };

    const visible: ResourceTocNode[] = [];
    const hidden: ResourceTocNode[] = [];

    // Top 6 by resource Count go to visible.
    // However, if a node beyond the top 6 is active, we move it to visible to preserve active context.
    sorted.forEach((node, index) => {
      if (index < 6 || isSelected(node)) {
        visible.push(node);
      } else {
        hidden.push(node);
      }
    });

    return { visibleNodes: visible, hiddenNodes: hidden };
  }, [drawerNodes, selectedPath]);

  if (railEntries.length === 0) return null;

  return (
    <div className={`relative flex ${className}`} style={{ userSelect: "none" }}>
      {/* ──────────────────────────────────────────────────────────────────
          Mini Rail
      ────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col w-[68px] shrink-0 border-r border-archive-border/25">
        {/* Top accent line */}
        <div className="px-2 py-3 flex items-center justify-center">
          <span className="block w-6 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
        </div>

        {/* Macro category buttons */}
        <div className="flex flex-col gap-1 px-1.5 pb-1 flex-1">
          {railEntries.map((entry) => {
            const isActive = activeId === entry.id;
            const hasSelection = entryHasActiveSelection(entry);
            const isEmpty = entry.totalCount === 0;

            return (
              <div
                key={entry.id}
                className="relative"
                onMouseEnter={() => !isEmpty && openDrawer(entry.id)}
                onMouseLeave={scheduleClose}
              >
                <button
                  onClick={() => !isEmpty && togglePin(entry.id)}
                  disabled={isEmpty}
                  title={entry.id.replace(/_/g, " ")}
                  className={[
                    "flex flex-col items-center justify-center w-full gap-1.5 py-3 rounded-xl transition-all duration-200 border",
                    isEmpty
                      ? "opacity-20 cursor-not-allowed border-transparent"
                      : isActive || hasSelection
                      ? [
                          "text-teal-300 border-teal-500/25",
                          "bg-teal-500/[0.08]",
                          "shadow-[0_0_12px_rgba(45,212,191,0.1),inset_0_1px_0_rgba(45,212,191,0.08)]",
                        ].join(" ")
                      : "text-archive-subtle hover:text-archive-text hover:bg-white/[0.03] border-transparent hover:border-archive-border/25",
                  ].join(" ")}
                >
                  {/* Icon */}
                  <span
                    className={`transition-colors duration-150 ${
                      isActive || hasSelection ? "text-teal-400" : "text-current"
                    }`}
                  >
                    {entry.icon}
                  </span>

                  {/* Label — 5 chars max, guaranteed no "..." */}
                  <span className="text-[9px] font-mono font-semibold leading-none tracking-wide uppercase">
                    {entry.label}
                  </span>

                  {/* Resource count micro-badge */}
                  <span
                    className={`text-[8px] font-mono tabular-nums leading-none ${
                      isActive || hasSelection ? "text-teal-400 opacity-70" : "opacity-30"
                    }`}
                  >
                    {entry.totalCount >= 1000
                      ? `${(entry.totalCount / 1000).toFixed(1)}k`
                      : entry.totalCount}
                  </span>

                  {/* Pinned indicator dot */}
                  {pinnedId === entry.id && (
                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-400 shadow-[0_0_4px_rgba(45,212,191,0.8)]" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Language toggle zone */}
        <LangToggle language={language} onChange={onLanguageChange} counts={langCounts} />
      </div>

      {/* ──────────────────────────────────────────────────────────────────
          Slide-out Drawer
      ────────────────────────────────────────────────────────────────── */}
      <div
        className={`absolute left-full top-0 z-50 transition-all duration-300 ease-in-out ${
          activeId && activeEntry && drawerNodes.length > 0
            ? "opacity-100 translate-x-0 pointer-events-auto"
            : "opacity-0 -translate-x-3 pointer-events-none"
        }`}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        style={{ width: "296px" }}
      >
        {activeEntry && (
          <div className="ml-2 bg-archive-surface border border-archive-border/60 rounded-xl shadow-2xl shadow-black/70 overflow-hidden">
            {/* ── Drawer Header ── */}
            <div className="px-4 py-3.5 border-b border-archive-border/40 bg-gradient-to-br from-archive-bg/60 to-archive-surface">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-teal-400">{activeEntry.icon}</span>
                  <div>
                    <p className="font-mono text-[10px] text-archive-subtle opacity-60 uppercase tracking-widest mb-0.5">
                      Category
                    </p>
                    <p className="font-sans text-sm text-archive-text font-semibold leading-none">
                      {/* Human-readable group name */}
                      {activeEntry.id === "books_bylang"
                        ? "By Programming Language"
                        : activeEntry.id === "books_bysubject"
                        ? "By Subject"
                        : activeEntry.id === "web"
                        ? "Web Development"
                        : activeEntry.id === "lang"
                        ? "Programming Languages"
                        : activeEntry.id === "data"
                        ? "Data & AI"
                        : activeEntry.id === "infra"
                        ? "Infrastructure & Ops"
                        : "Dev Tools & CS"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-archive-subtle opacity-50 tabular-nums">
                    {activeEntry.totalCount.toLocaleString()}
                  </span>
                  <button
                    onClick={() => {
                      setPinnedId(null);
                      setOpenId(null);
                    }}
                    className="text-archive-subtle hover:text-archive-text transition-colors opacity-40 hover:opacity-90 ml-1"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Quick "All in group" button */}
              {activeEntry.nodes[0] && (
                <button
                  onClick={() => {
                    const topNode = activeEntry.nodes[0];
                    const isSel = selectedPath?.join(":") === topNode.path.join(":");
                    onSelectPath(isSel ? null : topNode.path);
                  }}
                  className={`mt-2.5 w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all duration-150 border ${
                    selectedPath?.join(":") === activeEntry.nodes[0]?.path.join(":")
                      ? "bg-teal-500/10 text-teal-300 border-teal-500/20"
                      : "text-archive-subtle hover:text-archive-text border-archive-border/30 hover:border-archive-border hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="opacity-40 mr-2">⊞</span>
                  Show all in this group
                  {activeEntry.nodes[0] && (
                    <span className="float-right opacity-30 text-[10px]">
                      {activeEntry.nodes[0].resourceCount.toLocaleString()}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* ── Subject Tree (Accordion) ── */}
            <div className="px-2 pb-3 pt-2 max-h-[62vh] overflow-y-auto drawer-scroll flex flex-col gap-0.5 animate-fade-in">
              {visibleNodes.length === 0 ? (
                <p className="px-3 py-6 text-xs font-mono text-archive-subtle opacity-40 text-center">
                  No subcategories
                </p>
              ) : (
                <>
                  {visibleNodes.map((node) => (
                    <AccordionNode
                      key={node.id}
                      node={node}
                      selectedPath={selectedPath}
                      onSelectPath={onSelectPath}
                      depth={0}
                    />
                  ))}
                  
                  {hiddenNodes.length > 0 && (
                    <details className="group mt-2 border-t border-archive-border/30 pt-2">
                      <summary className="flex items-center gap-1.5 cursor-pointer text-[10px] font-mono text-archive-subtle hover:text-archive-text list-none px-3 py-1.5 rounded-lg hover:bg-white/[0.03] select-none transition-colors duration-150">
                        <svg
                          className="w-2.5 h-2.5 transition-transform group-open:rotate-90 text-archive-subtle opacity-50"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <span>Show more topics (+{hiddenNodes.length})</span>
                      </summary>
                      <div className="mt-1 flex flex-col gap-0.5">
                        {hiddenNodes.map((node) => (
                          <AccordionNode
                            key={node.id}
                            node={node}
                            selectedPath={selectedPath}
                            onSelectPath={onSelectPath}
                            depth={0}
                          />
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
