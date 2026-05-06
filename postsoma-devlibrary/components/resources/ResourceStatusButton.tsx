"use client";

import { useState } from "react";
import type { ReadingStatus } from "@/lib/types/userLibrary";

interface ResourceStatusButtonProps {
  resourceId: string;
}

export default function ResourceStatusButton({
  resourceId,
}: ResourceStatusButtonProps) {
  // Mock state since Firebase isn't hooked up yet
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [status, setStatus] = useState<ReadingStatus>("not_started");
  const [isLoading, setIsLoading] = useState(false);

  const toggleBookmark = async () => {
    setIsLoading(true);
    // Simulate network request
    await new Promise((r) => setTimeout(r, 500));
    setIsBookmarked(!isBookmarked);
    setIsLoading(false);
  };

  const cycleStatus = async () => {
    setIsLoading(true);
    // Simulate network request
    await new Promise((r) => setTimeout(r, 500));
    const nextStatus: Record<ReadingStatus, ReadingStatus> = {
      not_started: "reading",
      reading: "completed",
      completed: "not_started",
    };
    setStatus(nextStatus[status]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-archive-subtle text-center">
        Your Library
      </h3>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleBookmark}
          disabled={isLoading}
          className={`flex items-center justify-center w-10 h-10 rounded-sm border transition-all ${
            isBookmarked
              ? "bg-archive-accent/10 border-archive-accent-dim text-archive-accent"
              : "bg-archive-bg border-archive-border text-archive-subtle hover:text-archive-text hover:border-archive-muted"
          }`}
          title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        >
          {isBookmarked ? "★" : "☆"}
        </button>

        <button
          onClick={cycleStatus}
          disabled={isLoading}
          className={`flex-1 h-10 px-3 rounded-sm border font-sans text-sm font-medium transition-all ${
            status === "reading"
              ? "bg-archive-en/10 border-archive-en/50 text-[#7ab3d4]"
              : status === "completed"
              ? "bg-[#4a8a5a]/10 border-[#4a8a5a]/50 text-[#85d49b]"
              : "bg-archive-bg border-archive-border text-archive-subtle hover:text-archive-text hover:border-archive-muted"
          }`}
        >
          {status === "not_started" && "Mark as reading"}
          {status === "reading" && "Reading now"}
          {status === "completed" && "Completed ✓"}
        </button>
      </div>
    </div>
  );
}
