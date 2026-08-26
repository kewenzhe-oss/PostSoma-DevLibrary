# PostSoma DevLibrary 数据清洗 Agent 批处理指令模板

将下面整段交给 IDE AI Agent，只替换尖括号中的批次参数。首次使用或规范版本变化时，先执行 20 条校准批次。

---

你现在负责 PostSoma DevLibrary 的一批上游学习资源清洗。

## 批次参数

- 上游资料库根目录：`<PROJECT_ROOT>`（`books/`、`courses/`、`more/` 等输入路径相对此目录）
- Next.js 应用根目录：`<PROJECT_ROOT>/postsoma-devlibrary`（规范、Schema、staging 输出均相对此目录）
- 执行模式：`PREVIEW`
- 批次 ID：`<BATCH_ID>`
- 输入文件：`<BATCH_INPUT_PATH>`
- 最大记录数：`<MAX_RECORDS，校准批次 20，普通分类批次建议 40–60>`
- 输出目录：`<STAGING_OUTPUT_DIR>`
- Prompt 版本：`resource-cleaning-agent/1.1.1`

## 必读规范

开始前必须完整阅读：

1. `docs/data-governance/POSTSOMA_RESOURCE_TAXONOMY.md`
2. `docs/data-governance/curated-resource.schema.json`
3. 当前项目的资源类型、解析、验证和去重实现：
   - `lib/types/resource.ts`
   - `scripts/pipeline/parseMarkdown.ts`
   - `scripts/pipeline/validateResources.ts`
   - `scripts/pipeline/dedupeResources.ts`
   - `scripts/pipeline/config.ts`

`POSTSOMA_RESOURCE_TAXONOMY.md` 是分类边界、语言、摘要证据和审核语义的唯一权威依据；JSON Schema 是输出格式的唯一权威依据。疑似冲突时停止并报告，不得自行解释。

## 强制规则

1. 先检查 Git 工作区；不得覆盖、删除、重置或混入用户已有修改。
2. 本批次只允许处理 Books、Courses、Cheat Sheets、Interactive，不处理 GitHub Favorites。
3. 只处理输入文件中的前 `<MAX_RECORDS>` 条，不能跨批次扩大范围。
4. 一条资源只能分配一个 canonical Topic；应用领域优先于实现语言。
5. 原始标题、URL、heading path、category、subcategory、source path、实际 `source.lineNumber` 和 original line 必须原样保留在 `source`。
6. 清洗 subcategory 时遵守 NFKC、转义清理、编号移除、语言前缀移除和稳定 kebab-case 规则。
7. 摘要必须基于已记录证据。无法读取可靠内容时将 `summary` 设为 `null`、`summarySource.kind` 设为 `none`，或以低置信度进入 `needs_review`；禁止套用 Topic 模板。
8. AI 不能把 Why/价值、作者、质量、免费状态、目标用户或学习结果当成事实编造。
9. AI 不得设置 `reviewStatus: approved`，不得自动删除、静默去重或修改 canonical/public 数据。
10. 语言只有在证据支持时判定：仅凭标题时 `confidence.lang <= 0.60`；仅凭上游语言分区时 `confidence.lang <= 0.75`；英文标题与中文分区冲突且没有第二项证据时，必须 `needs_review` 且 `confidence.lang <= 0.60`。
11. `confidence` 必须分别评估 topic、subcategory、lang、summary；任一关键判断低于 `0.65` 时使用 `needs_review`。
12. 新批次必须声明 `schemaVersion: 1.1.0`，并通过 `curated-resource.schema.json` 校验。
13. `id` 是 staging Lineage ID，只用于来源定位；不得作为生产 `Resource.id`。
14. 每条记录必须计算 `productionResourceId`：`SHA256(lang + ':' + title + ':' + canonicalUrl).slice(0, 16)`，并填入 `existingProductionResourceId`（当前正式资源的 ID，未找到则为 `null`）。
15. 若 `productionResourceId` 与 `existingProductionResourceId` 不同，必须设为 `needs_review`，说明差异原因；不得自动更换生产 ID 或修改正式数据。

## PREVIEW 输出

只在 `<STAGING_OUTPUT_DIR>/<BATCH_ID>/` 生成以下本地 staging 产物：

- `cleaned-records.json`
- `needs-review.json`
- `duplicate-candidates.json`
- `rejected-records.json`
- `batch-report.md`

`batch-report.md` 至少包含：

- 输入、成功、待审核、重复候选、拒绝和失败数量。
- Topic 与语言分布。
- 各置信度字段的分布。
- 每条 `needs_review` 的具体原因和候选值。
- 每个摘要使用的证据类型；无法取得证据的原因。
- 重复候选的 URL、判断依据与置信度。
- 明确声明没有修改哪些 canonical/public 文件。

## 禁止事项

- 不得修改 `public/data/resources*.json`、`categories.json`、`toc.json`、`manifest.json` 或任何 canonical 来源 Markdown。
- 不得执行正式写入、`pipeline:generate`、commit、push 或部署。
- 不得自动批准、删除或合并资源。
- 不得处理超过本批次上限的记录。
- 不得把 GitHub Favorites 纳入本批次。

完成后报告结果并立即停止，等待人工确认。只有收到明确的“确认本批次清洗结果”后，才能提出后续写入计划；确认本身不等于授权 commit、push 或部署。

---
