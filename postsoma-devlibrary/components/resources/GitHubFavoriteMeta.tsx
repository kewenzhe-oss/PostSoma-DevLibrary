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
    label: "Active",
    description: "Recently maintained",
    dotClassName: "bg-teal-400",
    textClassName: "text-teal-300/80",
  },
  quiet: {
    label: "Quiet",
    description: "No push within the quiet threshold",
    dotClassName: "bg-amber-400",
    textClassName: "text-amber-300/80",
  },
  archived: {
    label: "Archived",
    description: "Archived by its GitHub owner",
    dotClassName: "bg-archive-subtle",
    textClassName: "text-archive-subtle",
  },
  unavailable: {
    label: "Unavailable",
    description: "Disabled or no longer reachable",
    dotClassName: "bg-rose-400",
    textClassName: "text-rose-300/80",
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
      "Unchecked: awaiting first GitHub API check. No verified maintenance status is available yet.";
    return (
      <span
        className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide text-archive-subtle/70"
        title={accessibleLabel}
        aria-label={`Repository health: ${accessibleLabel}`}
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full border border-current bg-transparent"
          aria-hidden="true"
        />
        {showLabel && <span>Unchecked</span>}
      </span>
    );
  }

  const meta = HEALTH_META[favorite.health];
  const checkState = `Last checked ${favorite.lastCheckedAt}`;
  const accessibleLabel = `${meta.label}: ${meta.description}. ${checkState}`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide ${meta.textClassName}`}
      title={accessibleLabel}
      aria-label={`Repository health: ${accessibleLabel}`}
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
        Capabilities pending
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
        <div className="absolute top-0 left-0 w-1 h-full bg-archive-accent/40" />
        <h3 className="font-mono text-[9px] uppercase tracking-widest text-archive-subtle mb-2">
          Full AI Description
        </h3>
        <p className="font-sans text-xs sm:text-sm text-archive-subtle leading-relaxed">
          {favorite.editorial.fullSummary ||
            favorite.shortSummary ||
            "Description not added yet."}
        </p>
      </section>

      {favorite.whySaved && (
        <section className="border-t border-archive-border/50 pt-3">
          <h3 className="font-mono text-[9px] uppercase tracking-widest text-archive-subtle mb-1.5">
            Why Saved
          </h3>
          <p className="font-sans text-xs text-archive-text/85 leading-relaxed">
            {favorite.whySaved}
          </p>
        </section>
      )}

      <section className="border-t border-archive-border/50 pt-3">
        <h3 className="font-mono text-[9px] uppercase tracking-widest text-archive-subtle mb-1.5">
          Personal Note
        </h3>
        <p
          className={`font-sans text-xs leading-relaxed ${
            favorite.personalNote
              ? "text-archive-text/85"
              : "text-archive-subtle/50 italic"
          }`}
        >
          {favorite.personalNote || "No personal note added yet."}
        </p>
      </section>
    </div>
  );
}
