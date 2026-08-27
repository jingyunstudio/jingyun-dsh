# 智能体包基础通用规范 (DSH Common Base Specification)

本规范定义了智能体开发中单智能体（Agent）与多体协同团队（Team）均必须共同遵循的基础底层规则，包括配置清单基本元数据、提示词 Frontmatter YAML 格式以及头像 Icon 技术规格。

---

## 一、 清单配置文件 (plugin.json) 基础属性字段

每个智能体包的元数据目录 `.dsh-plugin/`（或同等兼容目录）下必须含有一个名为 `plugin.json` 的核心清单文件，用以描述智能体包的加载信息与上架元数据。

### 1. 基础必备描述

| 字段名 | 类型 | 校验规则与说明 |
| :--- | :--- | :--- |
| `name` | string | **核心标识**。必须采用 kebab-case 格式（仅包含小写字母、数字和连字符，长度至少为 2，不能以连字符开头或结尾）。 |
| `version` | string | **版本号**。必须遵循 SemVer 语义化规范（例如 `1.0.0`）。 |
| `description` | string | **英文一句话描述**。用以向系统汇报该插件包的大致作用。 |

### 2. 展示与市场分发元数据

| 字段名 | 类型 | 校验规则与说明 |
| :--- | :--- | :--- |
| `displayName` | object | `{en, zh}`。智能体的前台卡片显示名称，不可为空。 |
| `profession` | object | `{en, zh}`。职业头衔/业务角色。**注：若为 Team 类型，该项必须与 displayName 的对应语言保持完全一致**。 |
| `displayDescription` | object | `{en, zh}`。**中文建议在 30~60 字以内**，描述核心本领。 |
| `avatar` | string | **头像相对路径**。例如指向 `avatars/agent.png` |
| `categoryId` | string | 行业分类。用于声明智能体所属的业务领域（如：产品设计、技术工程等）。 |
| `defaultInitPrompt` | object | `{en, zh}`。对话初次打招呼的引导语。**必须与 `quickPrompts[0]` 保持完全一致**。 |
| `tags` | array | **领域标签**。格式为 `{en, zh}[]`，**数量必须不多不少刚好 3 个**。 |
| `quickPrompts` | array | **推荐提示词**。格式为 `{en, zh}[]`，**数量必须不多不少刚好 3 个**。 |
| `plugin` | string | **插件包名字**。其值必须与上面的 `name` 字段保持完全一致。 |

### 3. 加载与类型声明

| 字段名 | 类型 | 校验规则与说明 |
| :--- | :--- | :--- |
| `agentType` | string | **智能体包类别**。必须是 `"agent"`（单智能体）或 `"team"`（多角色协作团队）两者之一。 |
| `agentName` | string | **主智能体名称**。对应 `agents/` 下的主 Markdown 文件名（不含 `.md` 扩展名），且该文件必须真实存在。 |
| `agents` | array | **文件挂载列表**。智能体包内所有可用 Markdown 定义文件的相对路径列表（例如 `["./agents/main.md"]`）。 |
| `skills` | array | （可选）包内挂载的内置技能目录的路径列表（如 `["./skills/data-parse"]`）。 |

---

## 二、 提示词 Markdown Frontmatter (头部元数据声明)

每个 Markdown 文件的顶部必须以 `---` 包裹的 YAML 元数据作为 frontmatter，声明智能体的基础属性。

### 🚨 绝对红线：严禁声明 `tools` 字段
> [!CAUTION]
> 智能体包的工具调用权限是由平台与系统层统一分配和分发的。开发者**绝对不能**在 frontmatter 中声明 `tools` 属性，声明该属性将导致智能体合规校验失败。

### 1. 核心必填字段
```yaml
---
name: user-interaction-agent       # 唯一名称，须与文件名保持一致，使用 kebab-case
description: "DSH interaction agent to handle direct user text prompt queries." # 英文描述，用于分发引擎进行智能调度
displayName:
  en: "Interaction Agent"
  zh: "交互智能体"
profession:
  en: "User Experience Architect"
  zh: "用户体验架构师"
maxTurns: 60                      # 智能体单次调度的最大对话轮数（推荐单智能体设置为 50-80）
---
```

### 2. 可选元数据字段
```yaml
skills:                           # 预加载技能名称列表，供智能体加载额外的工具包
  - fs
  - web-search
```

---

## 三、 智能体视觉标识 (Icon) 设计与生成规范

为了保证智能体市场视觉质量的统一，所有智能体或智能体团队包中的头像/icon 资产必须遵循本设计规范。

### 1. Icon 资产技术规格

| 指标 | 标准要求 | 说明 |
| :--- | :--- | :--- |
| **文件格式** | PNG（推荐，支持透明通道）或 JPG | 必须清晰且无杂色边框 |
| **图像尺寸** | 256×256 px | 正方形比例 |
| **文件大小** | 单张图片 $\le$ 200 KB | 避免大图导致页面加载卡顿 |
| **生成工具** | 建议使用 AI 绘图工具（如 Midjourney、DALL-E 等） | 提示词中设置 size 为 `512x512`，输出后下采样为 256×256 px |

### 2. 智能体 Icon 配置策略

*   **单智能体 (Agent)**: 
    *   在 `avatars/` 文件夹下放置一张图片，一般命名为 `agent.png`。
*   **智能体团队 (Team)**: 
    *   在 `avatars/` 文件夹下放置 **N + 1** 张头像。
    *   `avatars/team.png`：团队整体视觉图标或合照。
    *   `avatars/{team}-team-lead.png`：主理人专属头像。
    *   `avatars/{member-id}.png`：其余每个团员的专属头像。

### 3. 高质量图像 Prompt 组装公式

所有的 Icon 提示词应该基于智能体自身的 Markdown 定义文件中的文字进行推导，拒绝套用千篇一律的模板。组装提示词的公式如下：

```text
[风格锚定前缀] + [主体身份描述] + [专业视觉符号] + [神态与气质] + [背景色描述] + [质量控制后缀]
```

#### ① 核心要素拆解
*   **主体身份描述**：从 Markdown 文件的核心定位提取。例如 `a male quantum developer`。
*   **专业视觉符号**：从“核心能力”提取可以具象化的物品。如 `wearing a lab coat, holding a quantum processor chip`。
*   **神态与气质**：结合“工作流程”中的特点。如 `showing a precise, analytical and visionary expression`。

#### ② 团队风格一致性准则
对于 `Team` 类型的智能体包，团队内所有成员 of 头像必须共用完全相同的风格锚定前缀与质量控制后缀，仅更改主体描述和视觉符号，以保证在前端卡片展示时具有统一的画风。

*   **统一前缀示例**：
    ```text
    Professional cartoon-style illustration avatar, consistent art style, clean lighting, soft ambient occlusion shadows,
    ```
*   **统一质量后缀示例**：
    ```text
    Bust shot, facing forward. High quality, professional portfolio icon.
    ```

### 4. 操作发布工作流

1. **解析描述**：读取智能体的 Markdown 属性。
2. **构建提示词**：按照上述公式，拼接成完整的英文 Prompt。
3. **图像生成**：调用 AI 绘图工具，设置尺寸为 `512x512`。
4. **归档存放**：保存至智能体包根目录下的 `avatars/` 中，并配置在 `plugin.json` 中的 `avatar` 字段上。
