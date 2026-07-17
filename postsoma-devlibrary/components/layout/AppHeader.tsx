"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";

const navLinks = [
  { href: "/recommend", label: "Recommend", icon: "shortlist" as const, activeIcon: "shortlistActive" as const },
  { href: "/resources", label: "Archive", icon: "archive" as const, activeIcon: "archiveActive" as const },
  { href: "/library", label: "My Library", icon: "library" as const, activeIcon: "libraryActive" as const },
];

export default function AppHeader() {
  const pathname = usePathname();
  const [manifest, setManifest] = useState<any>(null);

  useEffect(() => {
    fetch("/data/manifest.json")
      .then((res) => res.json())
      .then((data) => setManifest(data))
      .catch((err) => console.error("Failed to load header manifest:", err));
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-archive-border bg-archive-bg/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          
          {/* Logo and branding hierarchy */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="relative flex items-center justify-center w-7 h-7">
                <Image
                  src="/logo-mark.png"
                  alt="PostSoma DevLibrary"
                  width={28}
                  height={28}
                  className="transition-transform duration-300 group-hover:scale-105"
                />
              </span>
              <div className="flex flex-col leading-none pt-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-[9px] text-archive-subtle uppercase tracking-wider">
                    POSTSOMA
                  </span>
                  <span className="font-display text-sm text-archive-text tracking-wide font-bold">
                    DEVLIBRARY
                  </span>
                </div>
                <span className="font-mono text-[8px] text-archive-accent tracking-widest uppercase mt-0.5">
                  ARCHIVE NODE // PORT.2050
                </span>
              </div>
            </Link>

            {/* System Status Strip */}
            {manifest && (
              <div className="hidden lg:flex items-center gap-3 font-mono text-[9px] text-archive-subtle/60 border-l border-archive-border/40 pl-4 h-5 mt-0.5">
                <span>INDEX: {manifest.total?.toLocaleString() ?? "—"}</span>
                <span>/</span>
                <span>UPDATED: {manifest.generatedAt ? new Date(manifest.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase() : "—"}</span>
              </div>
            )}
          </div>

          {/* Navigation Links and Portals */}
          <div className="hidden md:flex items-center gap-3">
            <nav className="flex items-center gap-1.5 mr-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 text-xs font-mono rounded-sm transition-all duration-150 flex items-center gap-1.5 border border-transparent ${
                      isActive
                        ? "text-archive-accent bg-archive-surface border-archive-border"
                        : "text-archive-subtle hover:text-archive-text"
                    }`}
                  >
                    <Icon name={isActive ? link.activeIcon : link.icon} size={14} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <a
              href="https://postsoma-2050.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-mono text-archive-subtle hover:text-archive-accent border border-archive-border/40 rounded-sm hover:border-archive-accent/40 transition-colors"
            >
              postsoma-2050 <Icon name="external" size={12} className="opacity-70" />
            </a>
          </div>
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
              className={`flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-all duration-150 active:scale-95 ${
                isActive
                  ? "text-archive-accent"
                  : "text-archive-subtle hover:text-archive-text"
              }`}
            >
              <Icon name={isActive ? link.activeIcon : link.icon} size={18} />
              <span className="text-[9px] font-mono mt-1 font-medium">{link.label}</span>
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
    icon: "home" as const,
    activeIcon: "homeActive" as const,
  },
  {
    href: "/recommend",
    label: "Recommend",
    icon: "shortlist" as const,
    activeIcon: "shortlistActive" as const,
  },
  {
    href: "/resources",
    label: "Archive",
    icon: "archive" as const,
    activeIcon: "archiveActive" as const,
  },
  {
    href: "/library",
    label: "My Library",
    icon: "library" as const,
    activeIcon: "libraryActive" as const,
  },
];
