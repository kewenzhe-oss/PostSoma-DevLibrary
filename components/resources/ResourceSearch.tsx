"use client";

import { useEffect, useRef } from "react";

interface ResourceSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
  isSearching?: boolean;
}

export default function ResourceSearch({
  value,
  onChange,
  resultCount,
  isSearching = false,
}: ResourceSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        onChange("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onChange]);

  return (
    <div className="relative">
      {/* Search icon */}
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 text-archive-subtle pointer-events-none"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
      >
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.25" />
        <path
          d="M11 11L14 14"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>

      <input
        ref={inputRef}
        id="resource-search-input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search resources… (⌘K)"
        className="archive-input pl-9 pr-24"
        autoComplete="off"
        spellCheck={false}
      />

      {/* Result count / shortcut hint */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
        {isSearching && (
          <span className="font-mono text-xs text-archive-subtle animate-pulse">
            …
          </span>
        )}
        {!isSearching && value && resultCount !== undefined && (
          <span className="font-mono text-xs text-archive-subtle">
            {resultCount.toLocaleString()}
          </span>
        )}
        {!value && (
          <span className="hidden sm:flex items-center gap-0.5 font-mono text-xs text-archive-subtle opacity-50">
            <kbd className="px-1 py-0.5 border border-archive-border rounded-sm text-[10px]">
              ⌘
            </kbd>
            <kbd className="px-1 py-0.5 border border-archive-border rounded-sm text-[10px]">
              K
            </kbd>
          </span>
        )}
      </div>
    </div>
  );
}
