import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import ResourceExplorer from "@/components/resources/ResourceExplorer";
import { getAllResources, getAllCategories, getToc, getCollections } from "@/lib/data/resources";
import JsonLd from "@/components/seo/JsonLd";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Resources — PostSoma DevLibrary",
  alternates: {
    canonical: "/resources",
  },
};

export default async function ResourcesPage() {
  const [resources, categories, tocNodes, collections] = await Promise.all([
    getAllResources(),
    getAllCategories(),
    getToc(),
    getCollections(),
  ]);

  return (
    <AppShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              "@id": "https://205022.xyz/resources#collection",
              "url": "https://205022.xyz/resources",
              "name": "Resource Archive — PostSoma DevLibrary",
              "description": "Search and filter the complete collection of free programming books, courses, tutorials, cheat sheets, and documentation.",
              "isPartOf": { "@id": "https://205022.xyz/#website" }
            },
            {
              "@type": "BreadcrumbList",
              "@id": "https://205022.xyz/resources#breadcrumb",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": "https://205022.xyz/"
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Resources",
                  "item": "https://205022.xyz/resources"
                }
              ]
            }
          ]
        }}
      />
      <div className="mb-8 animate-fade-in">
        <h1 className="font-display text-3xl text-archive-text mb-2">
          Resource Archive
        </h1>
        <p className="font-sans text-sm text-archive-subtle">
          Search and filter the complete collection.
        </p>
      </div>

      <Suspense fallback={<div className="font-mono text-sm text-archive-subtle animate-pulse">Loading archive...</div>}>
        <ResourceExplorer 
          resources={resources} 
          categories={categories} 
          tocNodes={tocNodes} 
          collections={collections} 
        />
      </Suspense>
    </AppShell>
  );
}
