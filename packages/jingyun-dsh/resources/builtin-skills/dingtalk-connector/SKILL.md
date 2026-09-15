---
name: dingtalk-connector
description: |
  向钉钉（DingTalk）发送消息、单聊私信、群聊通知、汇总报表或提醒。支持纯文本与 Markdown 格式。
  触发词：发送钉钉、发送到钉钉、发给我自己钉钉、钉钉通知、钉钉群消息、钉钉单聊、dingtalk send、dws chat。
---

# 钉钉消息发送与协同技能 (dingtalk-connector)

本技能用于在智能体完成分析、总结、开发进展汇报或用户要求通知时，通过已授权就绪的钉钉官方工作区套件（`dws` CLI）执行消息推送、群聊协同与组织生态交互。

## 核心工作流与标准命令

系统已在后台配置好环境变量与鉴权凭据，AI 请直接在终端调用官方 `dws` 命令行套件完成操作：

### 1. 发送单聊私信（发给自己或指定同事）
使用快捷命令 `+dm`。**非交互环境必须带上 `--yes` 参数确认发送**：
```bash
dws chat +dm --to "<目标姓名或花名>" --content "消息内容（支持 Markdown）" --yes
```
> **示例（发给当前登录用户或同事）**：
> ```bash
> dws chat +dm --to "asuka" --content "### 📊 今日开发进展汇报\n- **核心功能**：钉钉连接器命令已优化\n- **状态**：正常送达" --yes
> ```

### 2. 发送群聊消息
向指定群发送消息（同样必须带 `--yes`）：
```bash
dws chat +send-to-group --group "<群名称>" --content "消息内容" --yes
```

### 3. 查看最近 @我 的消息
```bash
dws chat +at-me
```

### 4. 检查当前授权与账号身份
查看当前登录的用户身份、组织和 CorpId：
```bash
dws profile list --format json
```

---

## 关键避坑与沙箱执行规范

1. **必须附带 `--yes` 参数**：
   - 钉钉官方 CLI 在非交互式 Agent 环境下要求显式确认。若漏传 `--yes`，CLI 会直接终止并报 `confirmation_required` 错误。
2. **沙箱模式（`workspace-write`）处理**：
   - DSH 默认的沙箱策略只允许写当前会话的工作区。
   - `dws` 运行时需读写连接器数据锁文件（位于工作区外）。若终端报错 `failed to migrate profiles: acquiring file lock: ... Access is denied.`，请在调用工具（如 `pwsh` / `bash`）时显式提供 `sandbox_permissions: "danger-full-access"`，并说明理由为读取钉钉连接器身份/发送消息。
3. **严禁臆造不存在的命令与参数**：
   - ❌ 错误参数：`dws chat +send-to --user "xxx"`（不存在该子命令，会导致 `ambiguous_command_fallback` 报错）
   - ✅ 正确命令：`dws chat +dm --to "xxx" --content "xxx" --yes`
4. **命令不确定时先查帮助**：
   - 若对参数有疑问，先执行 `dws chat +dm --help` 查看真实参数签名。
