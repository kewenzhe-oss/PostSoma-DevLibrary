import fs from "node:fs/promises";
import path from "node:path";
import {
  createGitHubFavoriteId,
  loadGitHubFavoritesCollection,
  parseGitHubRepositoryUrl,
  validateGitHubFavoritesCollection,
} from "../../lib/data/github-favorites";
import {
  loadGitHubFavoriteCurationCollection,
  validateGitHubFavoriteCurationCollection,
} from "../../lib/data/github-curation";
import type {
  GitHubFavorite,
  GitHubFavoritesCollection,
} from "../../lib/types/github-favorite";
import type {
  GitHubFavoriteCuration,
  GitHubFavoriteCurationCollection,
} from "../../lib/types/github-curation";
import type { ResourceType } from "../../lib/types/resource";

interface RawCandidate {
  url: string;
  title: string;
  shortSummary: string;
  capabilities: string[];
  techStack: string[];
  topic: string;
  resourceType: ResourceType;
  curationOverride?: {
    belongsTo: "devlibrary";
    boundaryReason: string;
  };
}

const NEW_ITEMS: RawCandidate[] = [
  {
    url: "https://github.com/KKKKhazix/AIHOT",
    title: "AIHOT",
    shortSummary:
      "自主抓取行业信源并自动排版生成每日热点与日报的网站框架。支持替换数据源与精选标准搭建垂直领域站点，内置 MCP 扩展与 RSS 订阅。",
    capabilities: ["content-creation", "automation", "workflow", "self-hosted"],
    techStack: ["TypeScript", "Node.js"],
    topic: "Web Development",
    resourceType: "app",
  },
  {
    url: "https://github.com/Tencent-Hunyuan/AuK",
    title: "AuK",
    shortSummary:
      "腾讯混元开源的基础语音生成与编辑大模型，支持零样本文本转语音（Zero-shot TTS）、声音克隆、目标人声提取与音频修复增强。",
    capabilities: ["speech", "tts", "llm"],
    techStack: ["Python", "PyTorch"],
    topic: "AI & Data",
    resourceType: "library",
  },
  {
    url: "https://github.com/HammingDev/haiming-app-monetization",
    title: "haiming-app-monetization",
    shortSummary:
      "独立开发者 App 商业化实战规范集合，系统覆盖新用户 onboarding 流程设计、付费墙（Paywall）策略、应用内购买选项与竞品调研方法论。",
    capabilities: ["developer-tooling", "workflow", "knowledge-base"],
    techStack: ["Markdown"],
    topic: "Developer Resources",
    resourceType: "collection",
    curationOverride: {
      belongsTo: "devlibrary",
      boundaryReason:
        "人工决策覆盖：作为独立开发者商业化与付费体系参考保留在 DevLibrary",
    },
  },
  {
    url: "https://github.com/Donchitos/Claude-Code-Game-Studios",
    title: "Claude-Code-Game-Studios",
    shortSummary:
      "将 Claude Code 转化为完整多智能体游戏开发工作室的协调编排框架，内置 49 个专业 Agent 与 72 个技能定义，复现真实游戏工作室架构。",
    capabilities: [
      "agents",
      "coding-assistant",
      "workflow",
      "developer-tooling",
    ],
    techStack: ["Shell", "Python"],
    topic: "Developer Tools",
    resourceType: "framework",
    curationOverride: {
      belongsTo: "devlibrary",
      boundaryReason:
        "人工决策覆盖：作为游戏工作室多 Agent 协调架构参考保留在 DevLibrary",
    },
  },
  {
    url: "https://github.com/rockbenben/scrcpy-helper",
    title: "scrcpy-helper",
    shortSummary:
      "开箱即用的 Android 设备投屏图形化辅助工具，免去 scrcpy 繁琐命令行参数，支持无线投屏、低延迟录屏及将手机摄像头接入 Windows。",
    capabilities: ["developer-tooling", "cli"],
    techStack: ["PowerShell", "WinForms"],
    topic: "Desktop Development",
    resourceType: "app",
  },
  {
    url: "https://github.com/yuliskov/SmartTube",
    title: "SmartTube",
    shortSummary:
      "专为 Android TV 与机顶盒设计的第三方开源媒体播放客户端，支持 4K/8K 播放、画中画，深度集成 SponsorBlock 赞助片段与广告过滤规则。",
    capabilities: ["local-first", "privacy", "media"],
    techStack: ["Java", "Kotlin", "Android SDK"],
    topic: "Mobile Development",
    resourceType: "app",
  },
  {
    url: "https://github.com/shilapi/xcertplay",
    title: "xcertplay",
    shortSummary:
      "在 Android 车机系统上原生实现 Apple CarPlay 互联协议的开源探索方案，支持板载 MFi 芯片直通或通过 CH341 USB 芯片进行桥接。",
    capabilities: ["developer-tooling"],
    techStack: ["Kotlin", "C++", "Android SDK"],
    topic: "System Development",
    resourceType: "library",
  },
  {
    url: "https://github.com/Lin-arm/GKD_subscription",
    title: "GKD_subscription",
    shortSummary:
      "Android 自动化无障碍点击应用 GKD 的高质量第三方广告规则订阅集，基于无障碍节点匹配自动跳过移动应用开屏广告与弹窗。",
    capabilities: ["automation", "privacy"],
    techStack: ["TypeScript"],
    topic: "Mobile Development",
    resourceType: "collection",
  },
  {
    url: "https://github.com/listen1/listen1_chrome_extension",
    title: "listen1_chrome_extension",
    shortSummary:
      "聚合多家主流音乐平台音频资源的一站式浏览器听歌插件，支持多平台统一歌单、跨源播放与播放列表导入导出，兼容 Chrome 与 Firefox。",
    capabilities: ["browser-extension", "search"],
    techStack: ["JavaScript", "HTML", "CSS"],
    topic: "Frontend Development",
    resourceType: "extension",
  },
  {
    url: "https://github.com/CopilotKit/openmuse",
    title: "openmuse",
    shortSummary:
      "基于 CopilotKit 与 AG-UI 构建的个人全自主 AI Agent，配备浏览器自动化沙箱、命令行终端与文件读写能力，可执行长周期连续任务。",
    capabilities: [
      "agents",
      "browser-automation",
      "workflow",
      "coding-assistant",
    ],
    techStack: ["TypeScript", "React"],
    topic: "AI & Data",
    resourceType: "framework",
    curationOverride: {
      belongsTo: "devlibrary",
      boundaryReason:
        "人工决策覆盖：作为 CopilotKit 自主 Agent 参考实现保留在 DevLibrary",
    },
  },
  {
    url: "https://github.com/ntfargo/Relapse-Exploit",
    title: "Relapse-Exploit",
    shortSummary:
      "针对 PlayStation 5 固件版本 7.00 - 13.60 的完整内核利用链研究资料，串联 WebKit 用户态漏洞与内核特权提升机制，供安全研究员审计。",
    capabilities: ["security", "developer-tooling"],
    techStack: ["JavaScript", "C"],
    topic: "Security",
    resourceType: "app",
  },
  {
    url: "https://github.com/nsfw-filter/nsfw-filter",
    title: "nsfw-filter",
    shortSummary:
      "基于 TensorFlow.js 的隐私安全型浏览器扩展，在用户浏览器本地直接运行轻量级卷积网络，实时识别并阻断网页中的不适宜图像。",
    capabilities: ["browser-extension", "privacy", "local-first"],
    techStack: ["TypeScript", "TensorFlow.js"],
    topic: "Frontend Development",
    resourceType: "extension",
  },
];

// In addition, android-remote-control-mcp from previous batch needs manual override recorded
const ADDITIONAL_CURATION_OVERRIDES = [
  {
    favoriteId: "e7fbb726b1647146",
    belongsTo: "devlibrary" as const,
    boundaryReason:
      "人工决策覆盖：作为 Android 远程控制与自动化工具保留在 DevLibrary",
  },
];

async function main() {
  const dataPath = path.resolve("data/github-favorites.json");
  const publicPath = path.resolve("public/data/github-favorites.json");
  const curationPath = path.resolve("data/github-favorite-curation.json");

  const [canonicalRaw, publicRaw] = await Promise.all([
    fs.readFile(dataPath, "utf8"),
    fs.readFile(publicPath, "utf8"),
  ]);

  if (canonicalRaw !== publicRaw) {
    throw new Error(
      "Canonical and public GitHub favorites differ. Sync before running.",
    );
  }

  const collection = await loadGitHubFavoritesCollection(dataPath);
  const curation = await loadGitHubFavoriteCurationCollection(curationPath);

  const existingIds = new Set(collection.records.map((r) => r.id));
  const existingUrls = new Set(
    collection.records.map((r) => r.githubUrl.toLowerCase()),
  );

  const now = new Date().toISOString();
  const newFavorites: GitHubFavorite[] = [];
  const newCurations: GitHubFavoriteCuration[] = [];

  for (const item of NEW_ITEMS) {
    const repository = parseGitHubRepositoryUrl(item.url);
    if (!repository) {
      throw new Error(`Invalid GitHub repository URL: ${item.url}`);
    }

    if (existingUrls.has(repository.canonicalUrl.toLowerCase())) {
      throw new Error(
        `Repository ${repository.canonicalUrl} already exists in collection.`,
      );
    }

    const id = createGitHubFavoriteId(repository.canonicalUrl);
    if (existingIds.has(id)) {
      throw new Error(`Generated ID ${id} already exists.`);
    }

    existingIds.add(id);
    existingUrls.add(repository.canonicalUrl.toLowerCase());

    const favorite: GitHubFavorite = {
      id,
      githubUrl: repository.canonicalUrl,
      title: item.title,
      shortSummary: item.shortSummary,
      capabilities: item.capabilities,
      techStack: item.techStack,
      personalNote: "",
      whySaved: "",
      discoveredAt: now,
      discoveredAtSource: "local-entry",
      lastReviewedAt: null,
      health: "active",
      lastCheckedAt: null,
      lastPushedAt: null,
      githubArchived: null,
      githubDisabled: null,
      editorial: {
        topic: item.topic,
        resourceType: item.resourceType,
        quality: "standard",
        fullSummary: item.shortSummary,
      },
    };

    newFavorites.push(favorite);

    if (item.curationOverride) {
      newCurations.push({
        favoriteId: id,
        belongsTo: item.curationOverride.belongsTo,
        relatedLearningResourceIds: [],
        boundaryReason: item.curationOverride.boundaryReason,
      });
    }
  }

  for (const extra of ADDITIONAL_CURATION_OVERRIDES) {
    if (!curation.records.some((r) => r.favoriteId === extra.favoriteId)) {
      newCurations.push({
        favoriteId: extra.favoriteId,
        belongsTo: extra.belongsTo,
        relatedLearningResourceIds: [],
        boundaryReason: extra.boundaryReason,
      });
    }
  }

  const nextCollection: GitHubFavoritesCollection = {
    ...collection,
    records: [...collection.records, ...newFavorites],
  };

  const collectionErrors = validateGitHubFavoritesCollection(nextCollection);
  if (collectionErrors.length > 0) {
    throw new Error(
      `Invalid updated collection:\n- ${collectionErrors.join("\n- ")}`,
    );
  }

  const nextCuration: GitHubFavoriteCurationCollection = {
    ...curation,
    updatedAt: now,
    records: [...curation.records, ...newCurations],
  };

  const curationErrors =
    validateGitHubFavoriteCurationCollection(nextCuration);
  if (curationErrors.length > 0) {
    throw new Error(
      `Invalid updated curation:\n- ${curationErrors.join("\n- ")}`,
    );
  }

  const serializedFavorites = `${JSON.stringify(nextCollection, null, 2)}\n`;
  const serializedCuration = `${JSON.stringify(nextCuration, null, 2)}\n`;

  await Promise.all([
    fs.writeFile(dataPath, serializedFavorites, "utf8"),
    fs.writeFile(publicPath, serializedFavorites, "utf8"),
    fs.writeFile(curationPath, serializedCuration, "utf8"),
  ]);

  console.log(`Successfully ingested ${newFavorites.length} new favorites.`);
  console.log(`Collection records updated: ${collection.records.length} -> ${nextCollection.records.length}`);
  console.log(`Curation records updated: ${curation.records.length} -> ${nextCuration.records.length}`);
  newFavorites.forEach((f, i) => {
    console.log(`[${i + 1}/12] ${f.id} | ${f.title} | ${f.githubUrl}`);
  });
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
