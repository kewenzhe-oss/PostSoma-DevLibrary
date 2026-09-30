import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { getManifest, getAllResources } from "@/lib/data/resources";
import RandomCurations from "@/components/recommend/RandomCurations";
import JsonLd from "@/components/seo/JsonLd";
import Icon from "@/components/ui/Icon";
import HeroSearch from "@/components/home/HeroSearch";
import { absoluteSiteUrl, SITE_HOSTNAME } from "@/lib/config/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PostSoma DevLibrary — Bilingual Programming Archive",
    description:
      "A curated bilingual (EN/ZH) archive of 5,000+ free programming books, courses, tutorials, and documentation. Search-first, dark mode, no noise.",
    url: "/",
    siteName: "PostSoma DevLibrary",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PostSoma DevLibrary — 5,000+ Curated Free Programming Resources",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PostSoma DevLibrary — Bilingual Programming Archive",
    description:
      "A curated bilingual (EN/ZH) archive of 5,000+ free programming books, courses, tutorials, and documentation. Search-first, dark mode, no noise.",
    images: ["/og-image.png"],
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
      return SITE_HOSTNAME;
    }
    const parsed = new URL(cleanUrl);
    return parsed.hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
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
      subcategory: r.subcategory || "",
      collection: r.collection,
      tags: r.tags || [],
      url: r.url,
      sourceDomain: getSourceDomain(r.url),
      isGitHubRepo: isGitHubRepoUrl(r.url),
      isPreferred: isLearningFriendlyCategory(r),
    }));

  return (
    <AppShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": absoluteSiteUrl("/#website"),
              "url": absoluteSiteUrl("/"),
              "name": "PostSoma DevLibrary",
              "description": "A curated bilingual archive of free programming books, courses, cheat sheets, interactive tutorials, and GitHub open-source projects.",
              "inLanguage": ["en", "zh"]
            },
            {
              "@type": "WebPage",
              "@id": absoluteSiteUrl("/#webpage"),
              "url": absoluteSiteUrl("/"),
              "name": "PostSoma DevLibrary — Curated Programming Guide",
              "isPartOf": { "@id": absoluteSiteUrl("/#website") },
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
          PostSoma DevLibrary 索引 {allResources.length.toLocaleString()} 项高质量免费编程资源。不卖课、不编造学习路线，专注为自学者与 AI 助手提供真实可信的起点检索与更可靠的规划上下文。
        </p>

        {/* Hero CTA - Scheme A: Primary = Shortlist, Secondary = Browse Archive */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            href="/recommend"
            id="hero-recommend-btn"
            className="btn-accent text-xs px-6 py-2.5 h-10 flex items-center justify-center gap-1.5 font-mono font-semibold"
          >
            <Icon name="shortlist" size={16} />
            生成推荐短清单
          </Link>

          <Link
            href="/resources"
            id="hero-browse-btn"
            className="btn-outline text-xs px-6 py-2.5 h-10 flex items-center justify-center gap-1.5 font-mono"
          >
            <Icon name="archive" size={14} className="opacity-70" />
            浏览全库 {allResources.length.toLocaleString()} 项归档 →
          </Link>
        </div>

        {/* Instant Search Bar */}
        <HeroSearch totalCount={allResources.length} />

        {/* 3 Core Value Bullets */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-archive-border/40 pt-10">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-archive-accent">
              <Icon name="archive" size={16} />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider">
                1. 100% 免费开源
              </h3>
            </div>
            <p className="font-sans text-xs text-archive-subtle leading-relaxed">
              数据源自 free-programming-books 社区与精选开源项目，全库无商业推广与付费墙。
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-archive-accent">
              <Icon name="shuffle" size={16} />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider">
                2. 五维意图导向
              </h3>
            </div>
            <p className="font-sans text-xs text-archive-subtle leading-relaxed">
              阅读、实战、练习、速查、探索，直达学习起点，告别分类迷宫。
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-archive-accent">
              <Icon name="shortlist" size={16} />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider">
                3. AI 提示词友好
              </h3>
            </div>
            <p className="font-sans text-xs text-archive-subtle leading-relaxed">
              一键导出结构化上下文，让外部大模型生成更可靠的学习规划。
            </p>
          </div>
        </div>
      </section>

      {/* Section 1: Intent Gateway Curations (main body) */}
      <RandomCurations resources={prunedResources} />

      {/* Section 2: Stats strip */}
      {total > 0 && (
        <section className="border-t border-archive-border pt-8 pb-12 animate-fade-in">
          <div className="max-w-xl mb-6">
            <h3 className="font-mono text-[10px] uppercase text-archive-subtle tracking-widest mb-2">
              {"// 全库数据透明度"}
            </h3>
            <p className="font-sans text-xs text-archive-subtle leading-relaxed">
              基于开源社区维护目录自动化清洗，数据保持真实透明，无隐式黑盒过滤。
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Stat label="全库总收录" value={total.toLocaleString()} />
            <Stat label="英文目录" value={enCount.toLocaleString()} accent="en" />
            <Stat label="中文目录" value={zhCount.toLocaleString()} accent="zh" />
            <Stat
              label="Pipeline 同步"
              value={
                manifest?.generatedAt
                  ? new Date(manifest.generatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Sep 11, 2026"
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
