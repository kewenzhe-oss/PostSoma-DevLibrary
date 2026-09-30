import AppShell from "@/components/layout/AppShell";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteSiteUrl } from "@/lib/config/site";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "关于本站与收录原则 — PostSoma DevLibrary",
  description:
    "PostSoma DevLibrary 建站初衷、收录原则与数据开放透明度说明。收录 5,184 项免费编程资源，无商业推广，无黑盒过滤。",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "关于本站与收录原则 — PostSoma DevLibrary",
    description:
      "PostSoma DevLibrary 建站初衷、收录原则与数据开放透明度说明。收录 5,184 项免费编程资源，无商业推广，无黑盒过滤。",
    url: "/about",
    siteName: "PostSoma DevLibrary",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "关于本站与收录原则 — PostSoma DevLibrary",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "关于本站与收录原则 — PostSoma DevLibrary",
    description:
      "PostSoma DevLibrary 建站初衷、收录原则与数据开放透明度说明。收录 5,184 项免费编程资源，无商业推广，无黑盒过滤。",
    images: ["/og-image.png"],
  },
};

export default function AboutPage() {
  return (
    <AppShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "@id": absoluteSiteUrl("/about#webpage"),
          url: absoluteSiteUrl("/about"),
          name: "关于本站与收录原则 — PostSoma DevLibrary",
          description:
            "PostSoma DevLibrary 建站初衷、收录原则与数据开放透明度说明。",
          isPartOf: { "@id": absoluteSiteUrl("/#website") },
          inLanguage: ["zh", "en"],
        }}
      />

      <div className="max-w-3xl mx-auto py-4 md:py-8 space-y-12 animate-fade-in font-sans">
        {/* Header */}
        <div className="space-y-3 border-b border-archive-border/60 pb-8">
          <p className="font-mono text-[10px] text-archive-accent uppercase tracking-[0.2em]">
            {"// SYSTEM MANIFEST"}
          </p>
          <h1 className="font-display text-2xl md:text-3xl text-archive-text font-bold leading-tight">
            关于本站与收录原则
          </h1>
          <p className="font-mono text-xs text-archive-subtle/80 leading-relaxed">
            5,184 项收录 · 纯粹索引 · 零商业推广 · 本地规则引擎
          </p>
        </div>

        {/* Section 1: About */}
        <section id="about" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-archive-accent font-bold">
              01 /
            </span>
            <h2 className="font-display text-lg text-archive-text font-semibold">
              关于本站 (About)
            </h2>
          </div>
          <div className="space-y-3.5 text-xs md:text-sm text-archive-subtle leading-relaxed">
            <p>
              PostSoma DevLibrary（
              <a
                href="https://www.205022.xyz"
                className="text-archive-text underline hover:text-archive-accent font-mono text-xs"
              >
                205022.xyz
              </a>
              ）是一个为自学者与 AI Agent 打造的免费编程资源索引库。全站收录{" "}
              <strong className="text-archive-text font-mono">5,184</strong>{" "}
              项免费技术资料，涵盖经典书籍、官方文档、交互教程与精选开源项目。
            </p>
            <p>
              我们坚持<strong className="text-archive-text">「标题独裁」</strong>表达哲学——标题承载了 80% 的决策信息。面对互联网碎片化的信息泛滥，自学者最稀缺的是清晰、真实且低噪的起点。本站去除花哨包装与层级噪音，提供直接可达的资源链接。
            </p>
            <p>
              本站的推荐与搜索匹配算法<strong className="text-archive-text">完全在用户浏览器本地运行</strong>，无任何后台数据追踪，无任何第三方 API 调用，充分保障用户的访问隐私与确定性体验。
            </p>
          </div>
        </section>

        {/* Section 2: Criteria */}
        <section id="criteria" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-archive-accent font-bold">
              02 /
            </span>
            <h2 className="font-display text-lg text-archive-text font-semibold">
              收录原则 (Inclusion Criteria)
            </h2>
          </div>
          <div className="space-y-3 text-xs md:text-sm text-archive-subtle leading-relaxed">
            <ul className="space-y-3 list-none pl-0">
              <li className="p-3.5 border border-archive-border rounded-sm bg-archive-surface/30">
                <strong className="text-archive-text font-mono text-xs block mb-1">
                  [1] 100% 免费可直接访问
                </strong>
                <span>
                  所有收录资源必须可直接阅读或体验，严禁收费墙、付费订阅解锁或强制注册后方可阅读的商业导流内容。
                </span>
              </li>
              <li className="p-3.5 border border-archive-border rounded-sm bg-archive-surface/30">
                <strong className="text-archive-text font-mono text-xs block mb-1">
                  [2] 杜绝营销快餐与伪开源
                </strong>
                <span>
                  严禁标题党与质量低劣的推广仓库。优先收录经受广泛社区检验的官方标准文档、经典著作以及长期维护的精选开源项目。
                </span>
              </li>
              <li className="p-3.5 border border-archive-border rounded-sm bg-archive-surface/30">
                <strong className="text-archive-text font-mono text-xs block mb-1">
                  [3] 真实透明，零黑盒排序
                </strong>
                <span>
                  本站不存在任何商业付费推广或竞价排名。所有过滤规则公开透明，不进行隐式降权或黑盒推荐。
                </span>
              </li>
              <li className="p-3.5 border border-archive-border rounded-sm bg-archive-surface/30">
                <strong className="text-archive-text font-mono text-xs block mb-1">
                  [4] 真实意图场景分类
                </strong>
                <span>
                  按自学者真实场景划分为五大意图主轴：系统阅读（READ）、工程实战（BUILD）、快速练习（PRACTICE）、速查参考（REFERENCE）与策展灵感（SURPRISE）。
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3: Data Openness */}
        <section id="data" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-archive-accent font-bold">
              03 /
            </span>
            <h2 className="font-display text-lg text-archive-text font-semibold">
              数据开放说明 (Data Transparency)
            </h2>
          </div>
          <div className="space-y-3 text-xs md:text-sm text-archive-subtle leading-relaxed">
            <p>
              <strong>数据来源：</strong>基础数据源自开源社区维护的{" "}
              <a
                href="https://github.com/EbookFoundation/free-programming-books"
                target="_blank"
                rel="noopener noreferrer"
                className="text-archive-accent hover:underline font-mono text-xs"
              >
                free-programming-books
              </a>{" "}
              项目，并结合站长人工策展的精选开源项目集合。
            </p>
            <p>
              <strong>更新周期：</strong>数据通过自动化 Pipeline 批量清洗与断链校验，当前全量数据快照同步于{" "}
              <strong className="text-archive-text font-mono">Sep 11, 2026</strong>。本站不承诺每日自动同步，每次更新均经过完整断链校验与人工抽样。
            </p>
            <p>
              <strong>开放透明与 API 说明：</strong>本站为 Next.js 静态站点（SSG），不设私有后端数据库，亦不提供外部开放 API 服务。所有元数据直接内置于静态页面与前端数据包中，透明可查。
            </p>
            <p>
              <strong>AI 友好规范：</strong>本站根目录提供{" "}
              <Link
                href="/llms.txt"
                className="text-archive-accent hover:underline font-mono text-xs"
              >
                /llms.txt
              </Link>
              ，方便外部大语言模型与智能 Agent 直接读取结构化上下文，生成更可靠的学习规划。
            </p>
          </div>
        </section>

        {/* Back Link */}
        <div className="pt-8 border-t border-archive-border/40 flex items-center justify-between font-mono text-xs">
          <Link
            href="/"
            className="text-archive-subtle hover:text-archive-accent transition-colors"
          >
            ← 返回首页
          </Link>
          <Link
            href="/resources"
            className="text-archive-accent hover:underline"
          >
            浏览全库资源 →
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
