#!/usr/bin/env python3
"""
DSH Agent Package Initializer - Creates a structured agent or team template.
"""

import sys
import json
import os
import re
import argparse
from pathlib import Path

# Fix Windows console UTF-8 printing
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


# Config template variables for single Agent
AGENT_MANIFEST_TEMPLATE = """{
  "name": "%(name)s",
  "version": "1.0.0",
  "description": "[TODO: Brief English description of this agent's duty]",
  "author": {
    "name": "[TODO: author name]",
    "email": "[TODO: author email]"
  },
  "agents": ["./agents/%(agent_name)s.md"],
  "agentType": "agent",
  "agentName": "%(agent_name)s",
  "displayName": {
    "en": "%(display_name_en)s",
    "zh": "%(display_name_zh)s"
  },
  "profession": {
    "en": "%(profession_en)s",
    "zh": "%(profession_zh)s"
  },
  "displayDescription": {
    "en": "[TODO: English detailed capability summary]",
    "zh": "[TODO: 中文详细描述，要求在 40-50 字之内]"
  },
  "avatar": "avatars/agent.png",
  "categoryId": "%(category_id)s",
  "defaultInitPrompt": {
    "zh": "[TODO: 中文首次对话打招呼引导语]",
    "en": "[TODO: English greeting and first prompt instruction]"
  },
  "plugin": "%(name)s",
  "tags": [
    { "en": "[TODO: Tag1]", "zh": "[TODO: 标签1]" },
    { "en": "[TODO: Tag2]", "zh": "[TODO: 标签2]" },
    { "en": "[TODO: Tag3]", "zh": "[TODO: 标签3]" }
  ],
  "quickPrompts": [
    { "en": "[TODO: Prompt1, must equal defaultInitPrompt.en]", "zh": "[TODO: 提示词1，须同defaultInitPrompt.zh]" },
    { "en": "[TODO: Prompt2]", "zh": "[TODO: 提示词2]" },
    { "en": "[TODO: Prompt3]", "zh": "[TODO: 提示词3]" }
  ]
}
"""

# Config template variables for Team
TEAM_MANIFEST_TEMPLATE = """{
  "name": "%(name)s",
  "version": "1.0.0",
  "description": "[TODO: English description of this collaborative team]",
  "author": {
    "name": "[TODO: author name]",
    "email": "[TODO: author email]"
  },
  "agents": [
    "./agents/%(team)s-team-lead.md",
    "./agents/[TODO: member-a].md"
  ],
  "agentType": "team",
  "agentName": "%(team)s-team-lead",
  "teamInfo": {
    "leadAgent": "%(team)s-team-lead",
    "memberAgents": ["[TODO: member-a]"]
  },
  "displayName": {
    "en": "%(display_name_en)s",
    "zh": "%(display_name_zh)s"
  },
  "profession": {
    "en": "%(profession_en)s",
    "zh": "%(profession_zh)s"
  },
  "displayDescription": {
    "en": "[TODO: English summary of team coordination]",
    "zh": "[TODO: 中文团队描述，建议在 40-50 字内]"
  },
  "avatar": "avatars/team.png",
  "categoryId": "%(category_id)s",
  "defaultInitPrompt": {
    "zh": "[TODO: 中文首次对话引导语]",
    "en": "[TODO: English team introduction prompt]"
  },
  "plugin": "%(name)s",
  "tags": [
    { "en": "[TODO: Tag1]", "zh": "[TODO: 标签1]" },
    { "en": "[TODO: Tag2]", "zh": "[TODO: 标签2]" },
    { "en": "[TODO: Tag3]", "zh": "[TODO: 标签3]" }
  ],
  "quickPrompts": [
    { "en": "[TODO: Prompt1, same as defaultInitPrompt.en]", "zh": "[TODO: 提示词1，同defaultInitPrompt.zh]" },
    { "en": "[TODO: Prompt2]", "zh": "[TODO: 提示词2]" },
    { "en": "[TODO: Prompt3]", "zh": "[TODO: 提示词3]" }
  ],
  "members": [
    {
      "id": "%(team)s-team-lead",
      "displayName": { "en": "%(display_name_en)s", "zh": "%(display_name_zh)s" },
      "profession": { "en": "%(profession_en)s", "zh": "%(profession_zh)s" },
      "avatar": "avatars/%(team)s-team-lead.png",
      "role": "lead"
    },
    {
      "id": "[TODO: member-a]",
      "displayName": { "en": "[TODO]", "zh": "[TODO]" },
      "profession": { "en": "[TODO]", "zh": "[TODO]" },
      "avatar": "avatars/[TODO: member-a].png",
      "role": "member"
    }
  ]
}
"""

AGENT_PROMPT_TEMPLATE = """---
name: %(agent_name)s
description: "[TODO: English description helping dispatcher logic to assign queries]"
displayName:
  en: "%(display_name_en)s"
  zh: "%(display_name_zh)s"
profession:
  en: "%(profession_en)s"
  zh: "%(profession_zh)s"
maxTurns: 50
---

# %(display_name_zh)s - %(name)s

[TODO: 对该智能体的定位进行一句话背景描述]

## 核心能力
1. **[TODO: 能力1]**：[TODO: 能力1的具体阐述]
2. **[TODO: 能力2]**：[TODO: 能力2的具体阐述]

## 工作流程
1. [TODO: 工作步骤1]
2. [TODO: 工作步骤2]

## 输出规范
- [TODO: 例如要求提供 markdown 数据结构]

## 注意事项
- [TODO: 约束边界与红线规则]
"""

LEAD_PROMPT_TEMPLATE = """---
name: %(team)s-team-lead
description: "[TODO: English description helping dispatcher to engage this team lead]"
displayName:
  en: "%(display_name_en)s"
  zh: "%(display_name_zh)s"
profession:
  en: "%(profession_en)s"
  zh: "%(profession_zh)s"
maxTurns: 150
---

# %(display_name_zh)s - 主理人

[TODO: 描述主理人如何分发、中转与审查最终交付成果]

## 团队成员构成
| 成员 ID | 名字 | 核心职责 |
| :--- | :--- | :--- |
| %(team)s-team-lead | %(display_name_zh)s | 编排与总协调 |
| [TODO: member-a] | [TODO: 成员花名] | [TODO: 垂直领域产出者] |

## 标准协作工作流 (SOP)
### 阶段 1: [TODO: 阶段名]
[TODO: 任务分发与数据录入]

### 阶段 2: [TODO: 阶段名]
[TODO: 数据流转与中继审查]

### 阶段 3: 最终报告
汇编成员智能体的产出并进行最终润色交付。

## 团队协同四条铁律
1. **真实委派 (subagent)**：任务必须由主理人亲自调用 `subagent` 工具分派给真实的成员子会话，主理人不得在自身 Prompt 中直接代写和捏造任何团员的成果。
2. **分工明确**：团员在独立子会话中运行，主理人负责汇总和编排，不得代笔或代劳。
3. **信息流中转**：所有跨成员的信息流动必须由主理人进行汇总并中转，子会话成员之间禁止直接跨会话通信。
4. **结论采信**：以成员通过 `subagent` 返回的专业输出为准，主理人扮演汇编者与最终决策汇总者的角色。

## 严禁行为红线
- ❌ 严禁跳过调用 `subagent` 工具直接在单次会话里模拟多人口气“自问自答”。
- ❌ 严禁委派主理人自身进行自我克隆。
- ❌ 严禁让子智能体在 Prompt 里尝试进行跨会话直连通信。
"""

MEMBER_PROMPT_TEMPLATE = """---
name: [TODO: member-id]
description: "[TODO: English description for inner dispatcher logic]"
displayName:
  en: "[TODO: Member Name]"
  zh: "[TODO: 成员显示名]"
profession:
  en: "[TODO: Member Profession]"
  zh: "[TODO: 成员职业头衔]"
maxTurns: 50
---

# [TODO: 角色名称] - [TODO: 团员人名]

[TODO: 团员定位与背景说明]

## 核心能力
1. **[TODO: 能力1]**：[TODO: 详细说明]

## 工作流程
1. [TODO: 处理步骤A]

## 输出规范
- [TODO: 输出排版要求]

## 最终结论输出
完成分析后，**必须将最终结论以清晰的文本格式在输出最后明确给出**，以便主理人通过 subagent 调用直接获取你的返回值。
"""

SETTINGS_JSON_TEMPLATE = '{\n  "agent": "%(team)s-team-lead"\n}\n'

README_TEMPLATE = """# %(title)s

%(description)s

## 智能体类型
- %(agent_type_desc)s

## 核心职责说明
[TODO: 阐述智能体团队或单体的业务价值与服务方向]

## 头像 Icon 资产说明
头像已默认在 `avatars/` 中被初始化。如需替换，请保证：
- 格式：PNG 或 JPG
- 尺寸：256x256 px
- 单张体积：不超过 200KB

## 安装与部署
将整个目录部署在 DSH 的配置路径下：
```text
%(install_dir)s/%(name)s
```

运行下述命令以检测与完成本地注册：
```bash
python3 scripts/register_agent_manifest.py <agent-dir-path>
```
"""

def parse_dsh_env_path():
    """Extract DSH config path from environment, fallback to ~/.dsh."""
    config_dir = os.environ.get('DSH_CONFIG_DIR', '').strip()
    if not config_dir:
        config_dir = os.path.join(os.path.expanduser('~'), '.dsh')
    return Path(config_dir) / 'plugins' / 'marketplaces' / 'my-agents' / 'plugins'

def to_title_case(kebab_str):
    """Convert kebab-case string into Title Case words."""
    return ' '.join(token.capitalize() for token in kebab_str.split('-'))

def create_single_agent(root_dir, name, default_install_path, render_ctx):
    """Establish files for single Agent type package."""
    # Write .dsh-plugin/plugin.json
    meta_dir = root_dir / '.dsh-plugin'
    meta_dir.mkdir(parents=True, exist_ok=True)
    with open(meta_dir / 'plugin.json', 'w', encoding='utf-8') as f:
        f.write(AGENT_MANIFEST_TEMPLATE % render_ctx)
    print("  [+] Created metadata configuration: .dsh-plugin/plugin.json")

    # Write agents/name.md
    agents_dir = root_dir / 'agents'
    agents_dir.mkdir(parents=True, exist_ok=True)
    with open(agents_dir / f'{name}.md', 'w', encoding='utf-8') as f:
        f.write(AGENT_PROMPT_TEMPLATE % render_ctx)
    print(f"  [+] Created agent prompt file: agents/{name}.md")

    # Setup avatars directory
    avatars_dir = root_dir / 'avatars'
    avatars_dir.mkdir(parents=True, exist_ok=True)
    (avatars_dir / '.gitkeep').touch()
    print("  [+] Configured avatars folder.")

    # Write README.md
    with open(root_dir / 'README.md', 'w', encoding='utf-8') as f:
        f.write(README_TEMPLATE % {
            'title': to_title_case(name),
            'description': '[TODO: 一句话描述智能体核心本领]',
            'agent_type_desc': 'Agent型（单角色独立智能体）',
            'name': name,
            'install_dir': str(default_install_path)
        })
    print("  [+] Wrote README.md layout.")

def create_team_agent(root_dir, name, default_install_path, render_ctx):
    """Establish files for collaborative Team type package."""
    # Write .dsh-plugin/plugin.json
    meta_dir = root_dir / '.dsh-plugin'
    meta_dir.mkdir(parents=True, exist_ok=True)
    with open(meta_dir / 'plugin.json', 'w', encoding='utf-8') as f:
        f.write(TEAM_MANIFEST_TEMPLATE % render_ctx)
    print("  [+] Created metadata configuration: .dsh-plugin/plugin.json")

    # Write agents/name-team-lead.md and placeholder member
    agents_dir = root_dir / 'agents'
    agents_dir.mkdir(parents=True, exist_ok=True)
    with open(agents_dir / f'{name}-team-lead.md', 'w', encoding='utf-8') as f:
        f.write(LEAD_PROMPT_TEMPLATE % render_ctx)
    print(f"  [+] Created team lead prompt file: agents/{name}-team-lead.md")

    with open(agents_dir / 'member-placeholder.md', 'w', encoding='utf-8') as f:
        f.write(MEMBER_PROMPT_TEMPLATE)
    print("  [+] Created member template: agents/member-placeholder.md")

    # Setup avatars directory
    avatars_dir = root_dir / 'avatars'
    avatars_dir.mkdir(parents=True, exist_ok=True)
    (avatars_dir / '.gitkeep').touch()
    print("  [+] Configured avatars folder.")

    # Write settings.json
    with open(root_dir / 'settings.json', 'w', encoding='utf-8') as f:
        f.write(SETTINGS_JSON_TEMPLATE % render_ctx)
    print("  [+] Created settings.json reference.")

    # Write README.md
    with open(root_dir / 'README.md', 'w', encoding='utf-8') as f:
        f.write(README_TEMPLATE % {
            'title': to_title_case(name),
            'description': '[TODO: 一句话描述智能体团队协同目标]',
            'agent_type_desc': 'Team型（多智能体协作团队）',
            'name': name,
            'install_dir': str(default_install_path)
        })
    print("  [+] Wrote README.md layout.")

def main():
    parser = argparse.ArgumentParser(
        description="Initialize a new DSH Agent or Team package template under correct workspace path."
    )
    parser.add_argument("name", help="Name of the agent/team package (must be kebab-case)")
    parser.add_argument("--type", choices=["agent", "team"], required=True, help="Agent packaging type")
    parser.add_argument("--path", required=True, help="Target directory for generating this package")
    
    # Metadata parameters for optional rendering
    parser.add_argument("--display-name-zh", help="Display name in Chinese")
    parser.add_argument("--display-name-en", help="Display name in English")
    parser.add_argument("--profession-zh", help="Profession title in Chinese")
    parser.add_argument("--profession-en", help="Profession title in English")
    parser.add_argument("--category-id", help="Category ID (e.g. 02-Engineering)")

    args = parser.parse_args()
    
    # 1. Name kebab-case regex validation
    if len(args.name) < 2 or not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$', args.name):
        print(f"Error: Target package name '{args.name}' violates kebab-case policy (letters/numbers/hyphen).")
        sys.exit(1)
        
    # 2. Directory validity checks
    env_install_path = parse_dsh_env_path()
    passed_dir = Path(args.path).expanduser().resolve()
    if not passed_dir.exists() or not passed_dir.is_dir():
        print(f"Error: Target path does not exist or is not a folder: {passed_dir}")
        sys.exit(1)
        
    target_package_dir = passed_dir / args.name
    if target_package_dir.exists():
        print(f"Error: The target directory already exists: {target_package_dir}")
        sys.exit(1)

    print(f"Initializing new DSH {args.type.upper()} package: {args.name}...")
    print(f"Target location: {target_package_dir}\n")

    # Build rendering context
    render_ctx = {
        'name': args.name,
        'agent_name': args.name,
        'team': args.name,
        'display_name_zh': args.display_name_zh or "[TODO: 中文显示名称]",
        'display_name_en': args.display_name_en or "[TODO: English display name]",
        'profession_zh': args.profession_zh or "[TODO: 中文职业头衔]",
        'profession_en': args.profession_en or "[TODO: English profession title]",
        'category_id': args.category_id or "[TODO: 01-ProductDesign / 02-Engineering / ...]"
    }
    
    try:
        target_package_dir.mkdir(parents=True)
        if args.type == 'agent':
            create_single_agent(target_package_dir, args.name, env_install_path, render_ctx)
        else:
            create_team_agent(target_package_dir, args.name, env_install_path, render_ctx)
            
        print(f"\nSuccess: Agent package '{args.name}' ({args.type}) has been successfully created!")
        print("Follow-up steps:")
        print("  1. Open and fill in all [TODO] placeholder details within the package.")
        print("  2. Place avatar icon files into 'avatars/' (consult references/common-base-spec.md).")
        print("  3. Validate the layout: python3 scripts/check_agent_rules.py <package-path>")
        print("  4. Install it locally: python3 scripts/install_agent.py <package-path>")
        sys.exit(0)
    except Exception as e:
        print(f"Error initializing template package: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
