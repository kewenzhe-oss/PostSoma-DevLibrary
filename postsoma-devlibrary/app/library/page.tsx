import AppShell from "@/components/layout/AppShell";
import LocalLibraryClient from "@/components/library/LocalLibraryClient";
import { getAllResources } from "@/lib/data/resources";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Library — PostSoma DevLibrary",
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: "My Library — PostSoma DevLibrary",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "My Library — PostSoma DevLibrary",
    images: ["/og-image.png"],
  },
};

export default async function LibraryPage() {
  const allResources = await getAllResources();

  return (
    <AppShell>
      <div className="mb-8 animate-fade-in flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-archive-text mb-2">
            我的收藏
          </h1>
          <p className="font-sans text-sm text-archive-subtle">
            收藏保存在当前浏览器中，清除浏览器数据后可能丢失。
          </p>
        </div>
      </div>

      {/* Render local library logic */}
      <LocalLibraryClient allResources={allResources} />
    </AppShell>
  );
}
