"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { matchAndRecommend } from "@/lib/data/recommend";
import type { RecommendationResult } from "@/lib/data/recommend";
import type { Resource, Difficulty } from "@/lib/types/resource";
import Icon from "@/components/ui/Icon";
import { buildRecommendationPrompt } from "@/lib/data/recommend-prompt";
import { TYPE_LABELS } from "@/lib/utils/resource";
import { getResourceDomain } from "@/lib/utils/resource";

interface PresetItem {
  id: string;
  name: string;
  nameEn: string;
  inputs: {
    goal: string;
    difficulty: "all" | Difficulty;
    language: "all" | "zh" | "en";
    format: string;
  };
  result: RecommendationResult;
}

interface RecommendClientProps {
  resources: Resource[];
  presets: PresetItem[];
}

export default function RecommendClient({ resources, presets }: RecommendClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryGoal = (searchParams.get("goal") || "").trim();
  const langParam = searchParams.get("lang");
  const queryLang: "all" | "zh" | "en" = langParam === "zh" || langParam === "en" ? langParam : "all";
  const levelParam = searchParams.get("level");
  const queryLevel: "all" | Difficulty = levelParam === "beginner" || levelParam === "intermediate" || levelParam === "advanced" ? levelParam : "all";
  const formatParam = searchParams.get("format");
  type Format = "all" | "book" | "course" | "tutorial" | "documentation" | "interactive";
  const queryFormat: Format = formatParam === "book" || formatParam === "course" || formatParam === "tutorial" || formatParam === "documentation" || formatParam === "interactive" ? formatParam : "all";

  const [goal, setGoal] = useState(queryGoal);
  const [difficulty, setDifficulty] = useState<"all" | Difficulty>(queryLevel);
  const [language, setLanguage] = useState<"all" | "zh" | "en">(queryLang);
  const [format, setFormat] = useState<Format>(queryFormat);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [retry, setRetry] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const scrollToResults = useRef(false);
  const hasUnsavedChanges = Boolean(result) && (
    goal.trim() !== queryGoal || language !== queryLang || difficulty !== queryLevel || format !== queryFormat
  );

  useEffect(() => {
    let active = true;
    setGoal(queryGoal);
    setDifficulty(queryLevel);
    setLanguage(queryLang);
    setFormat(queryFormat);
    setResult(null);
    setErrorMsg("");
    setCopyStatus("idle");
    if (!queryGoal) {
      setIsPending(false);
      return () => { active = false; };
    }

    setIsPending(true);
    matchAndRecommend(resources, {
      goal: queryGoal, difficulty: queryLevel, language: queryLang, format: queryFormat,
    }).then((nextResult) => {
      if (active) setResult(nextResult);
    }).catch(() => {
      if (active) setErrorMsg("推荐生成失败，请重试。");
    }).finally(() => {
      if (active) setIsPending(false);
    });
    return () => { active = false; };
  }, [queryGoal, queryLang, queryLevel, queryFormat, resources, retry]);

  useEffect(() => {
    if (!result || !scrollToResults.current) return;
    scrollToResults.current = false;
    if (window.matchMedia("(max-width: 767px)").matches && resultsRef.current) {
      resultsRef.current.scrollIntoView({ block: "start", behavior: "auto" });
      resultsHeadingRef.current?.focus({ preventScroll: true });
    }
  }, [result]);

  const handleCopyLink = async () => {
    if (!result) return;
    const prompt = buildRecommendationPrompt({
      goal: queryGoal, difficulty: queryLevel, language: queryLang, format: queryFormat,
    }, result);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
    }
  };

  // Submit a stable, shareable set of criteria.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) {
      setErrorMsg("请输入你想学习的内容。");
      return;
    }
    setErrorMsg("");

    const params = new URLSearchParams();
    params.set("goal", goal.trim());
    params.set("lang", language);
    params.set("level", difficulty);
    params.set("format", format);

    scrollToResults.current = true;
    const target = `/recommend?${params.toString()}`;
    if (target === `/recommend?${searchParams.toString()}`) {
      setRetry((value) => value + 1);
    } else {
      router.push(target);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-2 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl text-archive-text mb-2 font-bold">
          找到适合你的学习资源
        </h1>
        <p className="font-sans text-xs md:text-sm text-archive-subtle leading-relaxed">
          告诉我们你想学什么，我们会从资源库中挑选最多 3 项供你参考。
        </p>
      </div>

      {/* Preset Scenarios Section */}
      <details className="mb-8 border-y border-archive-border py-4">
        <summary className="cursor-pointer text-sm font-semibold text-archive-text">试试这些学习目标</summary>
        <div className="pt-4">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {presets.map((preset) => {
            const params = new URLSearchParams();
            params.set("goal", preset.inputs.goal);
            params.set("lang", preset.inputs.language);
            params.set("level", preset.inputs.difficulty);
            params.set("format", preset.inputs.format);

            const presetLink = `/recommend?${params.toString()}`;
            const isPresetActive =
              goal === preset.inputs.goal &&
              language === preset.inputs.language &&
              difficulty === preset.inputs.difficulty &&
              format === preset.inputs.format;

            return (
              <Link
                key={preset.id}
                href={presetLink}
                onClick={(event) => {
                  scrollToResults.current = true;
                  if (queryGoal === preset.inputs.goal && queryLang === preset.inputs.language && queryLevel === preset.inputs.difficulty && queryFormat === preset.inputs.format) {
                    event.preventDefault();
                    setRetry((value) => value + 1);
                  }
                }}
                className={`text-left p-3.5 border rounded-sm transition-all text-xs font-sans flex flex-col justify-between hover:border-archive-accent/60 hover:bg-white/[0.01] cursor-pointer ${
                  isPresetActive
                    ? "border-archive-accent bg-archive-accent/5"
                    : "border-archive-border bg-archive-surface"
                }`}
              >
                <div>
                  <span className="font-semibold text-archive-text mb-1 leading-tight block">
                    {preset.name}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-archive-accent">
                  <span>使用这个目标 →</span>
                </div>
              </Link>
            );
          })}
        </div>
        </div>
      </details>

      {/* Main Container */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Form panel */}
        <div className="md:col-span-1 bg-archive-surface border border-archive-border p-5 rounded-sm h-fit space-y-5">
          <h2 className="text-base font-semibold text-archive-text border-b border-archive-border/40 pb-3">学习条件</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="recommend-goal" className="text-sm text-archive-text block">
                你想学什么？
              </label>
              <textarea
                id="recommend-goal"
                aria-invalid={errorMsg === "请输入你想学习的内容。" || undefined}
                aria-describedby={errorMsg === "请输入你想学习的内容。" ? "recommend-error" : undefined}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="例如：Python 爬虫、SQL 语法、Git 工作流"
                rows={2}
                className="archive-input resize-y py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="recommend-language" className="text-sm text-archive-text block">
                语言偏好
              </label>
              <select
                id="recommend-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "all" | "zh" | "en")}
                className="archive-input py-2 text-sm h-11 cursor-pointer"
              >
                <option value="all">全部语言</option>
                <option value="en">英文 (EN)</option>
                <option value="zh">中文 (ZH)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="recommend-difficulty" className="text-sm text-archive-text block">
                难度阶段
              </label>
              <select
                id="recommend-difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as "all" | Difficulty)}
                className="archive-input py-2 text-sm h-11 cursor-pointer"
              >
                <option value="all">不限难度</option>
                <option value="beginner">入门基础</option>
                <option value="intermediate">进阶提升</option>
                <option value="advanced">高级</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="recommend-format" className="text-sm text-archive-text block">
                资源类型
              </label>
              <select
                id="recommend-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as Format)}
                className="archive-input py-2 text-sm h-11 cursor-pointer"
              >
                <option value="all">不限类型</option>
                <option value="book">书籍</option>
                <option value="course">课程</option>
                <option value="tutorial">在线教程</option>
                <option value="documentation">文档 / 速查手册</option>
                <option value="interactive">交互编程 / 沙箱</option>
              </select>
            </div>

            {errorMsg && (
              <div id="recommend-error" role="alert" className="flex items-center gap-1.5 text-sm text-rose-300 leading-tight">
                <Icon name="info" size={12} className="text-archive-zh shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="btn-accent w-full text-sm py-2.5 min-h-11 flex items-center justify-center disabled:opacity-50"
            >
              {isPending ? "正在查找…" : "生成推荐"}
            </button>
            <p className="text-xs text-archive-subtle">推荐计算在浏览器本地运行</p>
          </form>
        </div>

        {/* Results output panel */}
        <div ref={resultsRef} className="md:col-span-2 space-y-6 scroll-mt-20">
          {isPending ? (
            <div className="border border-archive-border p-12 text-center text-xs text-archive-subtle animate-pulse">
              正在从归档目录匹配推荐项...
            </div>
          ) : errorMsg === "推荐生成失败，请重试。" && !result ? (
            <div className="border border-archive-border p-6 text-sm text-archive-subtle">
              <p>暂时无法生成推荐，请重试。</p>
              <button type="button" onClick={() => setRetry((value) => value + 1)} className="btn-outline mt-4 min-h-10">重试</button>
            </div>
          ) : !result ? (
            <div className="border border-dashed border-archive-border/60 rounded-sm p-12 text-center h-full flex flex-col items-center justify-center bg-archive-surface/10 min-h-[300px]">
              <h2 className="font-display text-base text-archive-text mb-1 font-medium">
                从一个学习目标开始
              </h2>
              <p className="font-sans text-xs text-archive-subtle max-w-sm leading-relaxed">
                输入主题，或选择上方的示例，我们会从资源库中寻找匹配项。
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 ref={resultsHeadingRef} tabIndex={-1} className="text-lg font-semibold text-archive-text">“{queryGoal}”的推荐结果</h2>
                <p className="mt-1 text-sm text-archive-subtle">根据目录信息匹配，访问原站前请自行确认内容与更新状态。</p>
                {hasUnsavedChanges && <p className="mt-2 text-sm text-archive-accent" role="status">条件已更改，点击“生成推荐”后更新结果。</p>}
              </div>
              {result.relaxedReason && (
                <p role="status" className="text-sm text-archive-subtle leading-relaxed">{result.relaxedReason}</p>
              )}
              {/* Comparison Cards list */}
              {result.picks.length === 0 ? (
                <div className="p-8 border border-archive-border text-center text-xs text-archive-subtle rounded-sm bg-archive-surface/20">
                  <p className="mb-2 font-mono text-archive-text">未找到完全符合条件的资源</p>
                  <p className="text-xs text-archive-subtle leading-relaxed">
                    当前限定条件未在数据库中找到对应项，建议调整关键词或放宽载体与难度限制。
                  </p>
                  <Link href="/resources" className="text-archive-accent underline hover:text-archive-text text-xs mt-4 inline-block font-mono">
                    浏览全量归档目录 →
                  </Link>
                </div>
              ) : (
                <div className="space-y-5">
                  {result.picks.map((pick) => (
                    <div key={pick.resourceId} className="archive-card p-5 space-y-4 relative overflow-hidden">

                      {/* Header line: Title Dictator */}
                      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                        <div className="space-y-1">
                          <h3 className="font-display text-base md:text-lg text-archive-text font-medium leading-snug">
                            {pick.title}
                          </h3>
                          <p className="text-xs text-archive-subtle">
                            {TYPE_LABELS[pick.type as Resource["type"]] || pick.type} · {pick.language === "zh" ? "中文" : "英文"}
                            {pick.url && <span> · {getResourceDomain(pick.url)}</span>}
                          </p>
                        </div>


                      </div>

                      {/* Footer actions: Single primary CTA + quiet secondary link */}
                      <div className="flex items-center gap-3 justify-end pt-2 border-t border-archive-border/40 flex-wrap">
                        <Link
                          href={`/resource/${pick.resourceId}`}
                          className="text-sm text-archive-subtle hover:text-archive-text transition-colors"
                        >
                          查看详情 →
                        </Link>
                        <a
                          href={pick.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline text-sm px-4 min-h-10 flex items-center justify-center"
                        >
                          访问原站 ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Share & AI instructions box */}
              {result.picks.length > 0 && <div className="bg-archive-bg border border-teal-500/25 p-4 rounded-sm space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 text-teal-300">
                      <Icon name="ai" size={14} />
                      <h4 className="text-xs font-semibold font-mono uppercase tracking-wider">
                        用 AI 继续规划
                      </h4>
                    </div>
                    <p className="text-xs text-archive-subtle leading-relaxed font-sans">
                      复制当前结果对应的学习目标和资源，可用于向 AI 助手询问学习计划。
                    </p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="btn-outline text-sm px-3.5 min-h-10 flex items-center justify-center shrink-0"
                  >
                    {copyStatus === "copied" ? "已复制" : "复制学习上下文"}
                  </button>
                </div>
                <p role="status" className="text-xs text-archive-subtle">{copyStatus === "error" ? "复制失败，请检查浏览器的剪贴板权限后重试。" : copyStatus === "copied" ? "已复制到剪贴板。" : ""}</p>
              </div>

              }
              {/* Funnel chart */}
              <details className="border border-archive-border p-4 rounded-sm">
                <summary className="cursor-pointer text-sm text-archive-text">这些推荐是怎么选出来的？</summary>
                <p className="mt-4 text-sm text-archive-subtle leading-relaxed">
                  系统先按语言、难度和类型筛选，再根据标题、分类、标签和简介中的关键词查找资源，最多展示 3 项。
                </p>
                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                  <div><dt className="text-archive-subtle">筛选范围</dt><dd className="text-archive-text tabular-nums">{result.funnel.totalRelated.toLocaleString()} 项</dd></div>
                  <div><dt className="text-archive-subtle">关键词匹配</dt><dd className="text-archive-text tabular-nums">{result.funnel.matched.toLocaleString()} 项</dd></div>
                  <div><dt className="text-archive-subtle">展示结果</dt><dd className="text-archive-text tabular-nums">{result.picks.length} 项</dd></div>
                </dl>
              </details>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
