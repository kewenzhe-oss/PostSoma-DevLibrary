import type { Resource } from "@/lib/types/resource";

export const TYPE_LABELS: Record<Resource["type"], string> = {
  book: "book",
  course: "course",
  tutorial: "tutorial",
  documentation: "docs",
  interactive: "interactive",
  article: "article",
  unknown: "resource",
};

export function getCleanCategory(category: string, isZh: boolean = false): string {
  const upper = category.toUpperCase().trim();
  
  if (upper === "BY PROGRAMMING LANGUAGE") {
    return isZh ? "编程语言" : "Programming Languages";
  }
  if (upper === "BY SUBJECT") {
    return isZh ? "计算机科学" : "Computer Science";
  }
  if (upper === "语言无关") {
    return isZh ? "软件开发通用" : "Software Development";
  }
  if (upper === "语言相关") {
    return isZh ? "编程语言" : "Programming Languages";
  }

  // Remove numeric prefixes like "0 - MOOC" or "1 - CS"
  return category.replace(/^\d+\s*-\s*/, "").trim();
}

export function generateDescription(resource: Resource, uiLanguage: "all" | "zh" | "en" = "all"): string {
  const typeLabelsZh: Record<Resource["type"], string> = {
    book: "编程书籍",
    course: "精选课程",
    tutorial: "精选教程",
    documentation: "技术文档",
    interactive: "互动工具",
    article: "技术文章",
    unknown: "学习资源",
  };

  const typeStrZh = typeLabelsZh[resource.type] || "学习资源";
  const typeStrEn = TYPE_LABELS[resource.type] || "resource";

  const isZh = uiLanguage === "zh" || (uiLanguage === "all" && resource.language === "zh");
  const cleanCat = getCleanCategory(resource.category, isZh);

  // Clean tags of structural/duplicate items to prevent robotic redundancy
  const cleanTags = (resource.tags || [])
    .map(t => t.trim())
    .filter(t => {
      const u = t.toUpperCase();
      return (
        u !== resource.category.toUpperCase() &&
        u !== (resource.subcategory || "").toUpperCase() &&
        u !== "BY PROGRAMMING LANGUAGE" &&
        u !== "BY SUBJECT" &&
        u !== "语言无关" &&
        u !== "语言相关" &&
        !/^\d+\s*-\s*/.test(t)
      );
    });

  if (isZh) {
    const tagsStr = cleanTags.length > 0
      ? `，涵盖 ${cleanTags.slice(0, 3).join("、")}`
      : "";
    if (resource.type === "interactive") {
      return `${cleanCat} 分类下的免费在线互动工具${tagsStr}，可直接在浏览器中动手练习。`;
    }
    if (resource.type === "documentation") {
      return `收录于 ${cleanCat} 分类下的官方${typeStrZh}${tagsStr}，供开发者参考查阅。`;
    }
    return `收录于 ${cleanCat} 分类下的免费开源${typeStrZh}${tagsStr}，助力开发者技能提升与深度学习。`;
  } else {
    const tagsStr = cleanTags.length > 0
      ? ` covering ${cleanTags.slice(0, 3).join(", ")}`
      : "";
    // Type-specific English templates for better semantic accuracy
    if (resource.type === "interactive") {
      return `A hands-on interactive tool in the ${cleanCat} directory${tagsStr}. Practice and experiment directly in the browser.`;
    }
    if (resource.type === "documentation") {
      return `Official documentation or reference material in the ${cleanCat} directory${tagsStr}, curated for software developers.`;
    }
    if (resource.type === "tutorial") {
      return `A free step-by-step tutorial in the ${cleanCat} directory${tagsStr}, curated for software developers.`;
    }
    return `A free open-source ${typeStrEn} in the ${cleanCat} directory${tagsStr}, curated for software developers.`;
  }
}
