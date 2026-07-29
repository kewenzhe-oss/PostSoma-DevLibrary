import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import ResourceExplorer from "@/components/resources/ResourceExplorer";
import { getAllResources, getAllCategories, getToc, getCollections } from "@/lib/data/resources";
import { getGitHubFavoritesForUi } from "@/lib/data/github-favorite-ui";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteSiteUrl } from "@/lib/config/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Resources — PostSoma DevLibrary",
  description:
    "Search the PostSoma DevLibrary archive of free programming books, courses, cheat sheets, interactive learning tools, and curated GitHub projects.",
  alternates: {
    canonical: "/resources",
  },
  openGraph: {
    title: "Browse Resources — PostSoma DevLibrary",
    description:
      "Search the PostSoma DevLibrary archive of free programming books, courses, cheat sheets, interactive learning tools, and curated GitHub projects.",
    url: "/resources",
    siteName: "PostSoma DevLibrary",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Resources — PostSoma DevLibrary",
    description:
      "Search the PostSoma DevLibrary archive of free programming books, courses, cheat sheets, interactive learning tools, and curated GitHub projects.",
  },
};

export default async function ResourcesPage() {
  const [resources, categories, tocNodes, collections, githubFavorites] = await Promise.all([
    getAllResources(),
    getAllCategories(),
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
              "name": "Resource Archive — PostSoma DevLibrary",
              "description": "Search and filter the complete collection of free programming books, courses, tutorials, cheat sheets, and documentation.",
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
        <h1 className="font-display text-2xl md:text-3xl text-archive-text mb-1 md:mb-2">
          Resource Archive
        </h1>
        <p className="font-sans text-xs md:text-sm text-archive-subtle">
          Search and filter the complete collection.
        </p>
      </div>

      <Suspense fallback={<div className="font-mono text-sm text-archive-subtle animate-pulse">Loading archive...</div>}>
        <ResourceExplorer 
          resources={resources} 
          categories={categories} 
          tocNodes={tocNodes} 
          collections={collections} 
          githubFavorites={githubFavorites}
        />
      </Suspense>
    </AppShell>
  );
}
