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
    <>
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
        <nav className="hidden md:flex items-center gap-1">
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

    {/* Mobile Bottom Tab Bar */}
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-archive-surface/95 backdrop-blur-md border-t border-archive-border min-h-16 pt-2 flex items-center justify-around md:hidden pb-safe">
      {mobileNavLinks.map((link) => {
        const isActive =
          link.href === "/"
            ? pathname === "/"
            : pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all duration-150 active:scale-95 ${
              isActive
                ? "text-archive-accent"
                : "text-archive-subtle hover:text-archive-text"
            }`}
          >
            {link.icon}
            <span className="text-[10px] font-mono mt-1 font-medium">{link.label}</span>
          </Link>
        );
      })}
    </nav>
    </>
  );
}

const mobileNavLinks = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: "/resources",
    label: "Archive",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
  {
    href: "/library",
    label: "My Library",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
      </svg>
    ),
  },
];

