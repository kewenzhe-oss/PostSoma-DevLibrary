"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import EmptyState from "@/components/ui/EmptyState";

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<"bookmarks" | "reading" | "completed">("bookmarks");

  // In a real app, this would fetch from Firebase
  const mockItems = [];

  return (
    <AppShell>
      <div className="mb-8 animate-fade-in flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-archive-text mb-2">
            My Library
          </h1>
          <p className="font-sans text-sm text-archive-subtle">
            Your personal collection and reading progress.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-archive-border mb-8 animate-fade-in">
        <TabButton
          active={activeTab === "bookmarks"}
          onClick={() => setActiveTab("bookmarks")}
          label="Bookmarks"
          count={0}
        />
        <TabButton
          active={activeTab === "reading"}
          onClick={() => setActiveTab("reading")}
          label="Reading Now"
          count={0}
        />
        <TabButton
          active={activeTab === "completed"}
          onClick={() => setActiveTab("completed")}
          label="Completed"
          count={0}
        />
      </div>

      {/* Content */}
      <div className="animate-slide-up">
        {mockItems.length > 0 ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {/* Grid would render ResourceCards here */}
          </div>
        ) : (
          <EmptyState
            icon={activeTab === "bookmarks" ? "bookmark" : "archive"}
            title={`No ${activeTab === "reading" ? "items reading" : activeTab}`}
            description={
              activeTab === "bookmarks"
                ? "You haven't bookmarked any resources yet."
                : activeTab === "reading"
                ? "You aren't currently tracking reading progress for any resources."
                : "You haven't completed any resources yet."
            }
            action={{
              label: "Browse the archive",
              onClick: () => {
                window.location.href = "/resources";
              },
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-6 py-3 font-mono text-xs transition-colors ${
        active
          ? "text-archive-text"
          : "text-archive-subtle hover:text-archive-text hover:bg-archive-surface/50"
      }`}
    >
      {label}
      <span className="ml-2 opacity-50">({count})</span>
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-archive-accent" />
      )}
    </button>
  );
}
