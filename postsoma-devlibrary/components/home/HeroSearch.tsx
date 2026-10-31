"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";

export default function HeroSearch({ totalCount = 5184 }: { totalCount?: number } = {}) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/resources?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative max-w-2xl w-full mt-7"
      role="search"
    >
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-archive-subtle pointer-events-none flex items-center">
        <Icon name="search" size={16} />
      </div>

      <input
        type="search"
        aria-label="搜索资源"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`搜索 ${totalCount.toLocaleString()} 项资源：python、git、机器学习…`}
        className="archive-input pl-10 pr-20 h-14 text-sm font-sans placeholder:text-archive-subtle focus:border-archive-accent"
        autoComplete="off"
        spellCheck={false}
      />

      <button
        type="submit"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-accent text-sm px-4 py-2 h-10 flex items-center gap-1 rounded-sm"
        aria-label="搜索资源"
      >
        <span>搜索</span>
      </button>
    </form>
  );
}
