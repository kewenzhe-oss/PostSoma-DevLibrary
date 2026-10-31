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
    <AppShell showMascot>
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

      <section className="pt-10 pb-12 md:pt-16 md:pb-16">
        <h1 className="font-display text-4xl md:text-5xl text-archive-text leading-tight mb-4 max-w-2xl">
          Find one good place to begin.
        </h1>
        <p className="font-sans text-base text-archive-subtle max-w-2xl leading-relaxed">
          在 {allResources.length.toLocaleString()} 项免费编程资源中，找到适合你的书籍、课程、文档和开源项目。
        </p>
        <HeroSearch totalCount={allResources.length} />
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Link href="/resources" id="hero-browse-btn" className="text-archive-text hover:text-archive-accent underline underline-offset-4 decoration-archive-muted">
            浏览全部资源 <span aria-hidden="true">→</span>
          </Link>
          <Link href="/recommend" id="hero-recommend-btn" className="text-archive-subtle hover:text-archive-accent underline underline-offset-4 decoration-archive-muted">
            不知道从哪开始？获取推荐 <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* Section 1: Intent Gateway Curations (main body) */}
      <RandomCurations resources={prunedResources} />

      {/* Section 2: Stats strip */}
      {total > 0 && (
        <section className="border-t border-archive-border pt-8 pb-12 animate-fade-in">
          <div className="max-w-xl mb-6">
            <h2 className="text-sm font-semibold text-archive-text mb-2">关于这份资源库</h2>
            <p className="font-sans text-xs text-archive-subtle leading-relaxed">
              资源来自开源社区维护的目录，并经过整理与分类。
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Stat label="全库总收录" value={total.toLocaleString()} />
            <Stat label="英文目录" value={enCount.toLocaleString()} accent="en" />
            <Stat label="中文目录" value={zhCount.toLocaleString()} accent="zh" />
            <Stat
              label="更新日期"
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
