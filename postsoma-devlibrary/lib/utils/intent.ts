export type IntentKey = "read" | "build" | "practice" | "reference" | "surprise";

export interface IntentMeta {
  key: IntentKey;
  order: string;
  name: string;
  label: string;
  problemSolved: string;
  carrierLabel: string;
  icon: "read" | "build" | "practice" | "reference" | "surprise";
  actionLabel: string;
  exploreHref: string;
}

export const INTENT_DEFINITIONS: Record<IntentKey, IntentMeta> = {
  read: {
    key: "read",
    order: "01",
    name: "阅读研读",
    label: "READ",
    problemSolved: "体系化教材与深度教程，适合从零构筑底层心智模型与知识体系。",
    carrierLabel: "书籍 / 教程 / 课程",
    icon: "read",
    actionLabel: "研读此资源",
    exploreHref: "/resources?type=book",
  },
  build: {
    key: "build",
    order: "02",
    name: "开源实战",
    label: "BUILD",
    problemSolved: "真实生产级开源项目与开发者工具，通过阅读源码与调试掌握工程落地。",
    carrierLabel: "开源项目 / 生产工具 / 插件",
    icon: "build",
    actionLabel: "查看代码",
    exploreHref: "/resources?collection=github",
  },
  practice: {
    key: "practice",
    order: "03",
    name: "动手练习",
    label: "PRACTICE",
    problemSolved: "免配置的浏览器在线沙箱与关卡挑战，快速获得代码运行反馈。",
    carrierLabel: "在线沙箱 / 交互实验 / 练习题",
    icon: "practice",
    actionLabel: "即刻动手",
    exploreHref: "/resources?collection=interactive",
  },
  reference: {
    key: "reference",
    order: "04",
    name: "速查参考",
    label: "REFERENCE",
    problemSolved: "官方标准规范、API 文档与常用速查备忘单，日常编码时高频精准查阅。",
    carrierLabel: "官方文档 / 速查备忘单",
    icon: "reference",
    actionLabel: "查阅文档",
    exploreHref: "/resources?collection=cheat_sheets",
  },
  surprise: {
    key: "surprise",
    order: "05",
    name: "盲盒探索",
    label: "SURPRISE",
    problemSolved: "打破预设技术栈边界，在全库精选中随机偶遇可能启发你的优质开源节点。",
    carrierLabel: "跨分类随机采样 / 灵感漫游",
    icon: "surprise",
    actionLabel: "探索此节点",
    exploreHref: "/recommend",
  },
};

/**
 * 意图轴映射规则 (Phase 2):
 * 1. 优先级：type 精确匹配优先，URL / collection 启发式兜底，避免同一资源落入两个意图。
 * 2. Fallback:
 *    - extension -> BUILD
 *    - collection -> REFERENCE
 * 3. 无法映射的返回 null，仅保留搜索可达，不进入意图导览。
 */
export function getResourceIntent(r: {
  type: string;
  collection?: string;
  tags?: string[];
  url?: string;
}): "read" | "build" | "practice" | "reference" | null {
  // ─── 优先级 1: type 字段精确匹配 ──────────────────────────────────
  if (
    r.type === "book" ||
    r.type === "tutorial" ||
    r.type === "course" ||
    r.type === "article"
  ) {
    return "read";
  }

  if (r.type === "interactive") {
    return "practice";
  }

  if (r.type === "documentation" || r.type === "cheat_sheet") {
    return "reference";
  }

  // extension / app / library / framework / cli -> BUILD
  if (
    r.type === "app" ||
    r.type === "library" ||
    r.type === "framework" ||
    r.type === "cli" ||
    r.type === "extension"
  ) {
    return "build";
  }

  // collection -> REFERENCE
  if (r.type === "collection") {
    return "reference";
  }

  // ─── 优先级 2: URL / collection / tags 启发式兜底 ─────────────────
  const hasHandsOnTag =
    r.tags?.some((t) => {
      const tl = t.toLowerCase();
      return (
        tl.includes("playground") ||
        tl.includes("sandbox") ||
        tl.includes("exercise") ||
        tl.includes("practice") ||
        tl.includes("compiler")
      );
    }) || false;

  if (
    r.collection === "interactive" ||
    hasHandsOnTag ||
    r.collection === "problem_sets"
  ) {
    return "practice";
  }

  if (
    r.collection === "books" ||
    r.collection === "courses" ||
    r.collection === "podcasts"
  ) {
    return "read";
  }

  if (r.collection === "cheat_sheets") {
    return "reference";
  }

  if (r.collection === "github" || (r.url && r.url.includes("github.com/"))) {
    return "build";
  }

  // ─── Fallback 规则 ──────────────────────────────────────────────
  if (
    r.type === "extension" ||
    (r.url && r.url.includes("chrome.google.com/webstore"))
  ) {
    return "build";
  }

  if (r.collection) {
    return "reference";
  }

  // ─── 优先级 3: 无法映射的仅保留搜索可达，不进意图导览 ─────────────
  return null;
}
