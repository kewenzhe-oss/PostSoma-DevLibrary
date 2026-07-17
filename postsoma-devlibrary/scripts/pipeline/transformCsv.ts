import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { Resource, ResourceType, ResourceCollection, ResourceQuality } from "../../lib/types/resource";

// Robust character-by-character CSV state machine parser
export function parseCSV(content: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(cell);
        cell = "";
      } else if (char === "\r" || char === "\n") {
        row.push(cell);
        cell = "";
        if (row.length > 0 && row.some((c) => c !== "")) {
          result.push(row);
        }
        row = [];
        if (char === "\r" && nextChar === "\n") {
          i++;
        }
      } else {
        cell += char;
      }
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    if (row.some((c) => c !== "")) {
      result.push(row);
    }
  }

  return result;
}

function inferResourceType(repoType: string, type: string): ResourceType {
  const r = (repoType || "").toLowerCase().trim();
  const t = (type || "").toLowerCase().trim();

  const match = (str: string): ResourceType | null => {
    if (str.includes("app")) return "app";
    if (str.includes("library")) return "library";
    if (str.includes("framework")) return "framework";
    if (str.includes("cli") || str.includes("command-line") || str.includes("command line")) return "cli";
    if (str.includes("collection") || str.includes("awesome") || str.includes("list")) return "collection";
    if (str.includes("extension") || str.includes("plugin")) return "extension";
    return null;
  };

  return match(r) || match(t) || "unknown";
}

// Exemplary Editorial dictionary manually polished to avoid generic slogans
const EXEMPLARY_EDITORIALS: Record<string, {
  cardSummary: string;
  detailSummary: string;
  bestFor: string[];
  accessNote: string;
}> = {
  "deepwiki-open": {
    cardSummary: "基於本地或雲端 LLM 的開源代碼 Wiki 生成工具。適合開發者將凌亂的倉庫自動轉化為可視化、可檢索的交互式文檔。",
    detailSummary: "覆蓋代碼深度分析、架構圖（Mermaid）自動生成和 RAG 問答交互等核心主題。學習門檻適中，更適合在處理大型陌生代碼庫或進行項目交接時，作為提效的案頭參考工具查閱。本頁面指向官方 GitHub 開源庫。",
    bestFor: [
      "需要快速理清大型開源項目架構的軟體工程師",
      "對已有代碼倉庫進行規範文檔化輸出的架構師與團隊負責人"
    ],
    accessNote: "官方開源 GitHub 倉庫，包含完備的本地 LLM 部署文檔，建議直接打開原鏈接進行搭建。"
  },
  "wardrowbe": {
    cardSummary: "A personal digital wardrobe manager built for organizing clothing collections. Helps users log daily wears, plan outfits, and track lifecycle metrics.",
    detailSummary: "A digital closet app that moves beyond basic logging to track cost-per-wear and wardrobe lifecycle statistics. With minimal setup overhead, it serves as a systematic dashboard for optimizing personal styling and sustainable clothing consumption.",
    bestFor: [
      "Productivity enthusiasts seeking to digitize daily organization routines",
      "Individuals looking to build conscious, sustainable clothing consumption habits"
    ],
    accessNote: "Open-source GitHub application. Safe and fast loading. Recommended to view detail here first to check requirements before installing."
  },
  "awesome-design-md": {
    cardSummary: "Meticulously curated UI/UX and web design resource knowledge base. Suitable for creators and developers seeking layout assets and interactive specs.",
    detailSummary: "A vast collection of essential UI frameworks, typography assets, visual guides, and front-end development boilerplate. Features a low entry barrier, serving as a comprehensive directory for ongoing design inspiration and tool lookup.",
    bestFor: [
      "UI/UX designers looking for pre-vetted color guides and design tokens",
      "Frontend developers looking for quick visual inspiration and layout frameworks"
    ],
    accessNote: "Curated directory hosted on GitHub. Recommended to directly open the source link for rapid browsing."
  },
  "agent-skills": {
    cardSummary: "Apify's modular skill library for AI agents. Enables developers to quickly configure complex web automation, scraping, and LLM tool execution.",
    detailSummary: "A specialized library of reusable code blocks designed to bootstrap LLM-based autonomous agents. Lowers coding overhead for browser operations and structured scraping, serving as a functional toolbox for scalable AI agent architecture.",
    bestFor: [
      "AI developers building web-scraping or browser-automation agent systems",
      "Software engineers looking to integrate pre-built tools into Agentic workflows"
    ],
    accessNote: "Highly recommended for AI developers. Check details here first to inspect modular integrations, then open repository."
  },
  "what-to-eat": {
    cardSummary: "為解決日常選擇困難設計的極簡「今天吃什麼」App。適合個人提效與自動化生活瑣碎決策。",
    detailSummary: "採用極簡前端架構，旨在通過自動化菜單隨機篩選來消除日常決策疲勞。學習和部署難度極低，是一套開箱即用的生活實用小工具。本頁面為 VoltAgent 編輯團隊評估版。",
    bestFor: [
      "面臨日常選擇困難、抗拒複雜應用的普通大眾",
      "尋求極簡實用工具開發靈感的獨立開發者"
    ],
    accessNote: "開箱即用小工具，加載極快。可直接打開原鏈接進行體驗。"
  }
};

// Fallback rule generator for programmatic, non-robotic summaries
function generateEditorialFields(
  title: string,
  url: string,
  topic: string,
  subtopics: string[],
  summary: string,
  action: string,
  primaryAudience: string,
  repoType: string
) {
  const urlLower = url.toLowerCase();
  
  // 1. Check exemplary dictionary first
  for (const [key, value] of Object.entries(EXEMPLARY_EDITORIALS)) {
    if (urlLower.includes(key)) {
      return value;
    }
  }

  // 2. Fallback: Directly reuse the rich database content from the CSV
  const actionLower = action.toLowerCase();
  const audience = primaryAudience || "Developers";

  const cardSummary = summary;
  const detailSummary = summary;

  const bestFor = [
    `Target Audience: ${audience}`,
    `Topic focus: ${topic}${subtopics.length > 0 ? ` (specializing in ${subtopics.join(", ")})` : ""}`
  ];

  let accessNote = "";
  if (actionLower === "archive") {
    accessNote = "This project has been archived in our content workflow. You can directly open the repository link to view code assets.";
  } else {
    accessNote = `This project is currently flagged for "${action}" in our workflow. Check our AI review details below before opening the repository.`;
  }

  return { cardSummary, detailSummary, bestFor, accessNote };
}

export async function loadAndTransformGitHubCsv(csvFilePath: string): Promise<Resource[]> {
  try {
    const rawContent = await fs.readFile(csvFilePath, "utf8");
    const parsed = parseCSV(rawContent);
    if (parsed.length <= 1) {
      console.warn("⚠️ CSV is empty or only contains headers.");
      return [];
    }

    const headers = parsed[0].map((h) => h.trim());
    
    const getColIndex = (name: string): number => headers.indexOf(name);
    
    const nameIdx = getColIndex("Name");
    const urlIdx = getColIndex("URL");
    const summaryIdx = getColIndex("Summary");
    const topicIdx = getColIndex("Topic");
    const subtopicsIdx = getColIndex("Subtopics");
    const repoTypeIdx = getColIndex("Repo Type");
    const typeIdx = getColIndex("Type");
    const priorityIdx = getColIndex("Priority");
    const keyTakeawayIdx = getColIndex("Key Takeaway");
    const actionIdx = getColIndex("Action");
    const primaryAudienceIdx = getColIndex("Primary Audience");

    const resources: Resource[] = [];

    for (let i = 1; i < parsed.length; i++) {
      const row = parsed[i];
      if (row.length < Math.max(nameIdx, urlIdx)) continue;

      const title = row[nameIdx]?.trim();
      const url = row[urlIdx]?.trim();

      if (!title || !url) continue;

      const id = crypto.createHash("md5").update(url).digest("hex").slice(0, 16);
      
      const summary = row[summaryIdx]?.trim() || "";
      const topic = row[topicIdx]?.trim() || "Other Tools";
      const subtopicsRaw = row[subtopicsIdx]?.trim() || "";
      
      const tags = subtopicsRaw
        ? subtopicsRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      
      const subcategory = tags[0] || undefined;
      const repoType = row[repoTypeIdx]?.trim() || "";
      const typeStr = row[typeIdx]?.trim() || "";

      const type = inferResourceType(repoType, typeStr);
      const priority = row[priorityIdx]?.trim() || "";
      const keyTakeaway = row[keyTakeawayIdx]?.trim() || "";
      const action = row[actionIdx]?.trim() || "";
      const primaryAudience = row[primaryAudienceIdx]?.trim() || "";

      const quality: ResourceQuality = priority === "P1" ? "featured" : "standard";
      const tocPath: string[] = subcategory ? [topic, subcategory] : [topic];

      // Auto generate editorial summaries using customized rule engine
      const { cardSummary, detailSummary, bestFor, accessNote } = generateEditorialFields(
        title,
        url,
        topic,
        tags,
        summary,
        action,
        primaryAudience,
        repoType
      );

      const resource: Resource = {
        id,
        title,
        url,
        language: "en",
        collection: "github" as ResourceCollection,
        category: topic,
        subcategory,
        tocPath,
        type,
        tags,
        quality,
        source: "GitHub",
        sourcePath: path.basename(csvFilePath),
        updatedAt: new Date().toISOString(),
        summary,
        keyTakeaway,
        priority,
        action,
        cardSummary,
        detailSummary,
        bestFor,
        accessNote,
      };

      resources.push(resource);
    }

    console.log(`✅ Loaded and transformed ${resources.length} GitHub records with custom editorial summaries.`);
    return resources;
  } catch (error) {
    console.error(`❌ Failed to read or transform CSV file at ${csvFilePath}:`, error);
    return [];
  }
}
