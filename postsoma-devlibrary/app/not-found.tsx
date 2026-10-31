import Link from "next/link";
import AppShell from "@/components/layout/AppShell";

export default function NotFound() {
  return (
    <AppShell>
      <div className="max-w-md mx-auto text-center py-20 flex flex-col items-center gap-6 animate-fade-in">
        <span className="font-mono text-xs text-archive-accent uppercase tracking-widest bg-archive-border/30 px-3 py-1 rounded-full border border-archive-border/50">
          404
        </span>
        <h1 className="font-display text-4xl text-archive-text leading-snug">
          没有找到这个页面
        </h1>
        <p className="font-sans text-sm text-archive-subtle leading-relaxed">
          该资源或页面可能已被移除，试试返回资源库搜索。
        </p>
        <Link href="/resources" className="btn-accent px-6 py-2.5 text-xs font-mono">
          ← 返回资源库
        </Link>
      </div>
    </AppShell>
  );
}
