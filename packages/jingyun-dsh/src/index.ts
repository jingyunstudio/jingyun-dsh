import fs from 'fs';
import path from 'path';

import type { Context } from '@deepseek-ai/cordis';

import { initSystemPromptHook } from './agent/agent-loader';
import { getDshHome, readJingyunConfig } from './common/paths';
import { Config } from './config/schema';
import { registerRoutes } from './routes';

// Synchronously inject environment variables at top-level on module import to support pre-apply bootstrap mapping
const initialData = readJingyunConfig();
if (initialData.api_url) {
  process.env.JINGYUN_API_URL = initialData.api_url;
  console.log(
    `[UIBranding] Top-level pre-injected JINGYUN_API_URL: ${initialData.api_url}`
  );
}
if (initialData.tenant_host) {
  process.env.JINGYUN_TENANT_HOST = initialData.tenant_host;
  console.log(
    `[UIBranding] Top-level pre-injected JINGYUN_TENANT_HOST: ${initialData.tenant_host}`
  );
}
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

export function apply(ctx: Context, config: Config) {
  console.log('[UIBranding] Mounting branding backend plugin...');

  // Auto-sync bundled builtin skills on startup
  syncBuiltinSkills();

  // 3. Pre-load initial configuration from local backup config file before registering settings
  const localData = readJingyunConfig();
  if (localData.mode) config.mode = localData.mode;
  if (localData.api_url) config.apiUrl = localData.api_url;
  if (localData.tenant_host) config.tenantHost = localData.tenant_host;
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
}
