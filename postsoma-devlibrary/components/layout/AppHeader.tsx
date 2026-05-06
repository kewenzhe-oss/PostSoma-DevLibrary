"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/resources", label: "Archive" },
  { href: "/library", label: "My Library" },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-archive-border bg-archive-bg/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-3 group">
          {/* Diamond icon */}
          <span className="relative flex items-center justify-center w-7 h-7">
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              className="transition-transform duration-300 group-hover:rotate-45"
            >
              <rect
                x="11"
                y="1.5"
                width="13"
                height="13"
                rx="1"
                transform="rotate(45 11 1.5)"
                stroke="#c8a96e"
                strokeWidth="1.25"
                fill="none"
              />
              <rect
                x="11"
                y="5"
                width="8.5"
                height="8.5"
                rx="0.5"
                transform="rotate(45 11 5)"
                fill="rgba(200,169,110,0.12)"
              />
            </svg>
          </span>
          <div className="flex flex-col leading-none">
            <span className="font-display text-sm text-archive-text tracking-wide">
              PostSoma
            </span>
            <span className="font-mono text-[10px] text-archive-subtle tracking-widest uppercase">
              DevLibrary
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 text-sm font-sans rounded-sm transition-all duration-150 ${
                  isActive
                    ? "text-archive-accent bg-archive-surface border border-archive-border"
                    : "text-archive-subtle hover:text-archive-text"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Divider */}
          <span className="mx-2 h-4 w-px bg-archive-border" />

          {/* Auth placeholder */}
          <button
            id="header-sign-in-btn"
            className="btn-ghost text-xs"
            onClick={() => {}}
          >
            Sign in
          </button>
        </nav>
      </div>
    </header>
  );
}
