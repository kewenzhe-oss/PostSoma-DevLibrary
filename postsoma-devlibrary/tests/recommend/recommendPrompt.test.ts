import { describe, expect, it } from "vitest";
import { buildRecommendationPrompt } from "../../lib/data/recommend-prompt";
import type { RecommendationResult } from "../../lib/data/recommend";

describe("recommendation prompt", () => {
  it("describes the submitted criteria and actual candidate without asserting it was verified", () => {
    const result = {
      relaxedReason: "已放宽类型条件。", generator: "local-rules", funnel: { totalRelated: 1, matched: 1, compared: 1, returned: 1 },
      picks: [{ title: "Python Guide", url: "https://example.com/python", type: "book", language: "zh" }],
    } as RecommendationResult;
    const prompt = buildRecommendationPrompt({ goal: "Python", language: "zh", difficulty: "beginner", format: "book" }, result);
    expect(prompt).toContain("学习目标：Python");
    expect(prompt).toContain("https://example.com/python");
    expect(prompt).toContain("未经逐项核实");
    expect(prompt).toContain("已放宽类型条件");
    expect(prompt).not.toContain("5,184");
  });
});
