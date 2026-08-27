<div align="center">

<img src="https://jingyun-studio.oss-cn-chengdu.aliyuncs.com/uploads/1772455818454-%E5%9C%86%E8%A7%92%E7%9F%A9%E5%BD%A2%204%20%E6%8B%B7%E8%B4%9D%203.png" alt="Jingyun Studio" width="80" />

# Jingyun DSH Client

**让每一个 AI 创业者都拥有自己的商业闭环**

基于 [Jingyun Studio](https://jingyun.studio/zh) + [DeepSeek Harness (DSH)](https://github.com/nicepkg/dsh) 打造的一站式 AI 商业化桌面客户端

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-v2-orange.svg)](https://v2.tauri.app/)
[![pnpm](https://img.shields.io/badge/pnpm-Monorepo-yellow.svg)](https://pnpm.io/)
[![Website](https://img.shields.io/badge/官网-jingyun.studio-indigo.svg)](https://jingyun.studio/zh)

[官网](https://jingyun.studio/zh) · [开发文档](https://acnq1rombfk4.feishu.cn/wiki/NuZWwBU7Ri0WZUkaLAHclwy2nxc) · [加入社群](#-加入社群)

</div>

---

## 📖 这个项目是什么？

**Jingyun DSH Client** 不只是一个 AI 对话客户端。

它是 **[Jingyun Studio（井云）](https://jingyun.studio/zh)** 与 **[DeepSeek Harness（DSH）](https://github.com/nicepkg/dsh)** 深度融合的产物 —— 一个**将 AI 智能体 / 技能 / 工作流转化为可交易商品**的完整商业化平台客户端。

> 井云为 DSH 注入了完整的商业闭环：**会员体系 → 订阅支付 → 算力管控 → 资产分发 → 私域运营**，让 AI 开发者 30 分钟内将自己的智能体封装为独立的商业产品。

### 🎯 核心能力

| 能力 | 说明 |
|:---|:---|
| 👤 **会员登录 & 订阅** | 手机号登录，支持订阅制、按量计费、分销等多种商业模式 |
| 💰 **算力充值 & 管控** | 内置算力额度体系，精确控制 Token 用量与成本 |
| 🤖 **智能体库** | AI 智能体身份系统，按会话隔离切换，让 AI 化身不同领域的行业智能体 |
| 🧠 **技能库** | 可复用的技能包管理，扩展 AI 的专业能力边界 |
| 🔌 **插件库** | 集成 800+ 社区开源插件，一键安装增强功能 |
| 🏪 **应用市场** | 智能体、技能、插件统一上架，支持定价交易 |
| ☁️ **云数据 & 资产库** | 对话记录、知识库、产物文件云端同步 |
| 📦 **产物工作台** | 可拖拽调宽的侧栏面板，支持代码、文档、图表等多类型产物预览与管理 |

### 💡 两种使用方式

<table>
<tr>
<td align="center" width="50%">

**🔌 npm 包接入**

适合已有 DSH 实例的开发者

```bash
# 安装 UI 品牌定制插件
npm install @jingyun-ai/jingyun-dsh

# 在 DSH 配置中启用
```

只需安装插件包，即可为您的 DSH 实例接入井云的会员体系、支付系统和全部商业化能力

</td>
<td align="center" width="50%">

**📦 整仓拉取 · 一键打包**

适合需要独立品牌桌面客户端的团队

```bash
git clone <repo-url>
pnpm install
pnpm build
run_pack.bat  # GUI 打包控制台
```

拉取整个仓库，通过 GUI 控制台自定义品牌名、Logo、域名后，一键打包为带安装程序的 Windows 桌面客户端

</td>
</tr>
</table>

---

## 🏗️ 项目架构

```
jingyun_dsh/
├── packages/
│   └── jingyun-dsh/              # [核心] 井云 UI 品牌定制插件 (TypeScript)
│       ├── src/
│       │   ├── client/           # 前端 UI 组件 (React/JSX)
│       │   │   ├── components/   # 通用组件 (登录/设置/会员状态)
│       │   │   ├── modals/       # 弹窗组件 (订阅/充值/支付)
│       │   │   ├── pages/        # 功能页面 (产物面板/自动化/连接器/插件市场)
│       │   │   └── styles.ts     # 全局样式注入
│       │   ├── agent/            # AI 智能体包管理器 (后端)
│       │   ├── routes/           # HTTP 路由 (插件市场/智能体 API/会员接口)
│       │   ├── config/           # 配置加载器 (井云平台对接)
│       │   └── common/           # 公共工具函数
│       └── resources/            # 静态资源 (插件注册表快照)
├── src-tauri/                    # [桌面] Tauri v2 原生壳 (Rust)
│       ├── src/lib.rs            # 主进程逻辑 (后端进程管理/托盘/窗口)
│       ├── resources/
│       │   ├── splash/           # 启动屏 (HTML)
│       │   ├── vendor/           # 内嵌运行时 (Node.js/Python/Git)
│       │   └── builtin-skills/   # 内置技能包 (第三方开源)
│       └── capabilities/         # Tauri 安全权限声明
├── scripts/                      # 构建 & 打包脚本
│   ├── pack_gui.py               # GUI 打包控制台 (Python/Tkinter)
│   ├── build_deps.js             # 依赖构建脚本
│   └── prepare_vendor.js         # Vendor 运行时打包脚本
└── run_pack.bat                  # 一键打包入口 (Windows)
```

---

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|:---|:---|:---|
| **桌面壳** | Tauri v2 + Rust | 原生窗口管理、系统托盘、进程生命周期 |
| **AI 底座** | DSH (DeepSeek Harness) | 开源 AI 对话运行时，插件化架构 |
| **商业平台** | Jingyun Studio | 会员 / 支付 / 订阅 / 算力 / 应用市场后端 |
| **前端 UI** | React + TypeScript | 品牌定制插件 UI 组件 |
| **构建工具** | pnpm Monorepo + tsdown | 前端编译与包管理 |
| **打包工具** | Python + Tkinter | GUI 打包控制台，支持自定义品牌参数 |
| **安装程序** | NSIS | Windows 安装包生成 |

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.x
- **pnpm** >= 8.x
- **Rust** (stable) — 用于编译 Tauri 原生壳（仅桌面客户端打包时需要）
- **Python** >= 3.8 — 仅 GUI 打包控制台需要（可选）

> **📦 内置环境包说明**：桌面客户端打包时需要内嵌的运行时环境包（Node.js / Python / Git 便携版），体积较大，不包含在 Git 仓库中。请 [加入社群](#-加入社群) 免费领取，放置到 `src-tauri/resources/vendor/` 目录下即可。

### 方式一：npm 包接入（推荐）

如果您已有运行中的 DSH 实例，只需安装品牌定制插件：

```bash
npm install @jingyun-ai/jingyun-dsh
```

然后在本地复制并重命名 `packages/jingyun-dsh/jingyun-config.example.json` 为 `packages/jingyun-dsh/jingyun-config.json`，在其中配置您的井云平台信息即可接入完整的会员体系和商业化能力。

### 方式二：整仓部署

#### 安装依赖

```bash
git clone <repo-url>
cd jingyun_dsh
pnpm install
```

#### 开发模式（Web）

```bash
pnpm build    # 构建插件
pnpm start    # 启动 DSH Web 服务
```

浏览器访问 `http://localhost:3080` 即可使用。

#### 开发模式（桌面客户端）

```bash
pnpm build       # 构建插件
pnpm tauri:dev   # 启动 Tauri 开发模式
```

#### 生产打包

```bash
# 方式一：命令行打包
pnpm tauri:build

# 方式二：GUI 打包控制台（推荐，支持自定义品牌名/域名/租户ID等）
run_pack.bat
```

---

## 📋 品牌定制

在本地开发或打包前，请**自行复制并重命名** `packages/jingyun-dsh/jingyun-config.example.json` 为 `packages/jingyun-dsh/jingyun-config.json`。通过修改 `packages/jingyun-dsh/jingyun-config.json` 可自定义品牌与平台对接信息：

```json
{
  "api_url": "http://your-api-endpoint/",
  "tenant_host": "your-tenant-id",
  "domain": "http://your-domain/",
  "custom_name": "Your App Name",
  "custom_logo": "https://your-logo-url.png"
}
```

> 💡 **在线免费开通**：访问 [jingyun.studio](https://jingyun.studio/zh) 注册账号，即可免费获取 `tenant_host` 和 `api_url`，无需自行搭建后端。

打包时还可通过 GUI 打包控制台 (`run_pack.bat`) 交互式配置应用名称、域名和租户 ID。

---

## 📦 插件市场

本项目内置了来自 GitHub 开源社区的 DSH 插件注册表快照（800+ 插件），用户可通过内置的插件市场页面一键浏览、安装和卸载社区插件。

> **⚠️ 免责声明**：插件注册表中的数据完全来自第三方开源社区。本软件仅提供数据展示与便捷安装通道，不对第三方插件的安全性、合规性及可用性做任何明示或暗示的担保。因安装或使用第三方插件而导致的任何风险和损失，由用户自行承担。

---

## 🤖 内置技能包

`src-tauri/resources/builtin-skills/` 目录下的技能包来自第三方开源社区，用于增强 AI 助手的专业能力：

| 技能包 | 说明 |
|:---|:---|
| `agent-manager` | 智能体包的全生命周期管理（创建 / 修改 / 校验 / 注册） |
| `skill-creator` | 引导创建自定义技能包 |

---

## 📄 许可证

本项目采用 [Apache License 2.0](LICENSE) 开源许可证。

第三方组件许可证：
- **DSH (DeepSeek Harness)** — 遵循其原始开源许可
- **内置技能包** (`builtin-skills/`) — 遵循其原始开源许可
- **社区插件注册表** (`registry-snapshot.json`) — 遵循其原始开源许可，数据来源于第三方开源社区

---

## 🔗 相关链接

- 🌐 **官网**：[jingyun.studio](https://jingyun.studio/zh)
- 📖 **开发文档**：[飞书知识库](https://acnq1rombfk4.feishu.cn/wiki/NuZWwBU7Ri0WZUkaLAHclwy2nxc)
- 💰 **价格方案**：[jingyun.studio/pricing](https://jingyun.studio/zh/pricing)
- 🏪 **应用市场**：[jingyun.studio/apps](https://jingyun.studio/zh/apps)

---

## 💬 加入社群

如果您有任何问题、建议，或想与其他 AI 创业者交流，欢迎扫码加入我们的微信社群：

<!-- TODO: 请将微信群二维码图片放置到此处 -->
<div align="center">
<img src="https://jingyun-studio.oss-cn-chengdu.aliyuncs.com/uploads/1774415000650-contact_me_qr.png" alt="微信社群二维码" width="300" />
</div>

> 📮 如二维码过期，请通过 [官网](https://jingyun.studio/zh) 联系我们获取最新入群方式。

---

<div align="center">

**Made with ❤️ by [Jingyun Team](https://jingyun.studio/zh)**

*井云，互联万物。让每一个 AI 创业者都拥有
自己的商业闭环。*

</div>
