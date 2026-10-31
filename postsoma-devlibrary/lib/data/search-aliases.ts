/** Exact topic names with common simplified, traditional, and English forms. */
const TOPIC_GROUPS: ReadonlyArray<readonly [string, string, string]> = [
  ["机器学习", "機器學習", "machine learning"],
  ["数据库", "資料庫", "database"],
  ["人工智能", "人工智慧", "artificial intelligence"],
  ["计算机科学", "計算機科學", "computer science"],
];

export function getSearchAlias(query: string): string | undefined {
  const term = query.trim().toLowerCase();
  return TOPIC_GROUPS.find(([simplified, traditional]) => term === simplified || term === traditional)?.[2];
}

export function getSearchAliases(query: string): string[] {
  const term = query.trim().toLowerCase();
  const group = TOPIC_GROUPS.find(([simplified, traditional]) => term === simplified || term === traditional);
  return group ? group.filter((alias) => alias !== term) : [];
}
