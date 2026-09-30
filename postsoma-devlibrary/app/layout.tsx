import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { SITE_URL } from "@/lib/config/site";
import {
  GA_MEASUREMENT_ID,
  isGoogleAnalyticsEnabled,
} from "@/lib/config/analytics";
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
  keywords: ["programming", "books", "tutorials", "free", "bilingual", "Chinese", "English"],
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
      lang="en"
      className={`${dmSerifDisplay.variable}`}
      style={{
        ["--font-sans" as any]: "'Instrument Sans', system-ui, -apple-system, sans-serif",
        ["--font-mono" as any]: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      <body className="bg-archive-bg text-archive-text font-sans antialiased min-h-screen">
        {isGoogleAnalyticsEnabled && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
            </Script>
          </>
        )}
        {children}
      </body>
    </html>
  );
}
