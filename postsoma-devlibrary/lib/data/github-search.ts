import type {
  GitHubFavorite,
  GitHubFavoriteHealth,
} from "@/lib/types/github-favorite";
import type { Resource } from "@/lib/types/resource";

export type GitHubBrowseMode = "topic" | "recall";
export type GitHubFacetField = "capabilities" | "techStack";
export type GitHubMatchKind =
  | "capability"
  | "techStack"
  | "health"
  | "text";

export interface GitHubFacetOption {
  value: string;
  label: string;
  count: number;
}

export interface GitHubMatchReason {
  kind: GitHubMatchKind;
  label: string;
  value: string;
}

export interface SearchGitHubFavoritesInput {
  query: string;
  capability?: string;
  techStack?: string;
  health?: GitHubFavoriteHealth | "";
  mode: GitHubBrowseMode;
  limit?: number;
}

export interface SearchGitHubFavoritesResult {
  resources: Resource[];
  matchReasonsById: Map<string, GitHubMatchReason[]>;
}

const ACRONYMS: Record<string, string> = {
  ai: "AI",
  api: "API",
  cli: "CLI",
  javascript: "JavaScript",
  llm: "LLM",
  mcp: "MCP",
  ocr: "OCR",
  pdf: "PDF",
  postgresql: "PostgreSQL",
  rag: "RAG",
  sdk: "SDK",
  sql: "SQL",
  sqlite: "SQLite",
  stt: "STT",
  tts: "TTS",
  typescript: "TypeScript",
  ui: "UI",
};

function normalize(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

export function formatGitHubFacetLabel(value: string): string {
  return value
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(
      (part) =>
        ACRONYMS[normalize(part)] ??
        `${part.charAt(0).toUpperCase()}${part.slice(1)}`,
    )
    .join(" ");
}

export function buildGitHubFacetOptions(
  favorites: GitHubFavorite[],
  field: GitHubFacetField,
): GitHubFacetOption[] {
  const counts = new Map<string, number>();

  for (const favorite of favorites) {
    const valuesForRecord = new Set(
      favorite[field].map(normalize).filter(Boolean),
    );
    for (const value of valuesForRecord) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return Array.from(counts, ([value, count]) => ({
    value,
    label: formatGitHubFacetLabel(value),
    count,
  })).sort(
    (left, right) =>
      right.count - left.count || left.label.localeCompare(right.label),
  );
}

function includesNormalized(value: string, needle: string): boolean {
  return normalize(value).includes(needle);
}

function matchesExactFacet(
  values: string[],
  selected: string | undefined,
): boolean {
  if (!selected) return true;
  return values.some((value) => normalize(value) === normalize(selected));
}

function addReason(
  reasons: GitHubMatchReason[],
  reason: GitHubMatchReason,
): void {
  const key = `${reason.kind}:${normalize(reason.label)}:${normalize(reason.value)}`;
  const exists = reasons.some(
    (candidate) =>
      `${candidate.kind}:${normalize(candidate.label)}:${normalize(candidate.value)}` ===
      key,
  );
  if (!exists) reasons.push(reason);
}

function collectQueryReasons(
  resource: Resource,
  favorite: GitHubFavorite,
  terms: string[],
): GitHubMatchReason[] | null {
  if (terms.length === 0) return [];

  const reasons: GitHubMatchReason[] = [];
  const textFields = [
    { label: "Title", value: `${resource.title} ${favorite.title}` },
    {
      label: "Summary",
      value: `${favorite.shortSummary} ${favorite.editorial.fullSummary} ${favorite.editorial.detailSummary ?? ""}`,
    },
    { label: "Why saved", value: favorite.whySaved },
    { label: "Personal note", value: favorite.personalNote },
    { label: "Topic", value: favorite.editorial.topic },
  ];

  for (const term of terms) {
    let termMatched = false;

    for (const capability of favorite.capabilities) {
      if (includesNormalized(capability, term)) {
        termMatched = true;
        addReason(reasons, {
          kind: "capability",
          label: "Capability",
          value: formatGitHubFacetLabel(capability),
        });
      }
    }

    for (const stack of favorite.techStack) {
      if (includesNormalized(stack, term)) {
        termMatched = true;
        addReason(reasons, {
          kind: "techStack",
          label: "Stack",
          value: formatGitHubFacetLabel(stack),
        });
      }
    }

    if (
      favorite.lastCheckedAt &&
      includesNormalized(favorite.health, term)
    ) {
      termMatched = true;
      addReason(reasons, {
        kind: "health",
        label: "Health",
        value: formatGitHubFacetLabel(favorite.health),
      });
    }

    for (const field of textFields) {
      if (field.value && includesNormalized(field.value, term)) {
        termMatched = true;
        addReason(reasons, {
          kind: "text",
          label: field.label,
          value: "text match",
        });
      }
    }

    // Every word must be explained by at least one searchable field.
    if (!termMatched) return null;
  }

  return reasons;
}

function addStructuredFilterReasons(
  reasons: GitHubMatchReason[],
  favorite: GitHubFavorite,
  input: SearchGitHubFavoritesInput,
): void {
  if (input.capability) {
    const matched = favorite.capabilities.find(
      (value) => normalize(value) === normalize(input.capability!),
    );
    if (matched) {
      addReason(reasons, {
        kind: "capability",
        label: "Capability",
        value: formatGitHubFacetLabel(matched),
      });
    }
  }

  if (input.techStack) {
    const matched = favorite.techStack.find(
      (value) => normalize(value) === normalize(input.techStack!),
    );
    if (matched) {
      addReason(reasons, {
        kind: "techStack",
        label: "Stack",
        value: formatGitHubFacetLabel(matched),
      });
    }
  }

  if (input.health) {
    addReason(reasons, {
      kind: "health",
      label: "Health",
      value: formatGitHubFacetLabel(input.health),
    });
  }
}

function getReasonScore(reasons: GitHubMatchReason[]): number {
  return reasons.reduce((score, reason) => {
    if (reason.kind === "capability" || reason.kind === "techStack") {
      return score + 4;
    }
    if (reason.kind === "health") return score + 3;
    if (reason.label === "Title") return score + 3;
    if (reason.label === "Personal note" || reason.label === "Why saved") {
      return score + 2;
    }
    return score + 1;
  }, 0);
}

/**
 * Dedicated client-side search for the GitHub research collection.
 *
 * Filters are ANDed across capability, stack and health. The free-text query
 * requires every term to match at least one GitHub-specific field, while the
 * returned reasons explain which fields produced the match.
 */
export function searchGitHubFavorites(
  resources: Resource[],
  favoritesById: ReadonlyMap<string, GitHubFavorite>,
  input: SearchGitHubFavoritesInput,
): SearchGitHubFavoritesResult {
  const terms = normalize(input.query).split(/\s+/).filter(Boolean);
  const originalOrder = new Map(
    resources.map((resource, index) => [resource.id, index] as const),
  );
  const matched: Array<{
    resource: Resource;
    favorite: GitHubFavorite;
    reasons: GitHubMatchReason[];
  }> = [];

  for (const resource of resources) {
    const favorite = favoritesById.get(resource.id);
    if (!favorite) continue;
    if (!matchesExactFacet(favorite.capabilities, input.capability)) continue;
    if (!matchesExactFacet(favorite.techStack, input.techStack)) continue;
    if (
      input.health &&
      (!favorite.lastCheckedAt || favorite.health !== input.health)
    ) {
      continue;
    }

    const reasons = collectQueryReasons(resource, favorite, terms);
    if (reasons === null) continue;
    addStructuredFilterReasons(reasons, favorite, input);
    matched.push({ resource, favorite, reasons });
  }

  if (input.mode !== "recall" && terms.length > 0) {
    matched.sort(
      (left, right) =>
        getReasonScore(right.reasons) - getReasonScore(left.reasons) ||
        (originalOrder.get(left.resource.id) ?? Number.MAX_SAFE_INTEGER) -
          (originalOrder.get(right.resource.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  // Recall mode deliberately preserves the canonical library order. The
  // historical timestamps came from one legacy AI-processing batch rather
  // than real discovery/review events, so sorting by them would imply a
  // personal timeline that the collection does not yet have.

  const limit = input.limit ?? 300;
  const visible = matched.slice(0, limit);
  return {
    resources: visible.map(({ resource }) => resource),
    matchReasonsById: new Map(
      visible.map(({ resource, reasons }) => [resource.id, reasons]),
    ),
  };
}
