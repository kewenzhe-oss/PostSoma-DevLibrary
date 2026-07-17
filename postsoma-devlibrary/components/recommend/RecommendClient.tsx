"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { matchAndRecommend } from "@/lib/data/recommend";
import type { RecommendationResult, RecommendationPick } from "@/lib/data/recommend";
import type { Resource, Difficulty } from "@/lib/types/resource";
import Icon from "@/components/ui/Icon";

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
  const queryApiKey = searchParams.get("apiKey") || "";

  // State sync'd with URL parameters
  const [goal, setGoal] = useState(queryGoal);
  const [difficulty, setDifficulty] = useState<"all" | Difficulty>(
    (queryLevel === "any" ? "all" : queryLevel) as any
  );
  const [language, setLanguage] = useState<"all" | "zh" | "en">(
    (queryLang === "any" ? "all" : queryLang) as any
  );
  const [format, setFormat] = useState<any>(
    queryFormat === "any" ? "all" : queryFormat
  );
  const [apiKey, setApiKey] = useState(queryApiKey);
  const [showApiKey, setShowApiKey] = useState(!!queryApiKey);

  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  // Sync internal state inputs when URL params change
  useEffect(() => {
    setGoal(queryGoal);
    setDifficulty((queryLevel === "any" ? "all" : queryLevel) as any);
    setLanguage((queryLang === "any" ? "all" : queryLang) as any);
    setFormat(queryFormat === "any" ? "all" : queryFormat);
  }, [queryGoal, queryLang, queryLevel, queryFormat]);

  // Synchronously compute recommendation shortlist on mount or URL changes
  useEffect(() => {
    if (!queryGoal && queryLang === "all" && queryLevel === "all" && queryFormat === "all") {
      // If no query parameters are set, display no results (empty state)
      setResult(null);
      return;
    }

    startTransition(async () => {
      try {
        setErrorMsg("");
        const res = await matchAndRecommend(resources, {
          goal: queryGoal,
          difficulty: (queryLevel === "any" ? "all" : queryLevel) as any,
          language: (queryLang === "any" ? "all" : queryLang) as any,
          format: (queryFormat === "any" ? "all" : queryFormat) as any,
          apiKey: queryApiKey.trim() || undefined,
        });
        setResult(res);
      } catch (err: any) {
        console.error("Compute error:", err);
        setErrorMsg("Failed to compute recommendations: " + err.message);
      }
    });
  }, [queryGoal, queryLang, queryLevel, queryFormat, queryApiKey, resources]);

  // Copy AI Prompt
  const handleCopyLink = () => {
    if (typeof window !== "undefined" && result) {
      const siteUrl = window.location.href;

      const picksText = result.picks.map((pick, index) => {
        return `${index + 1}. **${pick.title}**
   - URL: ${pick.url}
   - Format: ${pick.type}
   - Take: ${pick.take}
   - Why it matches: ${pick.explanation.whyMatch}
   - Advantage: ${pick.explanation.relativeAdvantage}
   - Limitations: ${pick.explanation.knownLimitations}
   - Review Status: ${pick.explanation.evidenceStatus}`;
      }).join("\n\n");

      const promptPayload = `You are a professional tutor assisting me in selecting developer learning resources from the PostSoma DevLibrary (https://205022.xyz).

I need resources matching these criteria:
- **Learning Goal**: ${goal || "Any"}
- **Language**: ${language}
- **Difficulty Level**: ${difficulty}
- **Material Format**: ${format}

---
## 1. Full Database Context
PostSoma DevLibrary indexes 5,000+ vetted, free programming resources. The complete structured list of all resources is located at this JSON endpoint:
https://205022.xyz/data/resources.json
And the schema/rules context is documented here:
https://205022.xyz/llms.txt

---
## 2. Rule Engine Heuristic Reference
Our local client-side rule engine filtered the database and compared candidates, returning the following shortlist picks:
- **Total Related Catalog Items**: ${result.funnel.totalRelated}
- **Matched Candidates**: ${result.funnel.matched}
- **Candidates Compared**: ${result.funnel.compared}
- **Shortlist Picks Count**: ${result.picks.length}

Here are the picks returned by the rule engine (use them as reference candidates):
${picksText}

---
## 3. Your Task (AI Assistant Instructions)
If you have web-browsing capabilities, please:
1. **Fetch and read the full database** from the JSON endpoint: https://205022.xyz/data/resources.json
2. **Re-evaluate and search** within the full database for better items matching my learning goal "${goal || "General Programming"}" with language "${language}", difficulty "${difficulty}", and format "${format}".
3. **Compare** the rule-filtered picks (listed in Section 2) against any better resources you discover in the full database. Identify if the rule engine missed higher-quality items or got biased by keyword matches.
4. **Formulate a structured First-Week Study Plan** using ONLY the most suitable resources you select from the database.
5. **Strict Constraint**: Do not suggest or link to any external learning resources or courses that do not exist inside the 205022.xyz JSON database. All links you recommend must match exact titles and URLs defined in https://205022.xyz/data/resources.json.`;

      navigator.clipboard.writeText(promptPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Trigger recommendation navigation on form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) {
      setErrorMsg("Please enter what you want to learn.");
      return;
    }
    setErrorMsg("");

    const params = new URLSearchParams();
    params.set("goal", goal.trim());
    params.set("lang", language);
    params.set("level", difficulty);
    params.set("format", format);
    if (apiKey.trim()) {
      params.set("apiKey", apiKey.trim());
    }

    router.push(`/recommend?${params.toString()}`);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl text-archive-text mb-2">
          Explainable Shortlist Generator
        </h1>
        <p className="font-sans text-sm text-archive-subtle">
          Input your constraints or explore preset query links to generate a transparent 3-pick shortlist.
        </p>
      </div>

      {/* Preset Scenarios Section */}
      <div className="mb-8 bg-archive-surface/40 border border-archive-border/60 p-5 rounded-sm">
        <h3 className="font-mono text-xs text-archive-accent uppercase tracking-wider mb-3">
          Preset Curation Scenarios / 典型场景示例
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
              queryGoal === preset.inputs.goal &&
              queryLang === preset.inputs.language &&
              queryLevel === preset.inputs.difficulty &&
              queryFormat === preset.inputs.format;

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
                  <span>Select Preset →</span>
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
            Goal Constraints
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase text-archive-subtle block">
                1. What do you want to learn?
              </label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Python scraper, SQL syntax, Git workflow"
                rows={3}
                className="archive-input resize-none py-2 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase text-archive-subtle block">
                2. Language Preference
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="archive-input py-2 text-xs h-9 cursor-pointer"
              >
                <option value="all">All Languages</option>
                <option value="en">English (EN)</option>
                <option value="zh">Chinese (ZH)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase text-archive-subtle block">
                3. Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="archive-input py-2 text-xs h-9 cursor-pointer"
              >
                <option value="all">Any Level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase text-archive-subtle block">
                4. Material Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="archive-input py-2 text-xs h-9 cursor-pointer"
              >
                <option value="all">Any Format</option>
                <option value="book">Books</option>
                <option value="course">Courses</option>
                <option value="tutorial">Tutorials</option>
                <option value="documentation">Documentation Reference</option>
                <option value="interactive">Interactive / Sandbox</option>
              </select>
            </div>

            {/* Collapsed LLM Key Option */}
            <div className="space-y-1 border-t border-archive-border/30 pt-3">
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="font-mono text-[9px] uppercase text-archive-accent hover:underline flex items-center gap-1"
              >
                {showApiKey ? "▼ Hide LLM Settings" : "▶ Enable LLM Enhancement"}
              </button>
              {showApiKey && (
                <div className="space-y-1 pt-2 animate-fade-in">
                  <label className="font-mono text-[8px] uppercase text-archive-subtle block">
                    Gemini API Key (optional)
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AI key runs entirely client-side"
                    className="archive-input py-1.5 text-[10px] h-8"
                  />
                </div>
              )}
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
              {isPending ? "Evaluating..." : "Update Shortlist URL"}
            </button>
          </form>
        </div>

        {/* Results output panel */}
        <div className="md:col-span-2 space-y-6">
          {isPending ? (
            <div className="border border-archive-border p-12 text-center text-xs text-archive-subtle animate-pulse">
              Computing matches from catalog space...
            </div>
          ) : !result ? (
            <div className="border border-dashed border-archive-border/60 rounded-sm p-12 text-center h-full flex flex-col items-center justify-center bg-archive-surface/10 min-h-[300px]">
              <h4 className="font-display text-base text-archive-text mb-1">
                No Query Parameters Loaded
              </h4>
              <p className="font-sans text-xs text-archive-subtle max-w-sm">
                Fill the constraint form or select one of the Preset Curation Scenarios above to generate a dynamic comparison shortlist.
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
                        {"// COPY.AI.PROMPT / 复制 AI 指令"}
                      </h4>
                    </div>
                    <p className="text-[10px] text-archive-subtle leading-relaxed font-sans">
                      粘贴到任何支持联网的 AI，它将基于已缩小的候选集给建议，而非凭空推荐。
                    </p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="btn-accent text-[9px] font-mono px-3 py-1 flex items-center justify-center shrink-0"
                  >
                    {copied ? "已复制 ✓" : "Copy AI Prompt / 复制 AI 指令"}
                  </button>
                </div>
              </div>

              {/* Funnel chart */}
              <div className="bg-archive-surface border border-archive-border p-4 rounded-sm">
                <span className="font-mono text-[9px] uppercase text-archive-subtle tracking-widest block mb-2.5">
                  Recommendation Funnel (Generator: {result.generator})
                </span>
                <div className="grid grid-cols-4 gap-2 text-center font-mono text-[10px]">
                  <div className="p-2 bg-archive-bg rounded border border-archive-border">
                    <div className="text-archive-subtle text-[8px] uppercase">1. Space</div>
                    <div className="text-xs font-semibold text-archive-text mt-0.5">
                      {result.funnel.totalRelated}
                    </div>
                  </div>
                  <div className="p-2 bg-archive-bg rounded border border-archive-border">
                    <div className="text-archive-subtle text-[8px] uppercase">2. Matched</div>
                    <div className="text-xs font-semibold text-archive-text mt-0.5">
                      {result.funnel.matched}
                    </div>
                  </div>
                  <div className="p-2 bg-archive-bg rounded border border-archive-border">
                    <div className="text-archive-subtle text-[8px] uppercase">3. Compared</div>
                    <div className="text-xs font-semibold text-archive-text mt-0.5">
                      {result.funnel.compared}
                    </div>
                  </div>
                  <div className="p-2 bg-archive-bg rounded border border-archive-border/40 border-archive-accent-dim bg-archive-accent/5">
                    <div className="text-archive-accent text-[8px] uppercase font-bold">4. Picks</div>
                    <div className="text-xs font-semibold text-archive-accent mt-0.5">
                      {result.picks.length}
                    </div>
                  </div>
                </div>
                {result.relaxedReason && (
                  <div className="text-[9px] text-archive-subtle mt-2 font-mono border-t border-archive-border/30 pt-2.5 flex items-center gap-1.5">
                    <Icon name="info" size={12} className="text-archive-accent shrink-0" />
                    <span>{result.relaxedReason}</span>
                  </div>
                )}
              </div>

              {/* Comparison Cards list */}
              {result.picks.length === 0 ? (
                <div className="p-8 border border-archive-border text-center text-xs text-archive-subtle rounded-sm bg-archive-surface/20">
                  <p className="mb-2 font-mono">No matching resources found.</p>
                  <p className="text-[10px] text-archive-muted leading-relaxed">
                    No resources matched your constraints inside the database. Try adjusting your goal keywords or relaxing the formatting and difficulty settings.
                  </p>
                  <Link href="/resources" className="text-archive-accent underline hover:text-archive-text text-[10px] mt-4 block">
                    Browse the full Archive instead →
                  </Link>
                </div>
              ) : (
                <div className="space-y-5">
                  {result.picks.map((pick) => (
                    <div key={pick.resourceId} className="archive-card p-5 space-y-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-archive-accent/30" />

                      {/* Header line */}
                      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row border-b border-archive-border/40 pb-3">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                            <span className="text-[9px] font-mono uppercase bg-archive-accent/15 text-archive-accent px-1.5 py-0.5 rounded-sm border border-archive-accent/20">
                              {pick.take}
                            </span>
                            <span className="lang-badge-en">{pick.language.toUpperCase()}</span>
                            <span className="type-badge text-[9px] capitalize">{pick.type}</span>
                          </div>
                          <h3 className="font-display text-base text-archive-text">
                            {pick.title}
                          </h3>
                        </div>

                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-sm shrink-0 ${
                          pick.explanation.evidenceStatus === "high"
                            ? "bg-teal-500/10 text-teal-300 border border-teal-500/25"
                            : pick.explanation.evidenceStatus === "medium"
                            ? "bg-orange-500/10 text-orange-300 border border-orange-500/25"
                            : "bg-archive-muted text-archive-subtle border border-archive-border"
                        }`}>
                          Review: {pick.explanation.evidenceStatus}
                        </span>
                      </div>

                      {/* Descriptive blocks */}
                      <div className="grid md:grid-cols-2 gap-4 text-xs font-sans text-archive-subtle">
                        <div className="space-y-1">
                          <span className="font-mono text-[9px] uppercase text-archive-accent/80 block">
                            Why it matches / 匹配理由:
                          </span>
                          <p className="leading-relaxed">{pick.explanation.whyMatch}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="font-mono text-[9px] uppercase text-archive-accent/80 block">
                            Relative Advantage / 优势:
                          </span>
                          <p className="leading-relaxed">{pick.explanation.relativeAdvantage}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="font-mono text-[9px] uppercase text-archive-accent/80 block">
                            Known Limitations / 局限:
                          </span>
                          <p className="leading-relaxed">{pick.explanation.knownLimitations}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="font-mono text-[9px] uppercase text-archive-accent/80 block">
                            Target Audience / 适合谁:
                          </span>
                          <p className="leading-relaxed">
                            **Ideal:** {pick.explanation.suitableFor}
                            <br />
                            **Avoid:** {pick.explanation.notSuitableFor}
                          </p>
                        </div>
                      </div>

                      {/* Alternative */}
                      <div className="p-3 bg-archive-bg/40 border border-archive-border rounded-sm text-xs font-sans text-archive-subtle flex items-center gap-1.5">
                        <Icon name="arrowUpRight" size={14} className="text-archive-accent shrink-0" />
                        <span>
                          <strong className="text-archive-text font-mono text-[10px] uppercase tracking-wider mr-1">Alternative:</strong>
                          {pick.explanation.alternative}
                        </span>
                      </div>

                      {/* Footer actions */}
                      <div className="flex items-center gap-2 justify-end pt-2 border-t border-archive-border/40 flex-wrap">
                        <Link
                          href={`/resource/${pick.resourceId}`}
                          className="btn-outline text-xs px-3 py-1 flex items-center justify-center h-8"
                        >
                          Inspect Details
                        </Link>
                        <a
                          href={pick.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-accent text-xs px-4 py-1 flex items-center justify-center h-8"
                        >
                          Open Resource ↗
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
