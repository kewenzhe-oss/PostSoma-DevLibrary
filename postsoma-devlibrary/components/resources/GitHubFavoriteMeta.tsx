import type {
  GitHubFavorite,
  GitHubFavoriteHealth,
} from "@/lib/types/github-favorite";

const HEALTH_META: Record<
  GitHubFavoriteHealth,
  {
    label: string;
    description: string;
    dotClassName: string;
    textClassName: string;
  }
> = {
  active: {
    label: "活跃",
    description: "近期有更新",
    dotClassName: "bg-emerald-500/60",
    textClassName: "text-archive-subtle/70",
  },
  quiet: {
    label: "近期较少更新",
    description: "在设定的时间内没有推送",
    dotClassName: "bg-amber-500/50",
    textClassName: "text-archive-subtle/60",
  },
  archived: {
    label: "已归档",
    description: "项目已由所有者归档",
    dotClassName: "bg-archive-subtle/40",
    textClassName: "text-archive-subtle/50",
  },
  unavailable: {
    label: "不可访问",
    description: "项目已停用或无法访问",
    dotClassName: "bg-rose-500/40",
    textClassName: "text-archive-subtle/50",
  },
};

export function getCompactGitHubSummary(
  summary: string,
  maxCharacters = 140,
): string {
  const normalized = summary.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Summary pending — add a factual description when ready.";
  }
  const characters = Array.from(normalized);
  if (characters.length <= maxCharacters) return normalized;

  const candidate = characters.slice(0, maxCharacters).join("");
  const lastBreak = Math.max(
    candidate.lastIndexOf(" "),
    candidate.lastIndexOf("，"),
    candidate.lastIndexOf("。"),
    candidate.lastIndexOf(","),
    candidate.lastIndexOf("."),
  );
  const safeCutoff = Math.floor(maxCharacters * 0.8);
  const compact =
    lastBreak >= safeCutoff ? candidate.slice(0, lastBreak) : candidate;
  return `${compact.replace(/[\s,，.。]+$/, "")}…`;
}

export function GitHubHealthBadge({
  favorite,
  showLabel = true,
}: {
  favorite: GitHubFavorite;
  showLabel?: boolean;
}) {
  if (!favorite.lastCheckedAt) {
    const accessibleLabel =
      "尚未检查：暂无经过核实的更新状态。";
    return (
      <span
        className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide text-archive-subtle/70"
        title={accessibleLabel}
        aria-label={`项目状态：${accessibleLabel}`}
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full border border-current bg-transparent"
          aria-hidden="true"
        />
        {showLabel && <span>未检查</span>}
      </span>
    );
  }

  const meta = HEALTH_META[favorite.health];
  const checkState = `上次检查：${favorite.lastCheckedAt}`;
  const accessibleLabel = `${meta.label}: ${meta.description}. ${checkState}`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide ${meta.textClassName}`}
      title={accessibleLabel}
      aria-label={`项目状态：${accessibleLabel}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${meta.dotClassName}`}
        aria-hidden="true"
      />
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}

export function GitHubCapabilityTags({
  capabilities,
  maxVisible = 4,
}: {
  capabilities: string[];
  maxVisible?: number;
}) {
  const visible = capabilities.slice(0, maxVisible);
  const remaining = capabilities.length - visible.length;

  if (capabilities.length === 0) {
    return (
      <span className="font-mono text-[9px] text-archive-subtle/45">
        暂无能力标签
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {visible.map((capability) => (
        <span
          key={capability}
          className="font-mono text-[9px] leading-none px-2 py-1 rounded-full border border-archive-border/80 bg-archive-bg/50 text-archive-subtle"
        >
          {capability}
        </span>
      ))}
      {remaining > 0 && (
        <span className="font-mono text-[9px] text-archive-subtle/55">
          +{remaining}
        </span>
      )}
    </div>
  );
}

export function GitHubResearchDetails({
  favorite,
}: {
  favorite: GitHubFavorite;
}) {
  return (
    <div className="space-y-4">
      <section className="bg-archive-bg/40 p-4 border border-archive-border rounded-sm relative overflow-hidden">
        <h3 className="font-mono text-[9px] uppercase tracking-widest text-archive-subtle mb-2">
          项目简介
        </h3>
        <p className="font-sans text-xs sm:text-sm text-archive-subtle leading-relaxed">
          {favorite.editorial.fullSummary ||
            favorite.shortSummary ||
            "暂无简介。"}
        </p>
      </section>

      {favorite.whySaved && (
        <section className="border-t border-archive-border/50 pt-3">
          <h3 className="font-mono text-[9px] uppercase tracking-widest text-archive-subtle mb-1.5">
            收藏理由
          </h3>
          <p className="font-sans text-xs text-archive-text/85 leading-relaxed">
            {favorite.whySaved}
          </p>
        </section>
      )}

      <section className="border-t border-archive-border/50 pt-3">
        <h3 className="font-mono text-[9px] uppercase tracking-widest text-archive-subtle mb-1.5">
          个人笔记
        </h3>
        <p
          className={`font-sans text-xs leading-relaxed ${
            favorite.personalNote
              ? "text-archive-text/85"
              : "text-archive-subtle/50 italic"
          }`}
        >
          {favorite.personalNote || "暂无个人笔记。"}
        </p>
      </section>
    </div>
  );
}
