---
name: wecom-connector
description: |
  向企业微信（WeCom）发送消息、工作通知、汇总报表或提醒。支持单聊和群聊，支持纯文本与 Markdown 格式。
  触发词：发送企业微信、发送到企微、企微通知、通过企业微信发送、企业微信报表、发给我自己企微、企微群消息、wecom send。
---

# 企业微信消息发送技能 (wecom-connector)

本技能用于在智能体完成分析、总结、报表生成或用户要求通知时，通过已授权的企业微信连接器将内容实时推送至企业微信手机端或桌面端。

## 适用场景

1. **工作简报与成果通知**：将代码审查总结、每日/每周工作总结、数据分析结果发送到企业微信。
2. **事件告警与状态提醒**：任务处理完成、自动化构建成功或发生错误时推送即时告警。
3. **日常互动**：用户明确要求“把这段内容发到企业微信给我自己”或“通知企业微信群”。

## 执行工作流

AI 请直接调用内置执行脚本向已连接的企业微信服务发送消息：

### 1. 发送 Markdown 富文本消息（推荐格式）
```bash
python scripts/send_message.py --content "### 📊 本周任务进展汇报\n- **核心功能**：企业微信连接器已打通\n- **状态**：<font color=\"info\">已就绪</font>" --type markdown
```

### 2. 发送纯文本消息
```bash
python scripts/send_message.py --content "各位好，系统已完成部署。" --type text
```

### 3. 指定目标会话（可选）
若用户指定了群聊或用户 ID（`chat_id`）：
```bash
python scripts/send_message.py --content "测试通知" --chat-id "WRK_xxxx"
```
> 注：若不提供 `--chat-id`，系统会自动将消息推送给当前授权绑定人或最近活跃的会话。

## 格式排版规范

- 企业微信 Markdown 支持标题（`#`, `##`, `###`）、加粗（`**text**`）、代码块（`\`code\``）、链接（`[文字](url)`）以及字体颜色：
  - 绿色提示：`<font color="info">成功/正常</font>`
  - 橙色警告：`<font color="warning">待办/警报</font>`
- 发送完成后，向用户确认消息已送达。
