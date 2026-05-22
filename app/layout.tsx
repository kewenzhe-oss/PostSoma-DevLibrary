import type { Metadata } from "next";
import { DM_Serif_Display, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
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
      className={`${dmSerifDisplay.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-archive-bg text-archive-text font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
