"use client";

import Link from "next/link";
import Image from "next/image";
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
            <Image
              src="/logo-mark.png"
              alt="PostSoma DevLibrary"
              width={28}
              height={28}
              className="transition-transform duration-300 group-hover:scale-105"
            />
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

        </nav>
      </div>
    </header>
  );
}
