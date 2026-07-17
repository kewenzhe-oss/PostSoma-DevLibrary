import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const dmSerifDisplay = localFont({
  src: "../public/fonts/DMSerifDisplay-Regular.woff2",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://205022.xyz"),
  title: "PostSoma DevLibrary — Bilingual Programming Archive",
  description:
    "A curated bilingual (EN/ZH) archive of free programming books, courses, tutorials, and documentation. Search-first, dark mode, no noise.",
  keywords: ["programming", "books", "tutorials", "free", "bilingual", "Chinese", "English"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PostSoma DevLibrary — Bilingual Programming Archive",
    description:
      "A curated bilingual (EN/ZH) archive of free programming books, courses, tutorials, and documentation. Search-first, dark mode, no noise.",
    url: "/",
    siteName: "PostSoma DevLibrary",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "PostSoma DevLibrary — Bilingual Programming Archive",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PostSoma DevLibrary — Bilingual Programming Archive",
    description:
      "A curated bilingual (EN/ZH) archive of free programming books, courses, tutorials, and documentation. Search-first, dark mode, no noise.",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSerifDisplay.variable}`}
      style={{
        ["--font-sans" as any]: "'Instrument Sans', system-ui, -apple-system, sans-serif",
        ["--font-mono" as any]: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      <body className="bg-archive-bg text-archive-text font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
