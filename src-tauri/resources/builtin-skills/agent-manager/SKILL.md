---
name: agent-manager
description: |
  智能体包的全生命周期运营管理：包括模板初始化、外部资料转换为智能体包、修改既有智能体、合规校验、批量注册和打包。
  触发词：创建智能体、转化智能体、生成智能体包、导入智能体、convert agent、修改智能体、编辑智能体、更新智能体、modify agent、检查智能体、审查智能体包、智能体合规、智能体运营、agent ops、智能体管理器。
---

# 智能体包管理器

> ⚠️ **执行指南**：作为 AI 助手，在需要使用或修改本技能时，你必须首先从头至尾完整阅读并理解本 `SKILL.md` 约定的逻辑铁律、执行流程以及参考列表，然后才开始处理。禁止跳读或凭感觉臆测。

你是 DSH 智能体包管理器，负责协助用户根据 DSH 智能体开发规范（v3.0）编写、校验并注册符合市场上架规范的智能体文件包。

智能体包包含以下两种类型：
- **Agent 型**（`agentType: "agent"`）：执行单一专业任务的独立智能体。
- **Team 型**（`agentType: "team"`）：基于 SOP 编排的多智能体协同工作团队。

提供下述三种交互场景：
1. **交互引导模式**：优先调用 `ask_user_question` 工具通过问答表单形式收集必要属性后生成模版。
2. **文档资料转化模式**：用户粘贴已有的提示词或工作规范，你负责将其分析并重构为标准智能体包。
3. **编辑修改模式**：对已经生成的智能体进行局部字段或 prompt 内容的更新，并重新校验注册。

---

## 属性字段映射标准

所有智能体必须在清单文件 `.dsh-plugin/plugin.json` 中配置以下属性：

| 展示属性 | 清单映射字段 | 校验与约束规则 |
| :--- | :--- | :--- |
| **智能体名称** | `displayName`（`{en, zh}`） | 前台展示花名（如：许清楚 / Xu Qingchu） |
| **职业头衔** | `profession`（`{en, zh}`） | 指出其核心岗位。**注意：Team 型该属性必须与 displayName 保持完全相同**。 |
| **工作类别** | `agentType` | `"agent"`（单体）或 `"team"`（团队）。**根据文件结构自动判定，禁止臆造**。 |
| **所属行业** | `categoryId` | 用于声明智能体所属的业务领域（如：产品设计、技术工程等）。 |
| **能力介绍** | `displayDescription`（`{en, zh}`） | **中文建议在 30~60 字以内**，一针见血说明其能解决什么核心问题。 |
| **领域标签** | `tags`（`{en, zh}[]`） | **不多不少刚好 3 个**，用于 market 过滤。 |
| **试试这样问我** | `quickPrompts`（`{en, zh}[]`） | **不多不少刚好 3 个**。第一条必须与 `defaultInitPrompt` 的中英文保持完全一致。 |

---

## 工作流程

### 流程一：新建/转化流程
```mermaid
graph TD
    A[收集信息/分析资料] --> B[调用 create_agent_template.py 初始化目录]
    B --> C[AI 生成 Prompt 正文与 plugin.json 细节]
    C --> D[提示或调用 AI 绘图工具生成 avatars]
    D --> E[运行 check_agent_rules.py 合规性校验]
    E -- 校验通过 --> F[运行 install_agent.py 本地热安装]
    E -- 校验失败 --> G[提示用户修复问题]
    F --> H[运行 pack_agent_zip.py 就地打包]
```

### 流程二：修改已有智能体
当用户要求编辑/修改/升级已存在的智能体时：
1. **定位并读取**：在智能体输出目录下找到对应文件夹（如 `data-cleaner`），读取其 `.dsh-plugin/plugin.json` 及 `agents/` 下的 MD 文件。
2. **确认修改意图**：询问用户具体要修改哪个字段（如：修正提示词、替换标签、新增团队成员）。
3. **精准修改**：直接编辑对应文件，**严禁重写不相干的文件**。
4. **运行校验**：运行 `python3 scripts/check_agent_rules.py <agent-dir>` 确认没有引入合规性错误。
5. **重载热安装**：无论修改什么字段，都必须重新驱动热同步安装：`python3 scripts/install_agent.py <agent-dir> --session-id ${DSH_SESSION_ID}`。

> 🚨 **修改红线**：
> - 严禁原地修改 `.dsh-plugin/plugin.json` 中的 `name` 字段、`agentName` 字段以及外层目录名称，这些是智能体的唯一主键。
> - 如果需要更改这些主键，必须重新调用初始化流程，不支持原地改名。
## 私有技能 (Skills) 装载与协同创建流

智能体包可以通过 `plugin.json` 中的 `skills` 字段声明并预加载特定的技能工具包，但这并非必选项。当智能体确实需要使用特定领域的专业工具（如特定的 Python 执行脚本、专有资产读取）时，AI 助手应当遵循下述协同决策流程：

1. **先搜索、后复用**：
   - AI 助手在生成或重构智能体前，应当先在工作区或内置技能库中搜索是否存在已有类似技能（如已有的 web 抓取、代码格式化工具等）。
   - 若已有可重用技能，AI 助手应当直接在 `.dsh-plugin/plugin.json` 的 `skills` 数组中添加其相对路径进行挂载声明，**严禁重复开发职责相似的技能**。
2. **主动沟通与确认**：
   - 若系统中确实不存在类似的技能，且该智能体确实必须依赖专用 deterministic 工具，AI 助手**必须首先向用户说明原因，并明确询问用户是否同意为其创建一个全新的私有技能**。
3. **调用 `skill-creator` 规范创建**：
   - 经用户显式同意后，AI 助手在“创建技能”时，**必须严格调用并执行 `skill-creator` 内置技能下的工具规范与创建流程**：
     - 调用 `skill-creator` 里的 `scripts/init_skill.py` 脚本，在当前智能体包的 `skills/` 子目录下初始化技能包模板。
     - 严格遵循 `skill-creator` 中的 `SKILL.md` 提示词骨架与 `scripts/` 约束来填充编写该私有技能。

---

## 核心开发红线 (铁律)

1.  **路径合规性**：智能体包必须生成在当前对话指定的工作区路径下。允许并在任意由用户在 UI 挂载并选择的对话工作区目录内进行创建或修改。
2.  **Frontmatter 限制**：在生成或转化 `agents/*.md` 文件时，**frontmatter 中绝对不能声明 `tools` 属性**。所有的工具均由系统配置。
3.  **元数据隔离**：`agents/`、`skills/`、`bin/` 和 `avatars/` 文件夹必须存放在智能体包根目录下，**绝对不能**放到隐藏的 `.dsh-plugin/` 目录中。
4.  **数量刚好**：`tags` 和 `quickPrompts` 数组的长度必须**正好是 3**。
5.  **多包顺序热安装**：如需处理多个智能体包，必须按顺序跑完 `create_agent_template -> check_agent_rules -> install_agent` 完整串行流。
6.  **内置 Python 环境使用**：在运行 Python 脚本时，你必须优先使用内置的便携 Python 解释器。在 Windows 系统下的物理绝对路径为：
    `%LOCALAPPDATA%\com.jingyun.dstudio\vendor\python\python.exe`
    只有当该绝对路径不存在时，才降级使用普通的全局 `python` 或 `python3` 命令。

---

## 规范与脚本参考

在执行本技能时，请结合以下参考资料：
- `references/common-base-spec.md` — 基础核心与头像资产通用规范
- `references/single-agent-spec.md` — 单智能体清单与提示词编写规范
- `references/team-collaboration-spec.md` — 团队协同编排机制与 SOP 规范
- `scripts/create_agent_template.py` — 初始化模版脚本
- `scripts/check_agent_rules.py` — 规则合规校验脚本
- `scripts/install_agent.py` — 本地热同步安装脚本
- `scripts/pack_agent_zip.py` — ZIP 就地打包归档脚本
