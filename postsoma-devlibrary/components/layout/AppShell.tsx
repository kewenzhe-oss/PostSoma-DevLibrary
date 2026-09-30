import Link from "next/link";
import AppHeader from "./AppHeader";
import Icon from "@/components/ui/Icon";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="noise-overlay min-h-screen flex flex-col overflow-x-hidden w-full">
      <AppHeader />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-24 md:px-6 md:py-8 md:pb-8">
        {children}
      </main>
      <footer className="border-t border-archive-border mt-auto pb-20 md:pb-0 bg-archive-surface/30">
        <div className="max-w-7xl mx-auto px-4 py-5 md:px-6 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between w-full font-mono text-[11px]">
          {/* Row 1: Nav links to /about anchors & sources */}
          <div className="flex items-center gap-3.5 flex-wrap text-archive-subtle">
            <Link
              href="/about#about"
              className="hover:text-archive-accent transition-colors"
            >
              关于本站
            </Link>
            <span className="opacity-30 select-none">/</span>
            <Link
              href="/about#criteria"
              className="hover:text-archive-accent transition-colors"
            >
              收录原则
            </Link>
            <span className="opacity-30 select-none">/</span>
            <Link
              href="/about#data"
              className="hover:text-archive-accent transition-colors"
            >
              数据开放说明
            </Link>
            <span className="opacity-30 select-none">/</span>
            <a
              href="https://github.com/EbookFoundation/free-programming-books"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-archive-accent transition-colors inline-flex items-center gap-0.5"
            >
              <span>数据源</span>
              <Icon name="external" size={10} className="opacity-60" />
            </a>
          </div>

          {/* Row 2: Monospace factual status */}
          <div className="text-[10px] text-archive-subtle/60 sm:text-right select-none">
            <span>5,184 项收录 · Pipeline 同步 Sep 11, 2026 · 本地计算无追踪</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
