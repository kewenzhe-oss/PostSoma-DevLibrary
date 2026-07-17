"use client";

import Link from "next/link";
import { usePathProgress } from "@/lib/local/progress";
import type { LearningPath } from "@/lib/types/learning-path";
import type { Resource } from "@/lib/types/resource";

interface PathStepsClientProps {
  pathObj: LearningPath;
  resourcesMap: Record<string, Resource>;
}

export default function PathStepsClient({ pathObj, resourcesMap }: PathStepsClientProps) {
  const { isStepCompleted, toggleStep } = usePathProgress();

  // Calculate overall path progress percentage
  const completedCount = pathObj.steps.filter((s) => isStepCompleted(s.id)).length;
  const progressPercent = pathObj.steps.length > 0 
    ? Math.round((completedCount / pathObj.steps.length) * 100) 
    : 0;

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Local Storage Notice */}
      <div className="p-4 bg-archive-surface border border-archive-border rounded-sm flex items-center justify-between text-xs text-archive-subtle font-mono">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-archive-accent animate-pulse" />
          <span>Progress saved locally to your browser (localStorage). No login needed.</span>
        </div>
        <span className="text-[10px] uppercase text-archive-accent opacity-85 hidden sm:inline">
          Local Sandbox Mode
        </span>
      </div>

      {/* Progress Bar Header */}
      <div className="bg-archive-surface/60 p-5 border border-archive-border rounded-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs text-archive-subtle uppercase tracking-widest">
            Path Progress
          </span>
          <span className="font-mono text-sm text-archive-accent font-semibold">
            {completedCount} / {pathObj.steps.length} Steps Completed ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-archive-bg h-2 rounded-full overflow-hidden border border-archive-border">
          <div
            className="bg-archive-accent h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-6">
        {pathObj.steps.map((step, idx) => {
          const isDone = isStepCompleted(step.id);
          return (
            <div
              key={step.id}
              className={`archive-card p-6 relative overflow-hidden transition-all duration-300 ${
                isDone ? "border-archive-accent/20 bg-archive-surface/40" : ""
              }`}
            >
              {/* Completed glow indicator */}
              {isDone && (
                <div className="absolute top-0 left-0 w-1 h-full bg-archive-accent/70" />
              )}

              <div className="flex items-start gap-4 flex-col sm:flex-row justify-between">
                <div className="flex-1 space-y-3">
                  {/* Step Meta (Difficulty & Time) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase text-archive-accent bg-archive-accent/10 px-2 py-0.5 rounded-sm border border-archive-accent/20">
                      Step {idx + 1}
                    </span>
                    <span className="type-badge capitalize">{step.difficulty}</span>
                    <span className="text-xs font-mono text-archive-subtle">
                      ⏱ {step.estimatedTime}
                    </span>
                    {step.optional && (
                      <span className="text-[10px] font-mono uppercase bg-archive-muted text-archive-subtle px-1.5 py-0.5 rounded-sm">
                        Optional
                      </span>
                    )}
                  </div>

                  {/* Step Titles */}
                  <div>
                    <h3 className={`font-display text-lg text-archive-text ${isDone ? "line-through text-archive-subtle" : ""}`}>
                      {step.title}
                    </h3>
                    {step.titleZh && (
                      <p className={`font-sans text-sm text-archive-subtle/80 ${isDone ? "line-through" : ""}`}>
                        {step.titleZh}
                      </p>
                    )}
                  </div>

                  {/* Step Descriptions */}
                  <div className="space-y-1">
                    <p className="font-sans text-sm text-archive-subtle leading-relaxed">
                      {step.description}
                    </p>
                    {step.descriptionZh && (
                      <p className="font-sans text-xs text-archive-subtle/70 leading-relaxed">
                        {step.descriptionZh}
                      </p>
                    )}
                  </div>

                  {/* Resources Mapped in this Step */}
                  <div className="pt-3 border-t border-archive-border/40 space-y-2">
                    <span className="font-mono text-[10px] uppercase text-archive-subtle tracking-widest block">
                      Recommended Materials
                    </span>
                    <div className="space-y-3">
                      {step.resourceIds.map((rid) => {
                        const res = resourcesMap[rid];
                        if (!res) {
                          return (
                            <div key={rid} className="text-xs text-archive-subtle/60 italic">
                              Resource (ID: {rid}) not found in index.
                            </div>
                          );
                        }
                        return (
                          <div
                            key={rid}
                            className="bg-archive-bg/40 p-3 border border-archive-border rounded-sm flex items-center justify-between gap-4 flex-col sm:flex-row"
                          >
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={res.language === "zh" ? "lang-badge-zh" : "lang-badge-en"}>
                                  {res.language === "zh" ? "ZH" : "EN"}
                                </span>
                                <span className="type-badge text-[10px]">{res.type}</span>
                              </div>
                              <Link
                                href={`/resource/${res.id}`}
                                className="font-sans text-sm text-archive-text hover:text-archive-accent transition-colors font-medium hover:underline block"
                              >
                                {res.title}
                              </Link>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <a
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-outline text-xs px-3 py-1 flex items-center justify-center gap-1 w-full sm:w-auto"
                              >
                                Direct Link ↗
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Checklist Toggle Action */}
                <button
                  onClick={() => toggleStep(step.id)}
                  className={`filter-chip flex items-center gap-1.5 select-none w-full sm:w-auto justify-center h-10 sm:h-auto px-4 py-2 ${
                    isDone ? "active border-archive-accent text-archive-accent" : ""
                  }`}
                >
                  {isDone ? (
                    <>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                      Completed
                    </>
                  ) : (
                    "Mark Completed"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clearing warning bottom */}
      <div className="text-center text-[10px] text-archive-subtle/60 font-mono mt-8">
        ⚠️ Warning: Clearing browser cache, storage, or site data will delete your path progress markers.
      </div>
    </div>
  );
}
