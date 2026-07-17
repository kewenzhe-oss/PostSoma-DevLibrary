import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { getManifest, getAllResources } from "@/lib/data/resources";
import RandomCurations from "@/components/recommend/RandomCurations";
import JsonLd from "@/components/seo/JsonLd";
import Icon, { IconName } from "@/components/ui/Icon";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

function isGitHubRepoUrl(url: string): boolean {
  try {
    const cleanUrl = url.trim().replace(/^https?:\/\/(www\.)?/, "");
    const parts = cleanUrl.split("/");
    if (parts[0] === "github.com") {
      const pathSegments = parts.slice(1).map(p => p.split("?")[0].split("#")[0]).filter(Boolean);
      if (pathSegments.length === 2) {
        const invalidOwners = new Set([
          "topics", "trending", "features", "join", "search",
          "orgs", "notifications", "settings", "pulls", "issues",
          "marketplace", "explore"
        ]);
        return !invalidOwners.has(pathSegments[0]);
      }
    }
  } catch (e) {}
  return false;
}

function getSourceDomain(url: string): string {
  try {
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith("/") || !cleanUrl.includes("://")) {
      return "205022.xyz";
    }
    const parsed = new URL(cleanUrl);
    return parsed.hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

function isHandsOn(r: any): boolean {
  const isInteractive = r.type === "interactive";
  const hasHandsOnTag = r.tags?.some((t: string) => {
    const tl = t.toLowerCase();
    return tl.includes("playground") || tl.includes("sandbox") || tl.includes("exercise") || tl.includes("practice") || tl.includes("compiler");
  }) || false;
  const isTutorialOrBookOrCourse = r.type === "tutorial" || r.type === "book" || r.type === "course";
  return (isInteractive || hasHandsOnTag) && !isTutorialOrBookOrCourse;
}

function isOffensiveResource(r: any): boolean {
  const OFFENSIVE_KEYWORDS = [
    "crack", "payload", "exploit", "bypass", "pentest", "hacking", "vulnerability",
    "admin-finder", "ddos", "bruteforce", "reverse-engineering", "malware", "rootkit",
    "keylogger", "ransomware", "spyware", "cheat", "hack", "nmap", "metasploit",
    "sqlmap", "burp", "c2-framework", "offensive", "admin finder", "wifi-crack",
    "password-cracker", "wifi-hacking", "ddos-attack"
  ];
  
  const textToSearch = [
    r.title || "",
    r.url || "",
    r.category || "",
    r.subcategory || "",
    ...(r.tags || [])
  ].map(t => t.toLowerCase());

  return OFFENSIVE_KEYWORDS.some(keyword => 
    textToSearch.some(text => text.includes(keyword))
  );
}

function isLearningFriendlyCategory(r: any): boolean {
  const PREFERRED_CATEGORIES = [
    "ai", "artificial intelligence", "programming", "language", "语言", "subject", "devtools",
    "productivity", "data", "automation", "git", "javascript", "go", "python", "typescript",
    "html", "css", "web", "development", "database", "sql", "cs", "computer science",
    "software engineering", "algorithms", "data structures", "testing", "devops", "infra"
  ];

  const cat = (r.category || "").toLowerCase();
  const subcat = (r.subcategory || "").toLowerCase();
  const tags = (r.tags || []).map((t: string) => t.toLowerCase());

  return PREFERRED_CATEGORIES.some(pref => 
    cat.includes(pref) || subcat.includes(pref) || tags.some((tag: string) => tag.includes(pref))
  );
}

export default async function HomePage() {
  const manifest = await getManifest();
  const allResources = await getAllResources();

  const zhCount = manifest?.languages?.zh ?? 0;
  const enCount = manifest?.languages?.en ?? 0;
  const total   = manifest?.total ?? 0;

  // Prune resources for dynamic curations sampling (excluding offensive ones)
  const prunedResources = allResources
    .filter(r => !isOffensiveResource(r))
    .map((r) => ({
      id: r.id,
      title: r.title,
      language: r.language,
      type: r.type,
      category: r.category,
      tags: r.tags || [],
      url: r.url,
      sourceDomain: getSourceDomain(r.url),
      isGitHubRepo: isGitHubRepoUrl(r.url),
      isPreferred: isLearningFriendlyCategory(r),
      isHandsOn: isHandsOn(r),
    }));

  return (
    <AppShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": "https://205022.xyz/#website",
              "url": "https://205022.xyz/",
              "name": "PostSoma DevLibrary",
              "description": "A curated bilingual archive of free programming books, courses, cheat sheets, interactive tutorials, and GitHub open-source projects.",
              "inLanguage": ["en", "zh"]
            },
            {
              "@type": "WebPage",
              "@id": "https://205022.xyz/#webpage",
              "url": "https://205022.xyz/",
              "name": "PostSoma DevLibrary — Curated Programming Guide",
              "isPartOf": { "@id": "https://205022.xyz/#website" },
              "description": "A curated bilingual guide to free programming books, courses, cheat sheets, and tutorials.",
              "inLanguage": ["en", "zh"]
            }
          ]
        }}
      />

      {/* Hero Section */}
      <section className="pt-16 pb-14 animate-slide-up">
        <p className="font-mono text-xs tracking-widest text-archive-accent/80 uppercase mb-5">
          {"// POSTSOMA-2050 // ARCHIVE.NODE"}
        </p>

        <h1 className="font-display text-4xl md:text-5xl text-archive-text leading-tight mb-5 max-w-2xl font-bold">
          Find one good place to begin.
        </h1>

        <p className="font-sans text-base text-archive-subtle max-w-2xl leading-relaxed mb-8">
          PostSoma DevLibrary maps 5,000+ free programming resources. We do not sell courses or sequencing curricula. 
          We help humans and AIs find trusted starting points and generate hallucination-free study guides.
        </p>

        <div className="flex items-center gap-4 flex-wrap">
          <Link
            href="/recommend"
            id="hero-recommend-btn"
            className="btn-accent text-xs px-6 py-2.5 h-10 flex items-center justify-center gap-1.5 font-mono font-semibold"
          >
            <Icon name="shortlist" size={16} />
            Get a Shortlist
          </Link>

          <Link
            href="/resources"
            id="hero-browse-btn"
            className="btn-outline text-xs px-6 py-2.5 h-10 flex items-center justify-center gap-1.5 font-mono"
          >
            <Icon name="archive" size={14} className="opacity-70" />
            Explore Archive
          </Link>
        </div>

        {/* How to Use This Node Onboarding Guide */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-archive-border/40 pt-10">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-archive-accent">
              <Icon name="shortlist" size={16} />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider">
                1. Recommend / AI 提示
              </h3>
            </div>
            <p className="font-sans text-xs text-archive-subtle leading-relaxed">
              输入学习目标和筛选条件，生成 3 项精选推荐；一键复制 AI 指令注入任何外部模型，获取无幻觉学习规划。
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-archive-accent">
              <Icon name="shuffle" size={16} />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider">
                2. Curations / 随机抽样
              </h3>
            </div>
            <p className="font-sans text-xs text-archive-subtle leading-relaxed">
              从整个目录中跨“阅读、构建、实践、参考、盲盒”五个意图维度随机获取卡片，帮助您在无目的时探索惊喜。
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-archive-accent">
              <Icon name="archive" size={16} />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider">
                3. Search / 全量检索
              </h3>
            </div>
            <p className="font-sans text-xs text-archive-subtle leading-relaxed">
              在包含 5,000+ 免费图书、在线教程和英文文档的归档库中进行秒级本地模糊搜索，零垃圾信息，支持本地收藏。
            </p>
          </div>
        </div>
      </section>

      {/* Section 1: Source-Aware Random Curations (main body) */}
      <RandomCurations resources={prunedResources} />

      {/* Section 2: Recommend strip (intent rail) */}
      <section className="border-t border-archive-border pt-12 pb-12 animate-fade-in">
        <div className="bg-archive-surface border border-archive-border p-6 rounded-sm space-y-5">
          <div>
            <h3 className="font-mono text-xs text-archive-accent uppercase tracking-wider mb-2">
              {"// HAVE.A.GOAL.GET.A.SHORTLIST"}
            </h3>
            <p className="font-sans text-xs text-archive-subtle">
              Specify your goal, difficulty level, language, and format constraints to generate a vetted 3-pick shortlist. Paste the resulting AI Prompt into any model for study planning.
            </p>
          </div>
          
          {/* Preset Scenario Quick Links */}
          <div className="flex flex-wrap items-center gap-3.5 border-y border-archive-border/30 py-3.5">
            <span className="font-mono text-[9px] uppercase text-archive-muted tracking-wider">
              Preset Curations:
            </span>
            <Link
              href="/recommend?goal=Python&lang=zh&level=beginner&format=all"
              className="text-[11px] font-mono border border-archive-border px-3 py-1 bg-archive-bg rounded-sm hover:border-archive-accent/40 hover:text-archive-accent transition-all text-archive-subtle"
            >
              零基础 Python (ZH)
            </Link>
            <Link
              href="/recommend?goal=JavaScript+website&lang=en&level=intermediate&format=all"
              className="text-[11px] font-mono border border-archive-border px-3 py-1 bg-archive-bg rounded-sm hover:border-archive-accent/40 hover:text-archive-accent transition-all text-archive-subtle"
            >
              JS Web Design (EN)
            </Link>
            <Link
              href="/recommend?goal=Git&lang=all&level=all&format=documentation"
              className="text-[11px] font-mono border border-archive-border px-3 py-1 bg-archive-bg rounded-sm hover:border-archive-accent/40 hover:text-archive-accent transition-all text-archive-subtle"
            >
              Git Cheatsheets / Docs
            </Link>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-between pt-1">
            <Link href="/recommend" className="btn-accent text-xs px-5 py-2 flex items-center gap-1.5 font-mono">
              <Icon name="shortlist" size={14} />
              Go to Shortlist Generator →
            </Link>
            <div className="flex items-center gap-2 text-[10px] font-mono text-archive-subtle leading-relaxed bg-archive-bg border border-archive-border/60 px-3.5 py-1.5 rounded-sm">
              <Icon name="ai" size={12} className="text-archive-accent" />
              <span>Copy AI Prompt on the Recommend page to run the shortlist logic in any LLM.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Stats strip */}
      {total > 0 && (
        <section className="border-t border-archive-border pt-8 pb-12 animate-fade-in">
          <div className="max-w-xl mb-6">
            <h3 className="font-mono text-[10px] uppercase text-archive-subtle tracking-widest mb-2">
              Deep Archive Evidence
            </h3>
            <p className="font-sans text-xs text-archive-subtle leading-relaxed">
              Our archive catalog is compiled from reputable open-source programming directories. We index and structure metadata so you can sample cleanly.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Stat label="Total cataloged" value={total.toLocaleString()} />
            <Stat label="English catalog" value={enCount.toLocaleString()} accent="en" />
            <Stat label="中文目录" value={zhCount.toLocaleString()} accent="zh" />
            <Stat
              label="Pipeline update"
              value={
                manifest?.generatedAt
                  ? new Date(manifest.generatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"
              }
            />
          </div>
        </section>
      )}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "en" | "zh";
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className={`font-display text-2xl font-bold ${
          accent === "en"
            ? "text-archive-en"
            : accent === "zh"
            ? "text-archive-zh"
            : "text-archive-text"
        }`}
      >
        {value}
      </span>
      <span className="font-mono text-[10px] text-archive-subtle">{label}</span>
    </div>
  );
}
