import type { RecommendOptions, RecommendationResult } from "./recommend";
import { SITE_URL } from "../config/site";

/** The prompt describes the submitted criteria used for these picks. */
export function buildRecommendationPrompt(criteria: RecommendOptions, result: RecommendationResult): string {
  const picks = result.picks.map((pick, index) =>
    `${index + 1}. ${pick.title}\n   ${pick.url}\n   类型：${pick.type}；语言：${pick.language}`
  ).join("\n\n");
  return `请根据以下学习目标和候选资源，帮我制定一个适合第一周的学习计划。\n\n学习目标：${criteria.goal}\n语言：${criteria.language}\n难度：${criteria.difficulty}\n资源类型：${criteria.format}\n\n${result.relaxedReason ? `筛选条件说明：${result.relaxedReason}\n\n` : ""}资源库根据目录信息匹配出的候选：\n${picks}\n\n这些结果未经逐项核实，请不要假定链接可用或内容一定适合我。如果你能访问网页，请先核实；如果不能，请明确说明。资源库完整目录：${SITE_URL}/data/resources.json`;
}
