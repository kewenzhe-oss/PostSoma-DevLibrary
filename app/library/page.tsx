import AppShell from "@/components/layout/AppShell";
import LocalLibraryClient from "@/components/library/LocalLibraryClient";
import { getAllResources } from "@/lib/data/resources";

export const metadata = {
  title: "My Library — PostSoma DevLibrary",
};

export default async function LibraryPage() {
  const allResources = await getAllResources();

  return (
    <AppShell>
      <div className="mb-8 animate-fade-in flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-archive-text mb-2">
            My Library
          </h1>
          <p className="font-sans text-sm text-archive-subtle">
            Your saved resources on this browser.
          </p>
        </div>
      </div>

      {/* Render local library logic */}
      <LocalLibraryClient allResources={allResources} />
    </AppShell>
  );
}
