"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { matchAndRecommend } from "@/lib/data/recommend";
import type { RecommendationResult } from "@/lib/data/recommend";
import type { Resource, Difficulty } from "@/lib/types/resource";
import Icon from "@/components/ui/Icon";
import { SITE_URL } from "@/lib/config/site";
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

  // Read search parameters from URL
  const queryGoal = searchParams.get("goal") || "";
  const queryLang = searchParams.get("lang") || "all";
  const queryLevel = searchParams.get("level") || "all";
  const queryFormat = searchParams.get("format") || "all";

  // Check if URL has any custom parameters
  const hasQueryParams = Boolean(
    queryGoal ||
    (queryLang !== "all" && queryLang !== "") ||
    (queryLevel !== "all" && queryLevel !== "") ||
    (queryFormat !== "all" && queryFormat !== "")
  );

  const defaultPreset = presets[0] || null;

  // State sync'd with URL parameters, fallback to default preset on first load to eliminate empty state
  const [goal, setGoal] = useState(() =>
    hasQueryParams ? queryGoal : (defaultPreset?.inputs.goal || "")
  );
  const [difficulty, setDifficulty] = useState<"all" | Difficulty>(() =>
    hasQueryParams
      ? ((queryLevel === "any" ? "all" : queryLevel) as any)
      : (defaultPreset?.inputs.difficulty || "beginner")
  );
  const [language, setLanguage] = useState<"all" | "zh" | "en">(() =>
    hasQueryParams
      ? ((queryLang === "any" ? "all" : queryLang) as any)
      : (defaultPreset?.inputs.language || "zh")
  );
  const [format, setFormat] = useState<any>(() =>
    hasQueryParams
      ? (queryFormat === "any" ? "all" : queryFormat)
      : (defaultPreset?.inputs.format || "all")
  );

  const [result, setResult] = useState<RecommendationResult | null>(() =>
    hasQueryParams ? null : (defaultPreset?.result || null)
  );
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  // Sync internal state inputs when URL params change
  useEffect(() => {
    if (!hasQueryParams) {
      return;
    }

    setGoal(queryGoal);
    setDifficulty((queryLevel === "any" ? "all" : queryLevel) as any);
    setLanguage((queryLang === "any" ? "all" : queryLang) as any);
    setFormat(queryFormat === "any" ? "all" : queryFormat);

    startTransition(async () => {
      try {
        setErrorMsg("");
        const res = await matchAndRecommend(resources, {
          goal: queryGoal,
          difficulty: (queryLevel === "any" ? "all" : queryLevel) as any,
          language: (queryLang === "any" ? "all" : queryLang) as any,
          format: (queryFormat === "any" ? "all" : queryFormat) as any,
        });
        setResult(res);
      } catch (err: any) {
        console.error("Compute error:", err);
        setErrorMsg("Failed to compute recommendations: " + err.message);
      }
    });
  }, [queryGoal, queryLang, queryLevel, queryFormat, hasQueryParams, resources]);

  // Copy AI Prompt
  const handleCopyLink = () => {
    if (typeof window !== "undefined" && result) {
      const picksText = result.picks.map((pick, index) => {
        const metaStatus =
          pick.explanation.evidenceStatus === "high"
            ? "Meta: Complete"
            : pick.explanation.evidenceStatus === "medium"
            ? "Meta: Indexed"
            : "Basic";
        return `${index + 1}. **${pick.title}**
   - URL: ${pick.url}
   - Format: ${pick.type}
   - Take: ${pick.take}
   - Why it matches: ${pick.explanation.whyMatch}
   - Advantage: ${pick.explanation.relativeAdvantage}
   - Limitations: ${pick.explanation.knownLimitations}
   - Meta Status: ${metaStatus}`;
      }).join("\n\n");

      const promptPayload = `You are a professional tutor assisting me in selecting developer learning resources from the PostSoma DevLibrary (${SITE_URL}).

I need resources matching these criteria:
- **Learning Goal**: ${goal || "Any"}
- **Language**: ${language}
- **Difficulty Level**: ${difficulty}
- **Material Format**: ${format}

---
## 1. Full Database Context
PostSoma DevLibrary indexes 5,000+ vetted, free programming resources. The complete structured list of all resources is located at this JSON endpoint:
${SITE_URL}/data/resources.json
And the schema/rules context is documented here:
${SITE_URL}/llms.txt

---
## 2. Local Rule Engine Reference
Our local client-side rule engine filtered the database and compared candidates, returning the following shortlist picks:
- **Filtered Catalog Pool**: ${result.funnel.totalRelated} (Language: ${language}, Full Catalog: 5,184)
- **Matched Candidates**: ${result.funnel.matched}
- **Candidates Compared**: ${result.funnel.compared}
- **Shortlist Picks Count**: ${result.picks.length}

Here are the picks returned by the rule engine (use them as reference candidates):
${picksText}

---
## 3. Your Task (AI Assistant Instructions)
If you have web-browsing capabilities (or can parse the JSON endpoint):
1. **Fetch and read the full database** from the JSON endpoint: ${SITE_URL}/data/resources.json
2. **Re-evaluate and search** within the full database for better items matching my learning goal "${goal || "General Programming"}" with language "${language}", difficulty "${difficulty}", and format "${format}".
3. **Compare** the rule-filtered picks (listed in Section 2) against any better resources you discover in the full database. Identify if the rule engine missed higher-quality items or got biased by keyword matches.
4. **Formulate a structured First-Week Study Plan** using ONLY the most suitable resources you select from the database.

If you DO NOT have web-browsing capabilities (or fail to fetch the URL):
1. **Use the Section 2 shortlist picks** as the absolute ground truth recommendations. They are already vetted and matched by the client-side rule engine.
2. **Formulate a structured First-Week Study Plan** based solely on the picks detailed in Section 2.
3. **Strict Constraint**: Do not suggest or link to any external learning resources or courses that do not exist inside the ${SITE_URL} JSON database. All links you recommend must match exact titles and URLs defined in ${SITE_URL}/data/resources.json.`;

      navigator.clipboard.writeText(promptPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Trigger recommendation navigation on form submit
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

    router.push(`/recommend?${params.toString()}`);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl text-archive-text mb-2 font-bold">
          可解释的学习起点生成器
        </h1>
        <p className="font-sans text-xs md:text-sm text-archive-subtle leading-relaxed">
          基于本地规则引擎离线计算，输入目标或选择预设，生成透明、可验证的 3 项互补方案。
        </p>
      </div>

      {/* Preset Scenarios Section */}
      <div className="mb-8 bg-archive-surface/40 border border-archive-border/60 p-5 rounded-sm">
        <h3 className="font-mono text-xs text-archive-accent uppercase tracking-wider mb-3">
          {"// 典型场景预设"}
        </h3>
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
                className={`text-left p-3.5 border rounded-sm transition-all text-xs font-sans flex flex-col justify-between hover:border-archive-accent/60 hover:bg-white/[0.01] cursor-pointer ${
                  isPresetActive
                    ? "border-archive-accent bg-archive-accent/5"
                    : "border-archive-border bg-archive-surface"
                }`}
              >
                <div>
                  <h4 className="font-semibold text-archive-text mb-1 leading-tight">
                    {preset.name}
                  </h4>
                  <p className="text-[10px] text-archive-subtle/80 leading-relaxed font-mono">
                    {preset.nameEn}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-archive-accent">
                  <span>Picks: {preset.result.picks.length}</span>
                  <span>选择预设 →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Container */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Form panel */}
        <div className="md:col-span-1 bg-archive-surface border border-archive-border p-5 rounded-sm h-fit space-y-5">
          <h3 className="font-mono text-xs text-archive-accent uppercase tracking-wider border-b border-archive-border/40 pb-2">
            检索条件设置
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase text-archive-subtle block">
                1. 你想学什么？
              </label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="例如：Python 爬虫、SQL 语法、Git 工作流"
                rows={3}
                className="archive-input resize-none py-2 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase text-archive-subtle block">
                2. 语言偏好
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="archive-input py-2 text-xs h-9 cursor-pointer"
              >
                <option value="all">全部语言</option>
                <option value="en">英文 (EN)</option>
                <option value="zh">中文 (ZH)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase text-archive-subtle block">
                3. 难度阶段
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="archive-input py-2 text-xs h-9 cursor-pointer"
              >
                <option value="all">不限难度</option>
                <option value="beginner">入门基础</option>
                <option value="intermediate">进阶提升</option>
                <option value="advanced">高级架构</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase text-archive-subtle block">
                4. 载体类型
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="archive-input py-2 text-xs h-9 cursor-pointer"
              >
                <option value="all">不限载体</option>
                <option value="book">书籍</option>
                <option value="course">课程</option>
                <option value="tutorial">在线教程</option>
                <option value="documentation">官方文档 / 速查手册</option>
                <option value="interactive">交互编程 / 沙箱</option>
              </select>
            </div>

            {/* Local execution notice */}
            <div className="pt-3 border-t border-archive-border/30 flex items-center gap-2 font-mono text-[10px] text-archive-subtle">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
              <span>算法完全在浏览器本地运行，无追踪、无 API 调用</span>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-archive-zh font-mono leading-tight">
                <Icon name="info" size={12} className="text-archive-zh shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="btn-accent w-full text-xs font-mono py-2.5 h-10 flex items-center justify-center disabled:opacity-50"
            >
              {isPending ? "正在评估..." : "生成推荐短清单"}
            </button>
          </form>
        </div>

        {/* Results output panel */}
        <div className="md:col-span-2 space-y-6">
          {isPending ? (
            <div className="border border-archive-border p-12 text-center text-xs text-archive-subtle animate-pulse">
              正在从归档目录匹配推荐项...
            </div>
          ) : !result ? (
            <div className="border border-dashed border-archive-border/60 rounded-sm p-12 text-center h-full flex flex-col items-center justify-center bg-archive-surface/10 min-h-[300px]">
              <h4 className="font-display text-base text-archive-text mb-1 font-medium">
                等待输入检索条件
              </h4>
              <p className="font-sans text-xs text-archive-subtle max-w-sm leading-relaxed">
                请在左侧表单输入想学的内容，或选择上方的典型场景预设生成对比推荐清单。
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Share & AI instructions box */}
              <div className="bg-archive-bg border border-teal-500/25 p-4 rounded-sm space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 text-teal-300">
                      <Icon name="ai" size={14} />
                      <h4 className="text-xs font-semibold font-mono uppercase tracking-wider">
                        {"// 复制结构化提示词（用于外部大模型）"}
                      </h4>
                    </div>
                    <p className="text-xs text-archive-subtle leading-relaxed font-sans">
                      已将当前候选集打包为防幻觉上下文。一键复制后粘贴到 ChatGPT、Claude 或 Gemini 等模型，即可基于真实收录生成结构化学习路线。
                    </p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="btn-accent text-xs font-mono px-3.5 py-1.5 flex items-center justify-center shrink-0"
                  >
                    {copied ? "已复制 ✓" : "复制 AI 提示词"}
                  </button>
                </div>
              </div>

              {/* Funnel chart */}
              <div className="bg-archive-surface border border-archive-border p-4 rounded-sm">
                <div className="flex items-center justify-between mb-3 border-b border-archive-border/40 pb-2">
                  <span className="font-mono text-[10px] uppercase text-archive-accent tracking-wider font-semibold">
                    {"// 推荐漏斗：本地规则匹配过程"}
                  </span>
                  <span className="font-mono text-[9px] text-archive-subtle">
                    离线计算 · 逻辑透明
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono">
                  <div className="p-3 bg-archive-bg rounded border border-archive-border flex flex-col justify-between">
                    <div className="text-archive-subtle text-[10px]">
                      {language === "en" ? "01. 英文库资源" : language === "zh" ? "01. 中文库资源" : "01. 全库资源"}
                    </div>
                    <div className="text-base font-bold text-archive-text my-1">
                      {result.funnel.totalRelated.toLocaleString()}
                    </div>
                    <div className="text-[9px] text-archive-subtle/80 font-sans leading-tight">
                      {language === "en"
                        ? "英文检索池（全库 5,184 项）"
                        : language === "zh"
                        ? "中文检索池（全库 5,184 项）"
                        : "全库总收录（5,184 项）"}
                    </div>
                  </div>
                  <div className="p-3 bg-archive-bg rounded border border-archive-border flex flex-col justify-between">
                    <div className="text-archive-subtle text-[10px]">02. 关键词命中</div>
                    <div className="text-base font-bold text-archive-text my-1">
                      {result.funnel.matched.toLocaleString()}
                    </div>
                    <div className="text-[9px] text-archive-subtle/80 font-sans leading-tight">
                      标题/标签覆盖目标概念
                    </div>
                  </div>
                  <div className="p-3 bg-archive-bg rounded border border-archive-border flex flex-col justify-between">
                    <div className="text-archive-subtle text-[10px]">03. 精选候选</div>
                    <div className="text-base font-bold text-archive-text my-1">
                      {result.funnel.compared.toLocaleString()}
                    </div>
                    <div className="text-[9px] text-archive-subtle/80 font-sans leading-tight">
                      跨类型加权后的前序候选
                    </div>
                  </div>
                  <div className="p-3 bg-archive-bg rounded border border-archive-accent/40 bg-archive-accent/5 flex flex-col justify-between">
                    <div className="text-archive-accent text-[10px] font-bold">04. 3 项方案</div>
                    <div className="text-base font-bold text-archive-accent my-1">
                      {result.picks.length}
                    </div>
                    <div className="text-[9px] text-archive-accent/90 font-sans leading-tight">
                      兼顾速查、系统、实战的互补组合
                    </div>
                  </div>
                </div>
                {result.relaxedReason && (
                  <div className="text-xs text-archive-subtle mt-3 font-sans border-t border-archive-border/40 pt-2.5 flex items-center gap-1.5">
                    <Icon name="info" size={13} className="text-archive-accent shrink-0" />
                    <span>{result.relaxedReason}</span>
                  </div>
                )}
              </div>

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
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-archive-accent/30" />

                      {/* Header line: Title Dictator */}
                      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row border-b border-archive-border/40 pb-3">
                        <div className="space-y-1">
                          <h3 className="font-display text-base md:text-lg text-archive-text font-medium leading-snug">
                            {pick.title}
                          </h3>
                          <p className="font-mono text-[10px] text-archive-subtle/70">
                            {pick.take.toUpperCase()} · {pick.type} · {pick.language.toUpperCase()}
                            {pick.url && <span> · {getResourceDomain(pick.url)}</span>}
                          </p>
                        </div>

                        {pick.explanation.evidenceStatus === "high" ? (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-sm shrink-0 bg-archive-surface text-archive-subtle border border-archive-border/60">
                            Meta: Complete
                          </span>
                        ) : pick.explanation.evidenceStatus === "medium" ? (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-sm shrink-0 bg-archive-surface text-archive-subtle/70 border border-archive-border/40">
                            Meta: Indexed
                          </span>
                        ) : null}
                      </div>

                      {/* Descriptive blocks */}
                      <div className="grid md:grid-cols-2 gap-4 text-xs font-sans text-archive-subtle">
                        <div className="space-y-1">
                          <span className="font-mono text-[9px] uppercase text-archive-accent/80 block">
                            匹配理由:
                          </span>
                          <p className="leading-relaxed">{pick.explanation.whyMatch}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="font-mono text-[9px] uppercase text-archive-accent/80 block">
                            相对优势:
                          </span>
                          <p className="leading-relaxed">{pick.explanation.relativeAdvantage}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="font-mono text-[9px] uppercase text-archive-accent/80 block">
                            局限说明:
                          </span>
                          <p className="leading-relaxed">{pick.explanation.knownLimitations}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="font-mono text-[9px] uppercase text-archive-accent/80 block">
                            适合人群:
                          </span>
                          <p className="leading-relaxed">
                            <span className="text-archive-text font-medium">适合：</span>{pick.explanation.suitableFor}
                            <br />
                            <span className="text-archive-subtle font-medium">避免：</span>{pick.explanation.notSuitableFor}
                          </p>
                        </div>
                      </div>

                      {/* Alternative */}
                      <div className="p-3 bg-archive-bg/40 border border-archive-border rounded-sm text-xs font-sans text-archive-subtle flex items-center gap-1.5">
                        <Icon name="arrowUpRight" size={14} className="text-archive-accent shrink-0" />
                        <span>
                          <strong className="text-archive-text font-mono text-[10px] uppercase tracking-wider mr-1">替代参考:</strong>
                          {pick.explanation.alternative}
                        </span>
                      </div>

                      {/* Footer actions: Single primary CTA + quiet secondary link */}
                      <div className="flex items-center gap-3 justify-end pt-2 border-t border-archive-border/40 flex-wrap">
                        <Link
                          href={`/resource/${pick.resourceId}`}
                          className="font-mono text-xs text-archive-subtle/60 hover:text-archive-text transition-colors"
                        >
                          查看详情 →
                        </Link>
                        <a
                          href={pick.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-accent text-xs px-4 py-1.5 flex items-center justify-center h-8"
                        >
                          访问资源 ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
