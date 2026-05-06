"use client";

import { useState, useEffect } from "react";
import { useBookmarks } from "@/lib/local/bookmarks";

interface BookmarkButtonProps {
  resourceId: string;
  variant?: "icon" | "full";
}

export default function BookmarkButton({ resourceId, variant = "icon" }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  
  // To avoid hydration mismatch, only render correctly after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const bookmarked = mounted ? isBookmarked(resourceId) : false;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if inside a Link
    toggleBookmark(resourceId);
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
          bookmarked
            ? "bg-archive-accent/10 border-archive-accent-dim text-archive-accent"
            : "bg-archive-bg border-archive-border text-archive-subtle hover:text-archive-text hover:border-archive-muted"
        }`}
        title={bookmarked ? "Remove from My Library" : "Save to My Library"}
        aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
      >
        {bookmarked ? "★" : "☆"}
      </button>
    );
  }

  // Full variant for Detail Page
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle text-center">
        Your Library
      </h3>
      <button
        onClick={handleClick}
        className={`flex-1 h-10 px-4 rounded-sm border font-sans text-sm font-medium transition-all flex items-center justify-center gap-2 ${
          bookmarked
            ? "bg-archive-accent/10 border-archive-accent-dim text-archive-accent"
            : "bg-archive-bg border-archive-border text-archive-subtle hover:text-archive-text hover:border-archive-muted"
        }`}
      >
        <span>{bookmarked ? "★" : "☆"}</span>
        <span>{bookmarked ? "Saved to My Library" : "Save to My Library"}</span>
      </button>
    </div>
  );
}
