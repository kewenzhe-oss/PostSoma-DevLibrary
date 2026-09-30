import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import ResourceExplorer from "@/components/resources/ResourceExplorer";
import { getAllResources, getToc, getCollections } from "@/lib/data/resources";
import { getGitHubFavoritesForUi } from "@/lib/data/github-favorite-ui";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteSiteUrl } from "@/lib/config/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Full Archive — PostSoma DevLibrary",
  description:
    "5,184 free programming books, courses, cheat sheets and hand-picked open-source repos. No black-box ranking. Search, filter, go straight to the source.",
  alternates: {
    canonical: "/resources",
  },
  openGraph: {
    title: "Full Archive — PostSoma DevLibrary",
    description:
      "5,184 free programming books, courses, cheat sheets and hand-picked open-source repos. No black-box ranking. Search, filter, go straight to the source.",
    url: "/resources",
    siteName: "PostSoma DevLibrary",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Full Archive — PostSoma DevLibrary",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Full Archive — PostSoma DevLibrary",
    description:
      "5,184 free programming books, courses, cheat sheets and hand-picked open-source repos. No black-box ranking. Search, filter, go straight to the source.",
    images: ["/og-image.png"],
  },
};

export default async function ResourcesPage() {
  const [resources, tocNodes, collections, githubFavorites] = await Promise.all([
    getAllResources(),
    getToc(),
    getCollections(),
    getGitHubFavoritesForUi(),
  ]);

  return (
    <AppShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              "@id": absoluteSiteUrl("/resources#collection"),
              "url": absoluteSiteUrl("/resources"),
              "name": "Full Archive — PostSoma DevLibrary",
              "description": `${resources.length.toLocaleString()} free programming books, courses, cheat sheets and hand-picked open-source repos. No black-box ranking. Search, filter, go straight to the source.`,
              "isPartOf": { "@id": absoluteSiteUrl("/#website") }
            },
            {
              "@type": "BreadcrumbList",
              "@id": absoluteSiteUrl("/resources#breadcrumb"),
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": absoluteSiteUrl("/")
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Resources",
                  "item": absoluteSiteUrl("/resources")
                }
              ]
            }
          ]
        }}
      />
      <div className="mb-4 md:mb-8 animate-fade-in">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-archive-accent-dim">
          Read · Practice · Explore
        </p>
        <h1 className="font-display text-2xl md:text-3xl text-archive-text mb-1 md:mb-2">
          Full Archive
        </h1>
        <p className="max-w-2xl font-sans text-xs leading-relaxed text-archive-subtle md:text-sm">
          {resources.length.toLocaleString()} free programming books, courses, cheat sheets and hand-picked open-source repos. No black-box ranking. Search, filter, go straight to the source.
        </p>
      </div>

      <Suspense fallback={<div className="font-mono text-sm text-archive-subtle animate-pulse">Loading archive...</div>}>
        <ResourceExplorer 
          resources={resources} 
          tocNodes={tocNodes} 
          collections={collections} 
          githubFavorites={githubFavorites}
        />
      </Suspense>
    </AppShell>
  );
}
