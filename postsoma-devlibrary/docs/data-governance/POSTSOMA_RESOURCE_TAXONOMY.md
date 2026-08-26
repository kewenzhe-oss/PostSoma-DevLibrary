# PostSoma DevLibrary 主题分类与资源清洗规范

- 规范版本：`1.1.1`
- 状态：`Authoritative / 唯一权威依据`
- 生效日期：`2026-08-25`
- 适用范围：来自上游资源库的 Books、Courses、Cheat Sheets、Interactive
- 不适用范围：GitHub Favorites（使用独立的 GithubFavorite 数据模型与策展流程）
- 机器契约：[`curated-resource.schema.json`](./curated-resource.schema.json)
- Agent 模板：[`DATA_CLEANING_AGENT_INSTRUCTION.md`](./DATA_CLEANING_AGENT_INSTRUCTION.md)

## 1. 使用方式

任何负责上游资源清洗、分类、摘要、去重或审核的 AI Agent，都必须在处理数据前完整阅读本规范和配套 JSON Schema。

本规范负责字段的真实语义、分类边界和人工审核原则；JSON Schema 负责输出结构与可校验格式。两者发生疑似冲突时，Agent 必须停止处理并报告，不得自行解释或扩大规则。

本规范不会自动改变当前 `Resource` 类型、canonical 数据或生成管线。它先作为 staging 数据和后续数据清洗实现的权威设计契约；只有经过独立实施、测试和人工确认后，清洗结果才能进入正式数据。

### 1.1 双根目录约定

- **上游资料库根目录**：`<PROJECT_ROOT>`。`books/`、`courses/`、`more/` 等来源路径均相对此目录。
- **Next.js 应用根目录**：`<PROJECT_ROOT>/postsoma-devlibrary`。本规范、Schema 与 `.local-audit/staging/` 均相对此目录。

Agent 不得把上游资料路径误解为应用内路径，也不得把本地 staging 写入上游 Markdown 或生产输出目录。

## 2. 不可违反的原则

1. 一条资源只能有一个 canonical Topic。
2. Topic 表达资源承诺给学习者的主要学习结果，而不是上游 Markdown 所在位置。
3. 应用领域优先于实现语言。例如“用 Python 学机器学习”归入 `ai-data-science`，Python 只作为标签。
4. Subcategory 是 Topic 下的稳定叶子分类；不得直接把未经清洗的上游标题当作 canonical 值。
5. 上游原始标题、标题路径、分类、子分类、原始行和来源路径必须保留，便于追溯。
6. 摘要必须有证据。没有读到可支持摘要的内容时，保留为空或标记待审核，禁止套用模板制造差异。
7. AI 不得把记录自动设为 `approved`，不得自动删除资源，也不得静默合并疑似重复项。
8. 语言、分类、摘要、重复判断必须分别记录置信度；低置信度进入人工审核。
9. 所有批处理默认使用 `PREVIEW`，不得直接写入 canonical 或 public 数据。
10. GitHub Favorites 不进入本规范的批处理，避免覆盖个人策展字段与健康状态。
11. Staging 溯源 ID 与生产 `Resource.id` 是不同职责的字段；任何批处理都不得用前者覆盖后者。

### 2.1 ID、生产兼容与来源定位

从 Schema `1.1.0` 起，每条新 staging 记录同时携带以下身份：

| 字段 | 职责 | 写入规则 |
|---|---|---|
| `id` | 本地 staging / Lineage ID | 可读的来源定位标签，例如 `zh-books-fpb-zh-267-1`；仅用于本地审核、批次定位和审计，不得写入生产 `Resource.id`。 |
| `source.lineNumber` | 上游 Markdown 行号 | 实际来源行号，与 `id` 中的行号互相核验；行号会随上游插入内容变化，不能充当永久身份。 |
| `productionResourceId` | 目标生产 ID | 严格使用现有算法：`SHA256(lang + ':' + title + ':' + canonicalUrl).slice(0, 16)`。此字段是未来整合时写入/匹配 `Resource.id` 的唯一候选。 |
| `existingProductionResourceId` | 当前正式库中的已存在记录 | 通过 URL / 标题 / 语言查得的当前 `Resource.id`；未找到时为 `null`。 |

`productionResourceId` 只在 `lang`、`title`、`canonicalUrl` 均不变时稳定。若它与 `existingProductionResourceId` 不同（例如语言判定被纠正），必须设为 `needs_review`，记录差异原因，并在人工批准的独立迁移步骤中处理；不得由清洗 Agent 自动更换生产 ID、破坏既有详情页 URL 或修改 public 数据。

历史 `1.0.0` staging 记录可继续按旧契约审核；进入正式整合前必须补齐 `1.1.0` 的身份字段。

## 3. Canonical Topic 受控词表

Topic ID 永久使用英文 kebab-case，不因 UI 文案调整而变化。显示名可本地化，但 ID 不可复用或随意重命名。

| ID | English | 中文 | 包含范围 | 排除与边界 |
|---|---|---|---|---|
| `cs-foundations` | Computer Science Foundations | 计算机科学基础 | 算法、数据结构、计算理论、编译原理、操作系统原理、计算机体系结构、离散数学 | 面向工程实践的方法归 `software-engineering`；具体语言学习归 `programming-languages` |
| `programming-languages` | Programming Languages | 编程语言 | 某一种语言本身的语法、标准库、惯用法、语言参考与语言专门教程 | 以 Web、移动、AI 等应用结果为主时归对应领域，语言作为标签 |
| `web-development` | Web Development | Web 开发 | HTML/CSS、浏览器、前后端 Web、Web 框架、Web API、Web 性能与可访问性 | 通用网络原理归 `systems-networking`；通用 UI/UX 设计归 `graphics-design-games` |
| `mobile-development` | Mobile Development | 移动开发 | iOS、Android、跨平台移动应用、移动端架构与发布 | 嵌入式设备与 IoT 归 `embedded-iot-robotics` |
| `embedded-iot-robotics` | Embedded, IoT & Robotics | 嵌入式、物联网与机器人 | 微控制器、单板机、固件、IoT、机器人、硬件接口 | 通用操作系统与网络归 `systems-networking` |
| `ai-data-science` | AI & Data Science | 人工智能与数据科学 | 机器学习、深度学习、生成式 AI、NLP、计算机视觉、统计建模、数据分析与可视化 | 数据存储、ETL、数据平台归 `databases-data-engineering` |
| `databases-data-engineering` | Databases & Data Engineering | 数据库与数据工程 | SQL/NoSQL、数据库设计、查询优化、数据仓库、ETL/ELT、流处理与数据平台 | 统计分析与机器学习归 `ai-data-science` |
| `cloud-devops-sre` | Cloud, DevOps & SRE | 云计算、DevOps 与 SRE | 云平台、容器、编排、CI/CD、基础设施即代码、可观测性、可靠性工程 | 操作系统或网络原理归 `systems-networking`；团队工程方法归 `software-engineering` |
| `systems-networking` | Systems & Networking | 系统与网络 | Linux/Unix、操作系统实践、分布式系统原理、计算机网络、协议、存储与底层系统编程 | 安全攻防归 `cybersecurity-privacy`；云运维归 `cloud-devops-sre` |
| `cybersecurity-privacy` | Cybersecurity & Privacy | 网络安全与隐私 | 应用安全、网络安全、密码学、安全测试、取证、威胁建模、隐私工程 | 一般网络知识归 `systems-networking`；普通测试方法归 `software-engineering` |
| `software-engineering` | Software Engineering | 软件工程 | 架构、设计模式、测试、代码质量、需求、维护、团队协作、项目管理与工程方法 | 具体语言或框架教程归相应语言/领域；职业求职归 `career-professional` |
| `developer-tools-automation` | Developer Tools & Automation | 开发工具与自动化 | Git、编辑器、IDE、命令行工具、构建工具、包管理、开发流程自动化 | 生产环境 CI/CD 与运维自动化归 `cloud-devops-sre` |
| `graphics-design-games` | Graphics, Design & Game Development | 图形、设计与游戏开发 | 图形学、游戏引擎、游戏开发、音视频、多媒体、UI/UX 和设计工具 | Web 页面实现归 `web-development`；计算机视觉归 `ai-data-science` |
| `blockchain-web3` | Blockchain & Web3 | 区块链与 Web3 | 区块链原理、智能合约、去中心化应用、密码经济与 Web3 工具链 | 通用密码学归 `cybersecurity-privacy`；金融分析归 `ai-data-science` 或具体上下文 |
| `career-professional` | Career & Professional Practice | 职业与专业实践 | 面试、职业发展、技术写作、自由职业、沟通、领导力与专业伦理 | 工程管理方法本身归 `software-engineering`；资源索引归 `general-meta` |
| `general-meta` | General & Meta Resources | 综合与元资源 | 真正跨领域的学习路线、资源总索引、通用入门指南与无法合理归入单一领域的元资源 | 不得作为不确定分类的兜底；无法判断时使用 `needs_review`，而不是强塞此 Topic |

## 4. Topic 判定顺序

按以下顺序判断，先满足者优先：

1. 明确资源的主要学习承诺：用户学完后主要能做什么？
2. 判断是否存在明确应用领域，如 Web、移动、AI、安全、云运维。
3. 若资源主要教授某种语言本身，才归 `programming-languages`。
4. 若主要讲计算机基础理论，归 `cs-foundations`。
5. 若主要讲工程组织、架构、测试与维护，归 `software-engineering`。
6. 仅当资源本身是跨领域索引或元学习材料时，使用 `general-meta`。
7. 证据不足时输出最高两个候选及理由，将 `reviewStatus` 设为 `needs_review`，不得猜测。

Topic 之外的相关概念放入 `tags`。标签不得用来规避“一条资源只有一个 canonical Topic”的约束。

## 5. Subcategory 规则

### 5.1 数据结构

每条资源最多有一个 canonical Subcategory，包含：

- `id`：Topic 内稳定的 kebab-case ID。
- `labelEn`：英文显示名。
- `labelZh`：中文显示名；没有可靠翻译时为 `null`。
- `aliases`：可识别的历史名、缩写或上游变体。

新 Subcategory 不应只因一条异常上游标题而创建。无法复用现有叶子分类时，应提出候选并进入人工审核。

### 5.2 清洗顺序

1. Unicode NFKC 归一化。
2. 去除首尾空格并压缩连续空白。
3. 移除 HTML anchor、Markdown 转义符和 HTML entity。
4. 移除仅用于上游目录排序的编号，如 `1.2`、`01 -`、`Chapter 3:`。
5. 移除语言前缀或后缀，如 `[EN]`、`Chinese`、`中文资源`；语言由 `lang` 表达。
6. 统一大小写、连接符和常见别名。
7. 保留具有技术语义的符号，并在 ID 中使用稳定别名。

规范化示例：

- `C\#`、`C#` → `csharp`
- `C++` → `cpp`
- `NodeJS`、`Node.js` → `node-js`
- `1.2  Machine Learning` → `machine-learning`
- `[中文] Web 开发` → `web-development`，同时由 `lang: zh` 表达语言

所有清洗前的值必须保存在 `source.originalHeadingPath`、`source.originalCategory` 和 `source.originalSubcategory` 中。

## 6. 资源语言判定

`lang` 只允许 `zh` 或 `en`，表示资源主要服务的语言语境，不等同于编程语言。

证据优先级从高到低：

1. 人工明确标记。
2. 资源页面或仓库声明的主要内容语言。
3. 正文、README、目录或课程主体的语言。
4. 上游列表的语言分区。
5. 仅根据标题推断。

规则：

- 双语资源按主要内容语言赋值，并在 `availableLanguages` 同时记录 `zh`、`en`。
- 仅根据标题判断时，`confidence.lang` 不得高于 `0.60`。
- 仅根据上游语言分区判断时，`confidence.lang` 不得高于 `0.75`；上游文件位置只能作为证据之一，不得覆盖资源页面的明确事实。
- 标题语言与上游语言分区明显冲突、且没有 metadata、README、正文或 URL 语义提供第二项证据时，`confidence.lang` 不得高于 `0.60`，并必须设为 `needs_review`。
- `languageEvidence` 必须如实列出实际使用的信号；不得把“位于中文书单”扩写成未经验证的“内容主要服务中文语境”。
- 不能确认主要语言时设为 `needs_review`。
- 主要语言既非中文也非英文的资源，不得伪装为英文进入当前 curated schema；应进入 rejected/staging 报告等待范围决策。

## 7. 摘要与证据

摘要应让用户快速理解“这是什么、能用来学什么或解决什么问题、适合谁”。摘要不是宣传文案，也不是同一 Topic 的固定模板。

允许的 `summarySource.kind`：

- `human-authored`：人工撰写。
- `source-metadata`：来自页面 metadata、官方简介或结构化信息。
- `source-readme`：来自官方 README。
- `source-content`：来自课程、书籍或文档正文/目录。
- `ai-grounded`：AI 基于已记录证据生成。
- `upstream-title-only`：只有上游标题，可保留非常有限的事实描述。
- `none`：没有足够证据，摘要为 `null`。

`ai-grounded` 必须同时记录：

- 至少一个 `evidenceRefs`。
- 使用的 `model`。
- `promptVersion`。

禁止：

- 根据 Topic 套用固定模板伪装成逐条摘要。
- 编造作者、版本、受众、质量、免费状态或学习成果。
- 把标题改写当成已经验证过内容的摘要。
- 无法访问内容时仍给出高置信度摘要。

## 8. 置信度与审核状态

`confidence` 分别记录 `topic`、`subcategory`、`lang`、`summary`，范围 `0` 到 `1`。

建议阈值：

- `0.85–1.00`：证据充分，仍需按批次规则抽样审核。
- `0.65–0.84`：可作为建议值，建议人工复核。
- `< 0.65`：必须 `needs_review`。

`reviewStatus`：

- `pending`：机器处理完成，尚未人工审核。
- `needs_review`：存在冲突、证据不足、低置信度或边界问题。
- `approved`：人工明确审核通过；AI 无权写入此状态。
- `rejected`：人工明确不收录，或不属于当前语言/集合范围。

## 9. URL 与重复项

重复判断必须区分“确定重复”和“候选重复”：

- 确定重复：规范化后的 canonical URL 相同，且不是明确不同版本/语言页面。
- 候选重复：标题高度相似、重定向到同一页面、同一内容存在镜像或协议/域名变体。
- 合法并存：不同版本、不同语言、不同格式或同一项目下内容目标不同，且对用户有独立价值。

Agent 只能输出 `duplicateCandidates` 和理由，不得自动删除、静默覆盖或跨集合合并。最终去留由人工审核决定。

## 10. 批处理与产物

推荐节奏：

1. 校准批次：20 条，覆盖不同集合、语言与 Topic。
2. 分类清洗批次：每批 40–60 条。
3. 需要读取正文并生成证据摘要的批次：每批 20–30 条。
4. 去重与质量审核：独立阶段，不与分类写入混合。

每批默认输出到 staging，不写 canonical：

- `cleaned-records.json`：符合 Schema 的建议记录。
- `needs-review.json`：低置信度、冲突或证据不足的记录。
- `duplicate-candidates.json`：疑似重复及证据。
- `rejected-records.json`：不符合输入范围的记录及原因。
- `batch-report.md`：数量、异常、置信度分布和人工决策点。

批次完成后必须停止，等待人工批准。批准动作、canonical 写入和 public 数据生成属于后续独立步骤。

## 11. 当前 Resource 字段的兼容关系

本规范中的 staging 字段与当前运行时 `Resource` 不是同一个已落地类型。后续实施时建议按以下语义映射，但不得在设计阶段直接覆盖：

| Staging 字段 | 当前字段/来源 | 处理要求 |
|---|---|---|
| `canonicalTopic` | `category` / Markdown heading | 由受控词表重新判定，保留原始 category |
| `subcategory` | `subcategory` / heading path | 清洗为稳定 ID，保留原始 subcategory |
| `lang` | `language` / 上游语言分区 | 按证据规则复核 |
| `summary` | `summary`、页面内容或 metadata | 必须记录来源，禁止模板回填 |
| `id` | staging Lineage ID | 仅作本地定位，不映射到生产 `Resource.id` |
| `productionResourceId` | `Resource.id` | 使用现有 SHA256 算法的目标生产 ID |
| `existingProductionResourceId` | 现有 `Resource.id` 查询结果 | 用于发现语言/标题/URL 改动导致的迁移风险 |
| `source.lineNumber` | Markdown 行号 | 仅作可读溯源，不能替代生产 ID |
| `source.originalHeadingPath` | `tocPath` / `taxonomy` | 保持不可变、可追溯 |
| `source.originalLine` | `originalLine` | 保持不可变、可追溯 |
| `reviewStatus` | 当前无等价字段 | 先存在 staging，不伪装成 quality |

## 12. 版本管理

- 对 Topic ID、字段语义或审核状态的破坏性调整必须提升主版本号。
- 新增兼容字段或新增 Topic 别名提升次版本号。`1.1.0` 新增了 staging 与生产 ID 的明确映射契约。
- 文字澄清和不改变语义的修订提升补丁版本号。
- `1.1.1` 明确了仅有上游分区证据及标题冲突时的语言置信度上限。
- 每个批次报告必须记录使用的 `schemaVersion` 和 `promptVersion`。
- 历史批次不得在未记录迁移的情况下按新版本静默重解释。
