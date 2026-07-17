import Link from "next/link";
import AppShell from "@/components/layout/AppShell";

export default function NotFound() {
  return (
    <AppShell>
      <div className="max-w-md mx-auto text-center py-20 flex flex-col items-center gap-6 animate-fade-in">
        <span className="font-mono text-xs text-archive-accent uppercase tracking-widest bg-archive-border/30 px-3 py-1 rounded-full border border-archive-border/50">
          404 Not Found
        </span>
        <h1 className="font-display text-4xl text-archive-text leading-snug">
          Page Not Found
        </h1>
        <p className="font-sans text-sm text-archive-subtle leading-relaxed">
          The programming resource or archive page you are looking for does not exist or has been moved.
        </p>
        <Link href="/resources" className="btn-accent px-6 py-2.5 text-xs font-mono">
          ← Back to Archive
        </Link>
      </div>
    </AppShell>
  );
}
