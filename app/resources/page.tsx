import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import ResourceExplorer from "@/components/resources/ResourceExplorer";
import { getAllResources, getAllCategories, getToc, getCollections } from "@/lib/data/resources";

export const metadata = {
  title: "Browse Resources — PostSoma DevLibrary",
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
