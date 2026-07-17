import { Suspense } from "react";
import { getAllResources } from "@/lib/data/resources";
import { matchAndRecommend } from "@/lib/data/recommend";
import type { Resource } from "@/lib/types/resource";
import RecommendClient from "@/components/recommend/RecommendClient";
import AppShell from "@/components/layout/AppShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shortlist Recommendations — PostSoma DevLibrary",
  alternates: {
    canonical: "/recommend",
  },
};

const presets = [
  {
    id: "preset-python-zh",
    name: "零基础 Python，中文，教程/书籍优先",
    nameEn: "Zero-basis Python, Chinese, tutorials/books preferred",
    inputs: { goal: "Python", difficulty: "beginner" as const, language: "zh" as const, format: "all" as const }
  },
  {
    id: "preset-js-web-en",
    name: "有一点 JavaScript 基础，英文，想做网站",
    nameEn: "Some JS background, English, web design",
    inputs: { goal: "JavaScript website", difficulty: "intermediate" as const, language: "en" as const, format: "all" as const }
  },
  {
    id: "preset-git-docs",
    name: "只需要 Git 的 cheat sheet 或文档",
    nameEn: "Git cheatsheets or reference docs",
    inputs: { goal: "Git", difficulty: "all" as const, language: "all" as const, format: "documentation" as const }
  },
  {
    id: "preset-backend-course",
    name: "想转后端，任意语言，课程优先",
    nameEn: "Backend path, any language, courses preferred",
    inputs: { goal: "Backend", difficulty: "all" as const, language: "all" as const, format: "course" as const }
  },
  {
    id: "preset-algo-zh",
    name: "中文资源为主的算法入门",
    nameEn: "Chinese-focused Algorithms intro",
    inputs: { goal: "算法", difficulty: "beginner" as const, language: "zh" as const, format: "all" as const }
  },
  {
    id: "preset-sql-docs-en",
    name: "英文文档优先的 SQL 入门",
    nameEn: "SQL intro, English docs preferred",
    inputs: { goal: "SQL", difficulty: "beginner" as const, language: "en" as const, format: "documentation" as const }
  }
];

export default async function RecommendPage() {
  const all = await getAllResources();

  // Prune resources for props size optimization
  const prunedResources = all.map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    type: r.type,
    language: r.language,
    category: r.category,
    subcategory: r.subcategory || undefined,
    tags: r.tags,
    summary: r.summary || undefined,
    cardSummary: r.cardSummary || undefined,
    quality: r.quality,
    difficulty: r.difficulty || undefined,
    editorNote: r.editorNote || undefined,
    source: r.source,
  })) as Resource[];

  // Pre-calculate preset results at build time for ARO/SEO
  const preCalculatedPresets = [];
  for (const preset of presets) {
    const res = await matchAndRecommend(prunedResources, {
      goal: preset.inputs.goal,
      difficulty: preset.inputs.difficulty,
      language: preset.inputs.language,
      format: preset.inputs.format
    });
    preCalculatedPresets.push({
      id: preset.id,
      name: preset.name,
      nameEn: preset.nameEn,
      inputs: preset.inputs,
      result: res
    });
  }

  return (
    <AppShell>
      {/* 
        This hidden block guarantees search crawlers and AI bots can find and parse 
        all preset recommendation shortlists directly in the initial statically exported HTML, 
        even when client-side JavaScript is completely disabled.
      */}
      <div id="aro-presets-data" style={{ display: "none" }} aria-hidden="true">
        {preCalculatedPresets.map((preset) => (
          <article key={preset.id} className="preset-static-shortlist">
            <h2>{preset.name} ({preset.nameEn})</h2>
            <p>Query Goal: {preset.inputs.goal} | Language: {preset.inputs.language} | Level: {preset.inputs.difficulty} | Format: {preset.inputs.format}</p>
            <p>Funnel Stats: totalRelated={preset.result.funnel.totalRelated}, matched={preset.result.funnel.matched}, picks={preset.result.picks.length}</p>
            <div className="picks-list">
              {preset.result.picks.map((pick) => (
                <div key={pick.resourceId} className="pick-card">
                  <h3>{pick.title}</h3>
                  <p>Resource URL: {pick.url}</p>
                  <p>Medium Type: {pick.type} | Take: {pick.take} | Review Level: {pick.explanation.evidenceStatus}</p>
                  <p><strong>Why Match:</strong> {pick.explanation.whyMatch}</p>
                  <p><strong>Advantage:</strong> {pick.explanation.relativeAdvantage}</p>
                  <p><strong>Limitations:</strong> {pick.explanation.knownLimitations}</p>
                  <p><strong>Target:</strong> {pick.explanation.suitableFor} | Avoid: {pick.explanation.notSuitableFor}</p>
                  <p><strong>Alternative:</strong> {pick.explanation.alternative}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      {/* Render the interactive client page */}
      <Suspense fallback={<div className="font-mono text-sm text-archive-subtle animate-pulse py-8 text-center">Loading shortlist panel...</div>}>
        <RecommendClient 
          resources={prunedResources}
          presets={preCalculatedPresets}
        />
      </Suspense>
    </AppShell>
  );
}
