"use client";

import { useBookmarks } from "@/lib/local/bookmarks";
import type { Resource } from "@/lib/types/resource";
import ResourceGrid from "@/components/resources/ResourceGrid";
import EmptyState from "@/components/ui/EmptyState";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface LocalLibraryClientProps {
  allResources: Resource[];
}

export default function LocalLibraryClient({ allResources }: LocalLibraryClientProps) {
  const { bookmarks } = useBookmarks();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Avoid hydration mismatch by rendering nothing or a skeleton until client loads localStorage
    return null; 
  }

  const savedResources = allResources.filter((r) => bookmarks.includes(r.id));

  return (
    <div className="animate-slide-up">
      {savedResources.length > 0 ? (
        <ResourceGrid resources={savedResources} />
      ) : (
        <EmptyState
          icon="bookmark"
          title="No saved resources"
          description="Save resources from the archive and they will appear here. Saved locally in this browser."
          action={{
            label: "Browse the archive",
            onClick: () => {
              router.push("/resources");
            },
          }}
        />
      )}
    </div>
  );
}
