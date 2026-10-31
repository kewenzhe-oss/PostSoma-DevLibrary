import Link from "next/link";
import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import JsonLd from "@/components/seo/JsonLd";
import { getManifest } from "@/lib/data/resources";
import { isGoogleAnalyticsEnabled } from "@/lib/config/analytics";
import { absoluteSiteUrl } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "关于本站与收录原则 — PostSoma DevLibrary",
  description: "了解 PostSoma DevLibrary 的资源来源、收录原则和数据使用方式。",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const manifest = await getManifest();
  const generatedAt = manifest?.generatedAt ? new Date(manifest.generatedAt) : null;
  const updated = generatedAt && !Number.isNaN(generatedAt.getTime())
    ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(generatedAt)
    : null;

  return (
    <AppShell>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "AboutPage", "@id": absoluteSiteUrl("/about#webpage"), url: absoluteSiteUrl("/about"), name: "关于本站与收录原则 — PostSoma DevLibrary", isPartOf: { "@id": absoluteSiteUrl("/#website") } }} />
      <div className="max-w-3xl mx-auto py-4 md:py-8 space-y-12">
        <header className="border-b border-archive-border pb-8">
          <h1 className="font-display text-3xl text-archive-text mb-3">关于这份资源库</h1>
          <p className="text-sm leading-relaxed text-archive-subtle">收集编程学习资料，帮助你找到合适的起点。</p>
        </header>
        <section id="about" className="space-y-4 scroll-mt-20 text-sm leading-relaxed text-archive-subtle">
          <h2 className="font-display text-xl text-archive-text">关于本站</h2>
          <p>PostSoma DevLibrary 整理了中英文编程书籍、课程、文档、互动练习和开源项目。资源链接指向原站，内容及访问条件可能随时间变化。</p>
          <p>搜索与推荐在浏览器中根据目录信息计算；推荐结果仅供参考，请访问原站判断内容是否适合你。</p>
        </section>
        <section id="criteria" className="space-y-4 scroll-mt-20 text-sm leading-relaxed text-archive-subtle">
          <h2 className="font-display text-xl text-archive-text">收录原则</h2>
          <p>资源库以免费学习资料为主，结合社区维护的目录与人工整理的开源项目。我们希望资源便于访问，也适合自学者查找和使用。</p>
          <p>外部网站可能变更或停止服务；遇到失效链接或访问限制时，请以原站实际情况为准。</p>
        </section>
        <section id="data" className="space-y-4 scroll-mt-20 text-sm leading-relaxed text-archive-subtle">
          <h2 className="font-display text-xl text-archive-text">数据与隐私</h2>
          <p>基础目录来自 <a href="https://github.com/EbookFoundation/free-programming-books" target="_blank" rel="noopener noreferrer" className="text-archive-accent hover:underline">free-programming-books ↗</a>，并加入人工整理的 GitHub 项目。{updated && ` 当前目录生成于 ${updated}。`}</p>
          <p>收藏保存在当前浏览器的本地存储中，不会自动同步到其他设备。清除浏览器数据可能删除收藏。</p>
          {isGoogleAnalyticsEnabled && <p>线上版本启用 Google Analytics，用于网站访问统计。</p>}
          <p>目录数据以静态文件提供；<Link href="/llms.txt" className="text-archive-accent hover:underline">查看机器可读说明</Link>。</p>
        </section>
        <div className="pt-6 border-t border-archive-border flex flex-wrap justify-between gap-4 text-sm">
          <Link href="/" className="text-archive-subtle hover:text-archive-accent">← 返回首页</Link>
          <Link href="/resources" className="text-archive-accent hover:underline">浏览资源库 →</Link>
        </div>
      </div>
    </AppShell>
  );
}
