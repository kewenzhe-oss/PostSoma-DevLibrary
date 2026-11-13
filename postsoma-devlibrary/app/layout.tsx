import type { Metadata } from "next";
import localFont from "next/font/local";
import { SITE_URL } from "@/lib/config/site";
import PostSomaAnalytics from "@/components/analytics/PostSomaAnalytics";
import "./globals.css";

const dmSerifDisplay = localFont({
  src: "../public/fonts/DMSerifDisplay-Regular.woff2",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "PostSoma DevLibrary — Bilingual Programming Archive",
  description:
    "A curated bilingual (EN/ZH) archive of 5,000+ free programming books, courses, tutorials, and documentation. Search-first, dark mode, no noise.",
  keywords: [
    "PostSoma DevLibrary",
    "Dev Library",
    "programming books",
    "free programming courses",
    "developer archive",
    "tutorials",
    "documentation",
    "bilingual",
    "Chinese",
    "English",
    "雙語編程",
    "開源教材",
    "技術深度解析"
  ],
  icons: {
    icon: [
      { url: "/favicon.ico?v=2" },
      { url: "/icon.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon.png?v=2", sizes: "512x512", type: "image/png" }],
    shortcut: ["/favicon.ico?v=2"],
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PostSoma DevLibrary — Bilingual Programming Archive",
    description:
      "A curated bilingual (EN/ZH) archive of 5,000+ free programming books, courses, tutorials, and documentation. Search-first, dark mode, no noise.",
    url: "/",
    siteName: "PostSoma DevLibrary",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PostSoma DevLibrary — 5,000+ Curated Free Programming Resources",
      },
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "PostSoma DevLibrary — 5,000+ Curated Free Programming Resources",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PostSoma DevLibrary — Bilingual Programming Archive",
    description:
      "A curated bilingual (EN/ZH) archive of 5,000+ free programming books, courses, tutorials, and documentation. Search-first, dark mode, no noise.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      className={`${dmSerifDisplay.variable}`}
      style={{
        ["--font-sans" as any]: "'Instrument Sans', system-ui, -apple-system, sans-serif",
        ["--font-mono" as any]: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      <body className="bg-archive-bg text-archive-text font-sans antialiased min-h-screen">
        <PostSomaAnalytics />
        {children}
      </body>
    </html>
  );
}
