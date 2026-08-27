# 单体智能体开发规范 (DSH Single Agent Specification)

本规范继承自 [`common-base-spec.md`](file:///C:/Users/尚风/Documents/trae_projects/jingyun_dsh/src-tauri/resources/builtin-skills/agent-manager/references/common-base-spec.md)。开发单体智能体包（`agentType: "agent"`）时，必须在此基础上遵循本文件规定的特化清单结构、Prompt 正文结构和拆分原则。

---

## 一、 清单配置文件 (plugin.json) 模板

```json
{
  "name": "data-ai-cleaner",
  "version": "1.0.0",
  "description": "Clean and preprocess messy raw log files automatically.",
  "author": {
    "name": "DSH Developer",
    "email": "dev@dsh.ai"
  },
  "agents": ["./agents/data-ai-cleaner.md"],
  "agentType": "agent",
  "agentName": "data-ai-cleaner",
  "displayName": {
    "en": "Data Preprocessor",
    "zh": "数据清洗助手"
  },
  "profession": {
    "en": "Data Engineering Specialist",
    "zh": "数据工程专家"
  },
  "displayDescription": {
    "en": "Filter, structure and format raw tabular logs to structured JSON layout.",
    "zh": "自动清洗和重构原始日志，过滤杂讯，转化为干净的结构化数据。"
  },
  "avatar": "avatars/agent.png",
  "categoryId": "04-DataAI",
  "defaultInitPrompt": {
    "zh": "你好！请将需要清洗的原始文本或日志文件发给我，我来帮您进行结构化提取。",
    "en": "Hello! Please send me the raw data or logs, and I will structure them for you."
  },
  "plugin": "data-ai-cleaner",
  "tags": [
    { "en": "Data Cleaning", "zh": "数据清洗" },
    { "en": "Log Parsing", "zh": "日志解析" },
    { "en": "Format conversion", "zh": "格式转换" }
  ],
  "quickPrompts": [
    { "en": "Hello! Please send me the raw data or logs, and I will structure them for you.", "zh": "你好！请将需要清洗的原始文本或日志文件发给我，我来帮您进行结构化提取。" },
    { "en": "Parse this Apache log file", "zh": "解析这个 Apache 访问日志" },
    { "en": "Extract emails from messy text", "zh": "从杂乱文本中提取电子邮件" }
  ]
}
```

---

## 二、 普通智能体/团队成员正文结构

正文应使用清晰的 Markdown 标题，描述智能体的运作方式：

```markdown
# 角色名称 - 成员姓名

对该智能体的定位进行一句话背景描述，说明其擅长处理的具体工作。

## 1. 核心能力
- **[能力项A]**：对核心能力的具体描述。
- **[能力项B]**：对核心能力的具体描述。

## 2. 工作流程
1. **[第一阶段]**：工作流起始的处理细节。
2. **[第二阶段]**：中间核心的处理细节。
3. **[第三阶段]**：最终整理与校验。

## 3. 输出规范
- **[规范条目1]**：例如“所有的代码必须以 markdown 格式包裹”。
- **[规范条目2]**：例如“对于结论必须在段首以加粗字样明确给出”。

## 4. 约束条件 (注意事项)
- 仅支持处理特定领域的数据，严禁越界进行跨行业判断。
- 必须遵循的特定参数上限和下限。
```

> [!NOTE]
> 如果该智能体作为**协同团队中的子智能体 (subagent)** 被调度，其最终输出必须保证核心结论清晰明确，并且直接以文本形式返回，以便调用者（主理人）自动获取和解析其返回值。

---

## 三、 智能体拆分原则

在规划智能体包时，判定某个功能是否应当作为一个独立的智能体文件存在，可以使用**“可提问度”**原则：
*   **独立 Agent**：是否有用户可能针对此部分内容发起单独的、直接的提问？（如“帮我写个营销方案”，它就需要一个独立的 marketing-agent）。
*   **归并/技能化**：如果它只是 SOP 流程中的一个辅助处理工具（如只负责将 Markdown 转换为 Word），则无需作为 Agent 独立存在，应当设计为 `Skill` 挂载在主智能体上。
