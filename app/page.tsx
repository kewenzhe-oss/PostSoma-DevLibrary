import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { getManifest } from "@/lib/data/resources";
import JsonLd from "@/components/seo/JsonLd";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  // Use the pre-generated manifest for all stats — avoids loading the full
  // 4,839-item resources array on the homepage pre-render path.
  const manifest = await getManifest();

  const zhCount = manifest?.languages?.zh ?? 0;
  const enCount = manifest?.languages?.en ?? 0;
  const total   = manifest?.total ?? 0;

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
              "description": "A curated bilingual archive of free programming books, courses, tutorials, cheat sheets, and documentation.",
              "inLanguage": ["en", "zh"]
            },
            {
              "@type": "WebPage",
              "@id": "https://205022.xyz/#webpage",
              "url": "https://205022.xyz/",
              "name": "PostSoma DevLibrary — Bilingual Programming Archive",
              "isPartOf": { "@id": "https://205022.xyz/#website" },
              "description": "A curated bilingual archive of free programming books, courses, tutorials, cheat sheets, and documentation.",
              "inLanguage": ["en", "zh"]
            }
          ]
        }}
      />
      {/* Hero */}
      <section className="pt-16 pb-20 animate-slide-up">
        {/* Label */}
        <p className="font-mono text-xs tracking-widest text-archive-subtle uppercase mb-6">
          Programming Learning Archive
        </p>

        {/* Title */}
        <h1 className="font-display text-5xl md:text-6xl text-archive-text leading-tight mb-6 max-w-2xl">
          The Bilingual
          <br />
          Dev Library.
        </h1>

        {/* Tagline */}
        <p className="font-sans text-base text-archive-subtle max-w-lg leading-relaxed mb-10">
          A curated archive of free programming books, courses, cheat sheets, and interactive resources — in English and Chinese. Search-first, directory-aware, no account required.
        </p>

        {/* CTA */}
        <div className="flex items-center gap-4">
          <Link href="/resources" id="hero-browse-btn" className="btn-accent px-6 py-2.5 text-sm">
            Browse the archive
          </Link>
          <Link href="/library" id="hero-library-btn" className="btn-ghost">
            My Library
          </Link>
        </div>
      </section>

      {/* Stats strip */}
      {total > 0 && (
        <section className="border-t border-archive-border pt-8 pb-12 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Stat label="Total resources" value={total.toLocaleString()} />
            <Stat label="English" value={enCount.toLocaleString()} accent="en" />
            <Stat label="中文" value={zhCount.toLocaleString()} accent="zh" />
            <Stat
              label="Last updated"
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

      {/* Feature callouts */}
      <section className="pb-16 grid md:grid-cols-3 gap-4 animate-fade-in">
        <FeatureCard
          title="Instant search"
          description="Fuzzy full-text search across titles, categories, and tags. No page reload."
        />
        <FeatureCard
          title="Structured archive"
          description="Browse Books, Cheat Sheets, Courses, and Interactive resources through collection-aware directories."
        />
        <FeatureCard
          title="Local library"
          description="Save resources locally in your browser. No sign-in required."
        />
      </section>

      {/* About / ARO Section */}
      <section className="border-t border-archive-border pt-16 pb-12 animate-fade-in max-w-3xl">
        <h2 className="font-display text-2xl text-archive-text mb-6">
          What is PostSoma DevLibrary?
        </h2>
        <div className="space-y-6 text-sm text-archive-subtle leading-relaxed font-sans">
          <p>
            PostSoma DevLibrary is a bilingual archive of free programming books, courses, cheat sheets, tutorials, and documentation. It helps English and Chinese learners find structured programming resources quickly through search-first navigation and collection-aware browsing.
          </p>
          <div>
            <h3 className="font-mono text-xs text-archive-accent uppercase tracking-wider mb-3">
              Key takeaways:
            </h3>
            <ul className="space-y-2 font-mono text-xs list-none pl-0">
              <li className="flex items-start gap-2">
                <span className="text-archive-accent">▪</span>
                <span>4,800+ curated programming learning resources.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-archive-accent">▪</span>
                <span>Covers English and Chinese materials from books to interactive tools.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-archive-accent">▪</span>
                <span>No account required; users can save resources locally in the browser.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
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
        className={`font-display text-3xl ${
          accent === "en"
            ? "text-archive-en"
            : accent === "zh"
            ? "text-archive-zh"
            : "text-archive-text"
        }`}
      >
        {value}
      </span>
      <span className="font-mono text-xs text-archive-subtle">{label}</span>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="archive-card p-5">
      <h3 className="font-display text-base text-archive-text mb-2">{title}</h3>
      <p className="font-sans text-sm text-archive-subtle leading-relaxed">
        {description}
      </p>
    </div>
  );
}
