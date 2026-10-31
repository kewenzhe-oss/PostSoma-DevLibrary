"use client";

import { useState, useEffect } from "react";
import { useBookmarks } from "@/lib/local/bookmarks";
import Icon from "@/components/ui/Icon";

interface BookmarkButtonProps {
  resourceId: string;
  resourceTitle?: string;
  variant?: "icon" | "full";
}

export default function BookmarkButton({ resourceId, resourceTitle, variant = "icon" }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  
  // To avoid hydration mismatch, only render correctly after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const bookmarked = mounted ? isBookmarked(resourceId) : false;
  const [error, setError] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if inside a Link
    e.stopPropagation();
    try {
      toggleBookmark(resourceId);
      setError(false);
    } catch {
      setError(true);
    }
  };

  if (variant === "icon") {
    return (
      <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center justify-center w-11 h-11 md:w-8 md:h-8 rounded-full border transition-all ${
          bookmarked
            ? "bg-archive-accent/10 border-archive-accent-dim text-archive-accent"
            : "bg-archive-bg border-archive-border text-archive-subtle hover:text-archive-text hover:border-archive-muted"
        }`}
        title={bookmarked ? "取消收藏" : "收藏资源"}
        aria-label={resourceTitle ? `${bookmarked ? "取消收藏" : "收藏"}：${resourceTitle}` : bookmarked ? "取消收藏" : "收藏资源"}
        aria-pressed={bookmarked}
      >
        <Icon name={bookmarked ? "libraryActive" : "library"} size={18} />
      </button>
      {error && <span role="alert" className="text-xs text-rose-300">收藏失败，请检查浏览器存储权限。</span>}
      </div>
    );
  }

  // Full variant for Detail Page
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-pressed={bookmarked}
        onClick={handleClick}
        className={`flex-1 h-11 md:h-10 px-4 rounded-sm border font-sans text-sm font-medium transition-all flex items-center justify-center gap-2 ${
          bookmarked
            ? "bg-archive-accent/10 border-archive-accent-dim text-archive-accent"
            : "bg-archive-bg border-archive-border text-archive-subtle hover:text-archive-text hover:border-archive-muted"
        }`}
      >
        <Icon name={bookmarked ? "libraryActive" : "library"} size={18} />
        <span>{bookmarked ? "已收藏 · 点击取消" : "收藏资源"}</span>
      </button>
      {error && <p role="alert" className="text-xs text-rose-300">收藏失败，请检查浏览器存储权限。</p>}
    </div>
  );
}
