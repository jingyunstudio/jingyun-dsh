import './common/dns';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import type { Context } from '@deepseek-ai/cordis';

import { initSystemPromptHook } from './agent/agent-loader';
import { getDshHome, readDesktopConfig } from './common/paths';
import { Config } from './config/schema';
import { registerRoutes } from './routes';

// Synchronously inject environment variables at top-level on module import to support pre-apply bootstrap mapping
const initialData = readDesktopConfig();
if (initialData.app_host) {
  process.env.JINGYUN_APP_HOST = initialData.app_host;
  console.log(
    `[UIBranding] Top-level pre-injected JINGYUN_APP_HOST: ${initialData.app_host}`
  );
}

export const name = 'jingyun-dsh';
export const inject = ['webServer', 'settings', 'commands'];
export { Config };

function installSettingsSection(
  ctx: Context,
  ns: string,
  schema: any,
  entry: Config,
  hooks: {
    setSource: (source: () => Config) => void;
    onChange: () => void;
  }
) {
  ctx.inject(['settings'], (sctx: any) => {
    const scope = sctx.settings.register(ns, schema, {
      base: entry,
    });
    hooks.setSource(() => scope.get());
    scope.watch(() => {
      hooks.onChange();
    });
  });
}

function copyFolderRecursiveSync(src: string, dest: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyFolderRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function syncBuiltinSkills() {
  try {
    const baseDir = getDshHome();
    const targetSkillsDir = path.join(baseDir, 'skills');
    if (!fs.existsSync(targetSkillsDir)) {
      fs.mkdirSync(targetSkillsDir, { recursive: true });
    }

    const candidateDirs = [
      path.resolve(process.cwd(), 'src-tauri', 'resources', 'builtin-skills'),
      path.resolve(process.cwd(), 'resources', 'builtin-skills'),
      path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'src-tauri',
        'resources',
        'builtin-skills'
      ),
      path.resolve(__dirname, '..', 'resources', 'builtin-skills'),
      path.resolve(__dirname, 'builtin-skills'),
    ];

    for (const srcDir of candidateDirs) {
      if (fs.existsSync(srcDir)) {
        const skills = fs.readdirSync(srcDir);
        for (const skillName of skills) {
          const srcSkillPath = path.join(srcDir, skillName);
          const targetSkillPath = path.join(targetSkillsDir, skillName);
          if (fs.statSync(srcSkillPath).isDirectory()) {
            if (!fs.existsSync(targetSkillPath)) {
              copyFolderRecursiveSync(srcSkillPath, targetSkillPath);
              console.log(
                `[UIBranding] Auto-synced builtin skill "${skillName}" to ${targetSkillPath}`
              );
            }
          }
        }
        break;
      }
    }
  } catch (err: any) {
    console.warn('[UIBranding] Failed to sync builtin skills:', err.message);
  }
}
/**
 * 彻底禁用 DSH Web 端身份验证机制 (BrowserAuth)
 * 1. authorizeIndex: 始终返回 true，任何客户端访问 / 或 /index.html 均直接返回 200 HTML，无需 token / cookie
 * 2. requestRejection: 始终返回 undefined，允许全量 /api 与 RPC 请求无阻通行
 * 3. browserAuth.isAuthenticated: 始终返回 true
 * 4. authenticatedUrl: 保持干净 URL，控制台启动输出不再携带 ?token=...
 */
function disableBrowserAuth(ctx: Context) {
  ctx.inject(['connection'], (sctx: any) => {
    const connection = sctx.connection;
    if (!connection) return;

    connection.authorizeIndex = () => true;
    connection.requestRejection = () => undefined;
    if (connection.browserAuth) {
      connection.browserAuth.authorizeIndex = () => true;
      connection.browserAuth.isAuthenticated = () => true;
    }
    connection.authenticatedUrl = (baseUrl: string) => baseUrl;

    console.log(
      '[UIBranding] DSH Web BrowserAuth authentication has been completely disabled.'
    );
  });
}

export function apply(ctx: Context, config: Config) {
  console.log('[UIBranding] Mounting branding backend plugin...');

  // Auto-sync bundled builtin skills on startup
  syncBuiltinSkills();

  // 3. Pre-load initial configuration from local backup config file before registering settings
  const localData = readDesktopConfig();
  if (localData.mode) config.mode = localData.mode;
  if (localData.app_host) config.appHost = localData.app_host;
  if (localData.custom_name !== undefined)
    config.customName = localData.custom_name;
  if (localData.custom_logo !== undefined)
    config.customLogo = localData.custom_logo;

  // Register settings card automatically without polluting SQLite database
  let current = () => config;
  installSettingsSection(
    ctx,
    'jingyun-dsh', // String namespace
    Config,
    config,
    {
      setSource: (source) => {
        current = source;
      },
      onChange: () => {
        console.log('[UIBranding] Hot-reload config changed:', current());
      },
    }
  );

  // 4. 初始化系统提示词拦截挂载 (智能体系统模块)
  initSystemPromptHook(ctx);

  // 5. 注册全量 API 控制器路由
  registerRoutes(ctx, config);

  // 6. 彻底禁用 DSH Web 身份验证机制，无需 token / cookie
  disableBrowserAuth(ctx);
}
