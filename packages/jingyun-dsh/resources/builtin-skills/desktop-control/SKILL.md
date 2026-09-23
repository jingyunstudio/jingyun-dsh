---
name: desktop-control
description: |
  桌面 GUI 自动化控制技能（支持 Windows 与 macOS）。在调用任何 `mcp__desktop__*` 工具或操作桌面软件（打开软件、切换应用、唤醒后台、点击输入、发送消息）前必须首先加载。
  触发词：控制电脑、操作电脑、打开软件、打开应用、启动软件、后台运行、后台应用、发送消息、桌面操作、查看屏幕、点击按钮、Windows控制、Mac控制、macOS控制、mcp__desktop、desktop-control。
---

# 桌面 GUI 自动化控制技能 (desktop-control)

本技能已按宿主操作系统进行分平台规范解耦：

- **Windows 系统**：遵循 [SKILL.windows.md](SKILL.windows.md)（基于 `Windows-MCP`、`Snapshot`、任务栏托盘唤醒、`ctrl+v` 注入）。
- **macOS 系统**：遵循 [SKILL.macos.md](SKILL.macos.md)（基于 `Peekaboo`、`see`/`screenshot`、Dock/状态栏唤醒、`command+v` 注入）。

---

## 跨平台核心铁律

1. **观察先行（Observe First）**：第一步有且仅能是获取当前环境状态（Windows: `Snapshot`；macOS: `see`/`screenshot`），严禁未观察盲调启动命令。
2. **托盘/后台优先唤醒**：优先单点任务栏托盘或 Dock 栏已运行图标唤醒窗口，严禁对已知常驻后台的应用重复调用 launch。
3. **严禁凭经验盲猜坐标**：未见可编辑控件说明会话根本未打开，严禁盲猜坐标点击空白区域；必须在主列表或展开的菜单中单点进入。
4. **剪贴板安全注入**：中文及复杂文本一律通过剪贴板中转后模拟快捷键粘贴（Windows: `ctrl+v`；macOS: `command+v`），严禁直接模拟打字绑定回车。
5. **两阶段提交**：内容填充与确认提交严格分离，二次核实活动窗口与目标身份吻合后再触发单次提交。
6. **零幻觉核验底线**：观察中未确凿检索到发送成功的实体内容，直接判定为操作失败并如实报错，严禁以“渲染可能延迟”等借口谎报成功。
7. **现场复原**：后台应用操作完成后，必须将前台弹出的窗口最小化复原，保持桌面干净整洁。
