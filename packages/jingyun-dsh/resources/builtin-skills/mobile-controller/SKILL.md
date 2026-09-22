---
name: mobile-controller
description: |
  控制和操作连接的 Android 移动设备（手机或模拟器），具备无障碍树语义分析、多模态截屏、点击、滑动、输入、按键与 App 操控能力。
  触发词：控制手机、操作手机、手机截屏、手机点击、手机输入、手机打开、查看手机屏幕、移动端操作、mobile mcp。
---

# 移动端设备控制技能 (mobile-controller)

本技能通过已挂载的 `@mobilenext/mobile-mcp` 工业级移动自动化 MCP 服务，向智能体提供完整的设备视听与动作操控能力。

## 核心交互原则

智能体在操作手机界面时，应遵循 **“感知 -> 决策 -> 执行 -> 验证”** 的闭环工作流：

1. **优先使用无障碍树（Accessibility Hierarchy）语义定位**：
   - 优先通过 `mobile_get_view_hierarchy` 检索界面上的可见控件（文本、ID、类型与边界区域）。
   - 语义定位比盲猜绝对像素坐标更加稳定可靠，不受不同手机分辨率（1080P、2K、折叠屏）影响。
2. **多模态视觉截屏辅助（Visual Sense）**：
   - 当遇到游戏、特殊画布、自定义 UI 元素或者无障碍树无法获取文字时，调用 `mobile_take_screenshot` 获取当前手机屏幕画面。
   - 结合多模态大模型视觉理解能力定位交互区域中心点坐标 `(x, y)`。
3. **复合动作与状态校验**：
   - 执行点击（`mobile_tap`）、输入（`mobile_type_text`）或滑动（`mobile_swipe`）后，适度等待或再次拉取状态确认操作已成功响应。

---

## 常用工具方法映射（Tool List）

| 工具名称 | 作用 | 关键参数 | 适用场景 |
| :--- | :--- | :--- | :--- |
| `mcp__mobile__mobile_get_view_hierarchy` | 获取当前界面的 UI 元素树 | 无 | 分析当前界面上有哪些按钮、输入框、文本，获取其坐标与标识 |
| `mcp__mobile__mobile_take_screenshot` | 截取手机当前画面 | 无 | 视觉确认界面状态，多模态图像识别 |
| `mcp__mobile__mobile_tap` | 点击屏幕指定位置 | `x`: 横坐标, `y`: 纵坐标 | 点击按钮、图标或列表项 |
| `mcp__mobile__mobile_double_tap` | 双击屏幕指定位置 | `x`: 横坐标, `y`: 纵坐标 | 图片放大、点赞等需要双击的场景 |
| `mcp__mobile__mobile_long_press` | 长按指定位置 | `x`, `y`, `duration_ms` | 呼出上下文菜单、长按拖动 |
| `mcp__mobile__mobile_swipe` | 屏幕滑动手势 | `start_x`, `start_y`, `end_x`, `end_y`, `duration_ms` | 页面向下翻页（例如从 500,1500 滑动至 500,500）、横向切换等 |
| `mcp__mobile__mobile_type_text` | 输入文本 | `text`: 待输入的字符串 | 在当前焦点的输入框中填写文字 |
| `mcp__mobile__mobile_press_key` | 触发系统按键 | `key`: 按键名称 (home, back, enter, power, etc.) | 返回上一页 (back)、回到桌面 (home)、确认 (enter) |
| `mcp__mobile__mobile_open_app` | 启动应用程序 | `package_name`: 应用包名 | 打开指定的 App（如微信、高德、设置等） |
| `mcp__mobile__mobile_terminate_app` | 强行终止应用 | `package_name`: 应用包名 | 关闭后台或当前运行的 App |

---

## 典型操作场景工作流

### 场景 1：打开指定应用并点击指定按钮
1. 调用 `mcp__mobile__mobile_open_app(package_name="...")`；
2. 调用 `mcp__mobile__mobile_get_view_hierarchy()` 获取新打开界面的控件列表；
3. 在控件列表中找到目标按钮（如 `text: "登录"`，`bounds: [400, 1200, 680, 1300]`）；
4. 计算中心坐标 `(540, 1250)` 并调用 `mcp__mobile__mobile_tap(x=540, y=1250)`。

### 场景 2：表单填写与搜索
1. 定位到搜索输入框坐标并点击以聚焦；
2. 调用 `mcp__mobile__mobile_type_text(text="待搜索的关键词")`；
3. 调用 `mcp__mobile__mobile_press_key(key="enter")` 执行提交。

### 场景 3：浏览长列表（翻页）
1. 观察当前屏幕内容；
2. 若未出现目标内容，调用 `mcp__mobile__mobile_swipe(start_x=500, start_y=1600, end_x=500, end_y=400, duration_ms=500)` 向上滚动翻页；
3. 再次获取视图层级或截图，确认新展现的内容。

---

## 依赖与环境说明
- 底层已自动接入便携式 `adb` 以及集成的 Node/Python 运行环境；
- 手机端需处于已连接状态（USB 或通过 `adb connect <ip>:<port>` 无线连接），且开启“开发者选项 -> USB 调试（安全设置）”。
