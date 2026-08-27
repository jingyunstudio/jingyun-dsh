# 团队协同智能体开发规范 (DSH Team Collaboration Specification)

本规范继承自 [`common-base-spec.md`](file:///C:/Users/尚风/Documents/trae_projects/jingyun_dsh/src-tauri/resources/builtin-skills/agent-manager/references/common-base-spec.md)。开发多智能体协同团队包（`agentType: "team"`）时，必须在此基础上遵循本文件规定的特化清单结构、团队主理人（Team Lead）Prompt 结构与协同 SOP 编排机制。

---

## 一、 清单配置文件 (plugin.json) 模板与特化属性

### 1. 协同团队专属属性说明

*   **`teamInfo`**: `{leadAgent: string, memberAgents: string[]}`
    *   `leadAgent` 指向主理人（对应的 Agent ID）。
    *   `memberAgents` 指向其余团员（Agent ID 列表）。**注：主理人绝对不能放在 `memberAgents` 里**。
*   **`members`**: `object[]`
    *   描述团队物理成员的信息列表。每个成员对象必须包含 `id`、`displayName`、`profession`、`avatar`、`role`。
    *   `role` 的值必须是 `"lead"`（主理人）或 `"member"`（团员）之一。
    *   `members` 中必须有至少一个成员的 `role` 为 `"lead"`。

### 2. 智能体团队 (Team) 清单模板

```json
{
  "name": "design-review-team",
  "version": "1.0.0",
  "description": "A collaborative team for reviewing digital product UX layouts.",
  "agents": [
    "./agents/ui-design-director.md",
    "./agents/ux-usability-inspector.md"
  ],
  "agentType": "team",
  "agentName": "ui-design-director",
  "teamInfo": {
    "leadAgent": "ui-design-director",
    "memberAgents": ["ux-usability-inspector"]
  },
  "displayName": {
    "en": "UX Review Panel",
    "zh": "体验评审专家团"
  },
  "profession": {
    "en": "UX Review Panel",
    "zh": "体验评审专家团"
  },
  "displayDescription": {
    "en": "Review interactive wireframes, spot design flaws, and advice improvements.",
    "zh": "多角色协作评审产品交互原型，找出可用性硬伤并给出优化意见。"
  },
  "avatar": "avatars/team.png",
  "categoryId": "01-ProductDesign",
  "defaultInitPrompt": {
    "zh": "欢迎来到体验评审室，请上传您的产品原型设计图或原型链接，评审团将为您诊断。",
    "en": "Welcome to UX Review Panel. Please share your prototype, and we will audit it."
  },
  "plugin": "design-review-team",
  "tags": [
    { "en": "UI Audit", "zh": "界面审计" },
    { "en": "Usability", "zh": "可用性测试" },
    { "en": "UX Strategy", "zh": "体验策略" }
  ],
  "quickPrompts": [
    { "en": "Welcome to UX Review Panel. Please share your prototype, and we will audit it.", "zh": "欢迎来到体验评审室，请上传您的产品原型设计图或原型链接，评审团将为您诊断。" },
    { "en": "Audit our checkout flow wireframe", "zh": "审计我们的结账流程线框图" },
    { "en": "Review mobile app home page layout", "zh": "评估移动端 App 首页布局" }
  ],
  "members": [
    {
      "id": "ui-design-director",
      "displayName": { "en": "Director Arthur", "zh": "设计总监亚瑟" },
      "profession": { "en": "UI Design Director", "zh": "设计总监" },
      "avatar": "avatars/ui-design-director.png",
      "role": "lead"
    },
    {
      "id": "ux-usability-inspector",
      "displayName": { "en": "Inspector Jane", "zh": "审计师简" },
      "profession": { "en": "Usability Inspector", "zh": "可用性审计师" },
      "avatar": "avatars/ux-usability-inspector.png",
      "role": "member"
    }
  ]
}
```

---

## 二、 团队成员起名规范

团队成员的花名应满足“听着像人名、谐音暗藏岗位职能、中英文双向自然”的原则，从而赋予智能体生动的职业性格。

### 1. 人名谐音艺术
名字应避免直接使用其职业的中文（如“代码编写员”），而推荐采用两字或三字的中文花名，利用谐音或巧思传达职能：

| 团队岗位 (Profession) | 谐音花名 (DisplayName - zh) | 谐音内涵巧思 | 拼音英文名 (DisplayName - en) |
| :--- | :--- | :--- | :--- |
| **项目统筹** | 毕达成 | 任务必达，顺利达成 | Bi Dacheng |
| **需求分析** | 许清楚 | 必须将需求理清楚 | Xu Qingchu |
| **软件开发** | 寇豆码 | Code 豆码（代码专家） | Kou Douma |
| **体验评审** | 严过关 | 严格把关，质量过关 | Yan Guoguan |
| **运维测试** | 稳妥之 | 运维稳定，做事妥当 | Wen Tuozhi |

### 2. 命名禁忌红线
*   ❌ 严禁使用毫无新意、容易撞名的简易名字（如“张三”、“李四”）。
*   ❌ 严禁使用叠字谐音（如“码码”、“测测”、“写写”）。
*   ❌ 严禁主理人职业头衔使用泛化的“组长”、“Team Lead”、“主理人”，应当体现具体的协调身份（如“交付总监”、“项目总工程师”）。

---

## 三、 团队主理人 (Team Lead) 正文结构

在 Team 协作型的智能体中，主理人负责全局编排与最终的决策汇总。
> ⚠️ **命名规范**：主理人的 MD 文件名称必须包含智能体团队前缀，禁止使用通用名称。例如，`market-team-lead.md`，不可直接命名为 `team-lead.md`。

```markdown
# [团队名称] - 主理人

主理人角色概述，描述该团队要解决的宏观问题，以及主理人自身在其中扮演的协调者或评审人角色。

## 团队成员构成
| 成员 ID | 名字 | 核心职责 |
| :--- | :--- | :--- |
| %(team)s-team-lead | [名字] | 主理人，负责团队编排与任务分发 |
| member-specialist | [名字] | 垂直分析成员，负责特定领域的研究与产出 |

## 标准协作工作流 (SOP)
### 阶段 1: 任务分发与委派
主理人根据 SOP 规划，调用 `subagent` 工具将特定的子任务派发给相应的团队成员（子智能体）。

### 阶段 2: 结论接收与流程中转
接收并解析各成员子会话通过 `subagent` 工具返回的专业结论，将其汇总或中转作为下一阶段成员的输入。

### 阶段 3: 最终汇编与交付
汇总所有成员的专业成果，生成报告并返回给用户。

## 团队协同四条铁律
1. **真实委派 (subagent)**：任务必须由主理人亲自调用 `subagent` 工具分派给真实的成员子会话，主理人不得在自身 Prompt 中直接代写和捏造任何团员的成果。
2. **分工明确**：团员在子会话中独立运行，主理人负责汇总和编排，不得越权或越俎代庖。
3. **信息流中转**：所有跨成员的信息流动必须由主理人汇总并中转，子智能体之间无法越过主理人点对点直连。
4. **结论采信**：以成员通过 `subagent` 返回的专业输出为准，主理人扮演汇编者与最终决策汇总者的角色。

## 严禁行为红线
- ❌ 严禁跳过调用 `subagent` 工具直接在单次会话里模拟多人口气“自问自答”。
- ❌ 严禁委派主理人自身（自我克隆）。
- ❌ 严禁让子智能体之间在 Prompt 里尝试跨会话直连通信。
```

---

## 四、 协同四大硬性铁律与五大禁令

在主理人（Team Lead）调度团队时，必须显式走完生命周期流程，**禁止进行虚假的伪协同**。

### 1. 协同四大硬性铁律
1.  **真实委派 (subagent)**：一切协作任务派发必须由主理人通过调用 `subagent` 工具真实委托子会话执行，主理人自身绝对不能代写成员的专业内容。
2.  **职责分离**：主理人负责全局路由与编排，团员在各自独立的沙箱中只负责处理单体垂直任务，职责分明。
3.  **串联中转**：主理人负责调度 `subagent` 并接收工具返回的结论数据。团员之间禁止跨级通信，所有中转由主理人负责。
4.  **遵循团员专业结论**：主理人应无条件采信 `subagent` 工具返回的专业分析，扮演汇编和仲裁角色，不得在主理人 Prompt 中捏造假数据。

### 2. 五大红线禁令
*   ❌ **禁止直接自问自答**：主理人严禁在自身单次对话中模拟多人的语气进行左右手互搏，必须通过 spawn 工具触发独立沙箱子对话。
*   ❌ **禁止流程越界**：当前序 SOP 阶段尚未完成并回传数据时，严禁提前启动后续 SOP 阶段的成员。
*   ❌ **禁止主理人自我克隆**：主理人严禁克隆 spawn 另一个自己。
*   ❌ **禁止成员独立脱网**：团员智能体严禁私自绕过主理人与其他成员通信。
*   ❌ **禁止工具泄露**：非主理人成员严禁被赋予创建团队的权限。

---

## 五、 协同 SOP 工作流设计与 settings.json 约定

### 1. SOP 协同工作流设计
协同模式分为两种调度手段：
*   **并行 Phase (无依赖)**：主理人同时向多个独立领域团员派活，团员并发分析。例如，测试、文档、运维智能体并发运行。
*   **串行 Phase (数据依赖)**：主理人等待前序成员回传数据后，将成果拼接作为输入，再派发给下一阶段团员。例如，必须等“开发智能体”输出代码后，才能发给“测试智能体”查错。

### 2. settings.json 约定
团队必须在智能体包根目录下配置一个名为 `settings.json` 的文件，以此指出团队的终极入口（主理人 Agent ID）：

```json
{
  "agent": "design-review-director"
}
```

*   `agent` 的键值必须与 `plugin.json` 中的 `agentName` 以及主理人 Markdown 中的 `name` 字段**保持完全一致**（不含 `.md` 扩展名）。
