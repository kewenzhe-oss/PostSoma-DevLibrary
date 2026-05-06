"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "postsoma_bookmarks";

export function getBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setBookmarks(bookmarks: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  // Dispatch custom event so other components in the same window update
  window.dispatchEvent(new Event("postsoma_bookmarks_changed"));
}

export function toggleBookmark(resourceId: string): boolean {
  const current = getBookmarks();
  const index = current.indexOf(resourceId);
  let isBookmarked = false;

  if (index >= 0) {
    current.splice(index, 1);
  } else {
    current.push(resourceId);
    isBookmarked = true;
  }

  setBookmarks(current);
  return isBookmarked;
}

export function useBookmarks() {
  const [bookmarks, setBookmarksState] = useState<string[]>([]);

  useEffect(() => {
    // Initial load
    setBookmarksState(getBookmarks());

    // Listen for custom events (same window)
    const handleCustomChange = () => {
      setBookmarksState(getBookmarks());
    };

    // Listen for storage events (other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setBookmarksState(getBookmarks());
      }
    };

    window.addEventListener("postsoma_bookmarks_changed", handleCustomChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("postsoma_bookmarks_changed", handleCustomChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    return toggleBookmark(id);
  }, []);

  const isBookmarked = useCallback(
    (id: string) => {
      return bookmarks.includes(id);
    },
    [bookmarks]
  );

  return {
    bookmarks,
    toggleBookmark: toggle,
    isBookmarked,
  };
}
