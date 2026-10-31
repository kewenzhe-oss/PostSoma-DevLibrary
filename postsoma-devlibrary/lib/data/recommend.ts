import type { Resource, Difficulty } from "../types/resource";

export interface RecommendOptions {
  goal: string;
  difficulty: "all" | Difficulty;
  language: "all" | "zh" | "en";
  format: "all" | "book" | "course" | "tutorial" | "documentation" | "interactive";
  apiKey?: string;
}

interface PickExplanation {
  whyMatch: string;
  relativeAdvantage: string;
  knownLimitations: string;
  suitableFor: string;
  notSuitableFor: string;
  alternative: string;
  evidenceStatus: "high" | "medium" | "low";
}

export interface RecommendationPick {
  resourceId: string;
  title: string;
  url: string;
  type: string;
  language: string;
  category: string;
  take: "Quick Start" | "Comprehensive" | "Project-oriented" | "Featured Match";
  explanation: PickExplanation;
}

export interface RecommendationResult {
  generator: "local-rules";
  funnel: {
    totalRelated: number;
    matched: number;
    compared: number;
    returned: number;
  };
  picks: RecommendationPick[];
  relaxedReason?: string;
}

// Calculate evidence status based on Catalog Contract rules
function getEvidenceStatus(res: Resource): "high" | "medium" | "low" {
  const hasDesc = !!(res.summary || res.cardSummary || res.detailSummary);
  const hasDiff = !!res.difficulty;
  const hasNote = !!res.editorNote;
  const isFeatured = res.quality === "featured";
  const isGithub = res.source === "GitHub";

  if (hasDesc && (hasDiff || hasNote) && (isFeatured || isGithub)) {
    return "high";
  }
  if (hasDesc || hasDiff || hasNote) {
    return "medium";
  }
  return "low";
}

// Heuristic rule generator for pick explanation text
function generateHeuristicExplanation(
  res: Resource,
  alternativeRes: Resource | null,
  langPref: "zh" | "en" | "all"
): PickExplanation {
  const isZh = langPref === "zh" || res.language === "zh";
  const altTitle = alternativeRes ? alternativeRes.title : (isZh ? "浏览分类下的其他项目" : "Browse other catalog items");
  const evStatus = getEvidenceStatus(res);

  const typeNames: Record<string, string> = {
    book: "书籍", course: "课程", tutorial: "教程", article: "文章",
    interactive: "交互式资源", documentation: "文档",
  };
  const typeName = typeNames[res.type] || "资源";
  if (isZh) {
    return {
      whyMatch: "根据目录中的标题、分类和标签等信息匹配。",
      relativeAdvantage: `目录将此项归为${typeName}。`,
      knownLimitations: "推荐基于目录信息，内容质量和更新状态请到原站核实。",
      suitableFor: res.difficulty ? `目录标注难度：${res.difficulty}。` : "目录未标注难度。",
      notSuitableFor: "目录信息不足以判断是否适合每位学习者。",
      alternative: `其他候选：${altTitle}`,
      evidenceStatus: evStatus,
    };
  }
  return {
    whyMatch: "Matched using catalog information such as title, category, and tags.",
    relativeAdvantage: `Catalog format: ${res.type}.`,
    knownLimitations: "Recommendations use catalog data; check the source for quality and currency.",
    suitableFor: res.difficulty ? `Catalog difficulty: ${res.difficulty}.` : "Difficulty is not specified in the catalog.",
    notSuitableFor: "The catalog does not contain enough information to assess every learner's needs.",
    alternative: `Another candidate: ${altTitle}`,
    evidenceStatus: evStatus,
  };
}

/** Avoid treating words such as "algorithm" or "google" as the Go language. */
function matchesToken(text: string, token: string): boolean {
  if (token === "go") {
    return /(?:^|[^a-z0-9])(?:go|golang)(?=$|[^a-z0-9])/i.test(text);
  }
  return text.includes(token);
}

// Client/Server shared matching engine
export async function matchAndRecommend(all: Resource[], options: RecommendOptions): Promise<RecommendationResult> {

  // 1. Language filter (Strict)
  let filtered = all;
  if (options.language !== "all") {
    filtered = filtered.filter((r) => r.language === options.language);
  }

  // 2. Format filter (Prefiltered)
  let formatFiltered = filtered;
  if (options.format !== "all") {
    formatFiltered = filtered.filter((r) => {
      if (options.format === "interactive") {
        return r.type === "interactive" || r.collection === "interactive";
      }
      return r.type === options.format;
    });
  }

  // 3. Difficulty filter (Prefiltered)
  let diffFiltered = formatFiltered;
  if (options.difficulty !== "all") {
    diffFiltered = formatFiltered.filter((r) => r.difficulty === options.difficulty);
  }

  const queryTokens = options.goal
    .toLowerCase()
    .split(/[\s,，.。\/、]+/)
    .filter(Boolean);

  const countScoredMatches = (list: Resource[]) => {
    let cnt = 0;
    for (const res of list) {
      const title = res.title.toLowerCase();
      const cat = res.category.toLowerCase();
      const subcat = (res.subcategory || "").toLowerCase();
      const tags = res.tags.map((t) => t.toLowerCase());
      const summary = (res.summary || res.cardSummary || "").toLowerCase();
      let hasToken = false;
      for (const token of queryTokens) {
        if (
          matchesToken(cat, token) ||
          matchesToken(subcat, token) ||
          matchesToken(title, token) ||
          tags.some((t) => matchesToken(t, token)) ||
          matchesToken(summary, token)
        ) {
          hasToken = true;
          break;
        }
      }
      if (hasToken) cnt++;
    }
    return cnt;
  };

  let finalFiltered = diffFiltered;
  let relaxedReason = "";

  if (options.difficulty !== "all" && countScoredMatches(finalFiltered) < 3) {
    finalFiltered = formatFiltered.filter((r) => r.difficulty === options.difficulty || r.difficulty === undefined);
    relaxedReason = "符合指定难度的匹配项不足 3 项，已放宽条件，允许未标记难度的资源参与。";
  }

  if (options.format !== "all" && countScoredMatches(finalFiltered) < 3) {
    let relaxedFormatFiltered = filtered;
    if (options.difficulty !== "all") {
      relaxedFormatFiltered = filtered.filter((r) => r.difficulty === options.difficulty || r.difficulty === undefined);
    }
    finalFiltered = relaxedFormatFiltered;
    relaxedReason = (relaxedReason ? relaxedReason + " " : "") + "符合指定类型的匹配项不足 3 项，已放宽类型条件。";
  }

  const totalRelated = finalFiltered.length;

  interface ScoredResource {
    resource: Resource;
    score: number;
  }

  const scoredList: ScoredResource[] = [];

  for (const res of finalFiltered) {
    let score = 0;
    const title = res.title.toLowerCase();
    const cat = res.category.toLowerCase();
    const subcat = (res.subcategory || "").toLowerCase();
    const tags = res.tags.map((t) => t.toLowerCase());
    const summary = (res.summary || res.cardSummary || "").toLowerCase();

    for (const token of queryTokens) {
      if (matchesToken(cat, token)) score += 15;
      if (matchesToken(subcat, token)) score += 10;
      if (matchesToken(title, token)) score += 10;
      if (tags.some((t) => matchesToken(t, token))) score += 5;
      if (matchesToken(summary, token)) score += 2;
    }

    if (score > 0) {
      // Small curate boosts
      if (res.quality === "featured") score += 5;
      if (res.difficulty) score += 2;
      scoredList.push({ resource: res, score });
    }
  }

  // Sort descending by score
  scoredList.sort((a, b) => b.score - a.score);

  const matched = scoredList.map((x) => x.resource);
  const comparedList = matched.slice(0, 8);

  const picks: RecommendationPick[] = [];

  if (comparedList.length > 0) {
    // We want to pick 3 distinct takes
    // Take A: Quick Start (Tutorial / Interactive / Articles)
    // Take B: Comprehensive (Book / Course)
    // Take C: Project-oriented / Action-oriented (GitHub / Apps / Tools)

    const usedIds = new Set<string>();

    const getAlternative = (excludeId: string, category: string): Resource | null => {
      return (
        all.find((r) => r.id !== excludeId && r.category === category && r.language === options.language) ||
        null
      );
    };

    // Take A
    const pickA = comparedList.find(
      (r) => r.type === "tutorial" || r.type === "interactive" || r.type === "article"
    );
    if (pickA) {
      usedIds.add(pickA.id);
      picks.push({
        resourceId: pickA.id,
        title: pickA.title,
        url: pickA.url,
        type: pickA.type,
        language: pickA.language,
        category: pickA.category,
        take: "Quick Start",
        explanation: generateHeuristicExplanation(pickA, getAlternative(pickA.id, pickA.category), options.language),
      });
    }

    // Take B
    const pickB = comparedList.find(
      (r) => !usedIds.has(r.id) && (r.type === "book" || r.type === "course" || r.type === "documentation")
    );
    if (pickB) {
      usedIds.add(pickB.id);
      picks.push({
        resourceId: pickB.id,
        title: pickB.title,
        url: pickB.url,
        type: pickB.type,
        language: pickB.language,
        category: pickB.category,
        take: "Comprehensive",
        explanation: generateHeuristicExplanation(pickB, getAlternative(pickB.id, pickB.category), options.language),
      });
    }

    // Take C
    const pickC = comparedList.find(
      (r) => !usedIds.has(r.id) && (r.collection === "github" || r.type === "app" || r.type === "library" || r.type === "cli")
    );
    if (pickC) {
      usedIds.add(pickC.id);
      picks.push({
        resourceId: pickC.id,
        title: pickC.title,
        url: pickC.url,
        type: pickC.type,
        language: pickC.language,
        category: pickC.category,
        take: "Project-oriented",
        explanation: generateHeuristicExplanation(pickC, getAlternative(pickC.id, pickC.category), options.language),
      });
    }

    // Fill remaining picks to make exactly 3 if available and matched has more
    for (const res of comparedList) {
      if (picks.length >= 3) break;
      if (!usedIds.has(res.id)) {
        usedIds.add(res.id);
        picks.push({
          resourceId: res.id,
          title: res.title,
          url: res.url,
          type: res.type,
          language: res.language,
          category: res.category,
          take: "Featured Match",
          explanation: generateHeuristicExplanation(res, getAlternative(res.id, res.category), options.language),
        });
      }
    }
  }

  // Recommendation logic runs purely on client-side heuristic rules (100% offline, 0 tracking, 0 external APIs)
  const generator: "local-rules" = "local-rules";

  return {
    generator,
    funnel: {
      totalRelated,
      matched: matched.length,
      compared: comparedList.length,
      returned: picks.length,
    },
    picks,
    relaxedReason: relaxedReason || undefined,
  };
}
