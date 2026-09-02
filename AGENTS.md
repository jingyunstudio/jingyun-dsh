# Repository Guidelines

## Project Overview
**jingyun-dsh** (`@jingyun-ai/jingyun-dsh` / `Jingyun.Studio`) is a desktop application and enterprise plugin distribution for the **DeepSeek Harness (DSH)** AI Agent orchestration platform. It provides custom branding, Cordis-based agent management hooks, cloud/local tenant synchronization, REST APIs, and a standalone desktop distribution via a Rust Tauri v2 shell.

---

## Architecture & Data Flow

```
+-------------------------------------------------------------------------------+
|                           Tauri v2 Desktop Shell (Rust)                       |
|   - Spawns Node.js Sidecar under Win32 Job Object (KillOnClose lifecycle)     |
|   - Custom Window Controls (IPC: min/max/close/drag), Tray Icon, Splash       |
+-------------------------------------------------------------------------------+
                                      |
                                      v (Loads via HTTP / Localhost)
+-------------------------------------------------------------------------------+
|                      DSH Core Server Runtime (Node.js ESM)                    |
|   - Cordis IoC Container (@deepseek-ai/cordis)                                |
|   - Jingyun Backend Plugin (@jingyun-ai/jingyun-dsh)                          |
|     * REST API Routes: /api/jingyun/* (tenant, agents, config, marketplace)   |
|     * Agent Loader: Hooks systemPrompt to inject active personas / workspace  |
|     * Skills Manager: Synchronizes builtin skills to $DSH_HOME/skills         |
|     * Settings/Schema: Schemastery configuration management                   |
+-------------------------------------------------------------------------------+
                                      |
                                      v (Slot Injections & HTTP Requests)
+-------------------------------------------------------------------------------+
|                    DSH Web Client / React 19 Frontend                         |
|   - Custom Module Loader (__ModuleLoader__) injects lib/client.js             |
|   - Extension Slots: sidebar.brand.*, conversation.hero.*, sidebar.footer.*   |
|   - Dynamic Branding: MutationObserver title/favicon & CSS variable overrides |
+-------------------------------------------------------------------------------+
```

### Data Flow
1. **Startup**: Tauri boots -> extracts portable vendor packages if needed -> spawns Node.js DSH backend sidecar -> attaches to Windows Job Object for clean termination -> opens Webview.
2. **Plugin Initialization**: DSH loads `@jingyun-ai/jingyun-dsh` via Cordis service container -> registers REST endpoints (`/api/jingyun/*`), synchronizes builtin skills to `$DSH_HOME/skills`, and registers `systemPrompt` transform hooks.
3. **Frontend Slot Injection**: Client frontend script (`lib/client.js`) registers React components into DSH UI extension slots (branding banners, agent switchers, settings tabs).
4. **Agent Dynamic Injection**: On conversation creation, `agent-loader.ts` intercepts `systemPrompt` via Cordis to insert custom agent system prompts and workspace rules.

---

## Key Directories

| Directory | Purpose |
|---|---|
| `packages/jingyun-dsh/` | Core plugin package containing both backend (Cordis) and frontend (React client) code. |
| `packages/jingyun-dsh/src/` | TypeScript source for the plugin. |
| `packages/jingyun-dsh/src/agent/` | Dynamic agent loaders, active agent managers, and template generators. |
| `packages/jingyun-dsh/src/client/` | React 19 UI components injected into DSH extension slots, styles, and DOM observers. |
| `packages/jingyun-dsh/src/routes/` | REST API routes mounted under `/api/jingyun/*`. |
| `packages/jingyun-dsh/src/common/` | Shared utilities: path resolution, HTTP helpers, logger, and tenant discovery. |
| `src-tauri/` | Rust Tauri v2 desktop application shell, window management, and sidecar process controller. |
| `src-tauri/resources/builtin-skills/` | Builtin skills (e.g. `agent-manager`, `skill-creator`) synced to user environment. |
| `scripts/` | Build, packaging (`pack_gui.py`), vendor preparation, and environment setup scripts. |

---

## Development Commands

### Package & Dependency Management
- **Install dependencies**: `pnpm install`
- **Typecheck codebase**: `pnpm typecheck` (`tsc -b --noEmit`)
- **Lint code**: `pnpm lint` (`oxlint --fix`)
- **Format code**: `pnpm fmt` (`oxfmt --write`)

### Plugin Development
- **Run Plugin in Watch Mode**: `pnpm watch` (or `pnpm -C packages/jingyun-dsh dev`)
- **Build Plugin**: `pnpm build` (runs `prepare:vendor` + `tsdown` build in packages)
- **Start Dev Host**: `pnpm dev` (runs watcher + DSH dev server concurrently)
- **Start DSH Standalone**: `pnpm start`

### Desktop (Tauri) & Packaging
- **Run Tauri Dev**: `pnpm tauri:dev` (`tauri dev`)
- **Build Tauri Release**: `pnpm tauri:build` (builds plugin, prepares vendor bundles, and outputs NSIS installer)
- **Build Vendor Dependencies Zip**: `pnpm build:deps`
- **Launch Packaging GUI Tool**: `pnpm pack:gui` (or run `run_pack.bat`)

---

## Code Conventions & Common Patterns

### Formatting & Tooling
- Managed via **Oxlint** (`.oxlintrc.json`) and **Oxfmt** (`.oxfmtrc.json`).
- Single quotes (`'`), 2-space indentation, trailing semicolons (`semi: true`), sorted imports, and sorted `package.json` keys.

### Module & Build Strategy (`tsdown.config.ts`)
Dual output compilation from `packages/jingyun-dsh`:
- **Backend**: Target `node` / `es2022`, format `esm`, output `lib/index.mjs`.
- **Frontend Client**: Target `browser` / `esnext`, format `cjs`, output `lib/client.js`, wrapped in DSH's custom `__ModuleLoader__` banner and footer.

### Dependency Injection (Cordis)
Backend services use Cordis IoC:
```ts
// Service injection pattern
ctx.inject(['webServer', 'settings', 'systemPrompt'], (ctx) => {
  // Register routes, settings, or prompt transforms
  ctx.webServer.get('/api/jingyun/status', (req, res) => { ... });
});
```

### HTTP Route Handling
Use standardized JSON helpers from `src/common/http.ts`:
```ts
import { sendJson, sendError } from '../common/http.js';

sendJson(res, { success: true, data: result });
sendError(res, 400, 'Invalid configuration parameter');
```

### Path Resolution
Always use path resolution from `src/common/paths.ts` (`getDshHome()`, `getJingyunConfigPath()`) to ensure compatibility with both standard installation and portable vendor modes.

### Error Handling & Async
- All async filesystem and HTTP handlers must use `try / catch` blocks with structured logging via `src/common/logger.ts`.
- Never crash the parent DSH process; degrade gracefully when config files or tenant services are unreachable.

---

## Important Files

| File | Significance |
|---|---|
| `packages/jingyun-dsh/src/index.ts` | Backend plugin entry point; initializes Cordis hooks, REST routes, and skill sync. |
| `packages/jingyun-dsh/src/client/index.tsx` | Frontend injection entry point; registers React components into DSH UI slots. |
| `src-tauri/src/lib.rs` | Tauri v2 desktop entry point; manages sidecar lifecycle and Win32 Job Objects. |
| `packages/jingyun-dsh/tsdown.config.ts` | Dual-target bundler configuration (Node ESM + Browser CJS module). |
| `packages/jingyun-dsh/jingyun-config.example.json` | Configuration template for branding, domain, logo, and API endpoints. |
| `src-tauri/tauri.conf.json` | Tauri desktop configuration, window definitions, and NSIS installer bundling rules. |
| `pnpm-workspace.yaml` | Workspace monorepo root definition (`packages/*`). |

---

## Runtime & Tooling Preferences

- **Package Manager**: `pnpm` (strictly required; monorepo workspace with `pnpm-lock.yaml`).
- **Node.js**: Modern Node.js (`>= 20.0.0`, ESM).
- **Rust Toolchain**: Rust 2021 edition (compatible with Tauri v2).
- **Python**: Python 3.x (used for `scripts/pack_gui.py` and agent helper utilities).
- **Linters/Formatters**: `oxlint` and `oxfmt` (fast Rust-based JS/TS tooling). Do not install heavy ESLint/Prettier plugins unless configured.

---

## Testing & QA

- **Automated Test Suites**: Currently, there are no dedicated unit or integration test runners (e.g., Vitest, Jest, Playwright, or `cargo test`) configured in this repository.
- **Verification Gates**:
  1. **Type Safety**: `pnpm typecheck` (`tsc -b --noEmit`) must pass without errors across all packages.
  2. **Lint & Code Style**: `pnpm lint` (`oxlint --fix`) and `pnpm fmt` (`oxfmt --write`) must pass clean.
  3. **Build Integrity**: `pnpm build` must produce both `lib/index.mjs` and `lib/client.js` cleanly.
  4. **Manual Verification**: Run `pnpm dev` or `pnpm tauri:dev` to smoke test runtime and slot injections.
