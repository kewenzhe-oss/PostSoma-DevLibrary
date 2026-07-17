import type { Difficulty } from "./resource";

export interface LearningPathStep {
  id: string;
  title: string;
  titleZh?: string;
  description: string;
  descriptionZh?: string;
  estimatedTime: string;
  difficulty: Difficulty;
  resourceIds: string[];
  optional?: boolean;
}

export interface LearningPath {
  id: string;
  slug: string;
  title: string;
  titleZh?: string;
  summary: string;
  summaryZh?: string;
  language: "zh" | "en" | "both";
  difficulty: Difficulty;
  tags: string[];
  audience: string[];
  estimatedTotal: string;
  steps: LearningPathStep[];
  updatedAt: string;
}

export interface WeeklyPick {
  weekOf: string;
  headline: string;
  headlineZh?: string;
  items: Array<{
    resourceId?: string;
    pathId?: string;
    reason: string;
    reasonZh?: string;
  }>;
}
