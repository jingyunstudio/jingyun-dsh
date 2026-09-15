// 修复 Node.js 原生 --watch 注入 WATCH_REPORT_DEPENDENCIES 导致 DSH Windows runner IPC 校验失败的 Bug
delete process.env.WATCH_REPORT_DEPENDENCIES;

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dshPkgPath = path.join(
  rootDir,
  'node_modules',
  '@deepseek-ai',
  'dsh',
  'package.json'
);

// 1. Ensure plugin dependency is linked in DSH package.json
if (fs.existsSync(dshPkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(dshPkgPath, 'utf8'));
    if (!pkg.dependencies) pkg.dependencies = {};
    if (!pkg.dependencies['@jingyun-ai/jingyun-dsh']) {
      pkg.dependencies['@jingyun-ai/jingyun-dsh'] = 'workspace:^';
      fs.writeFileSync(dshPkgPath, JSON.stringify(pkg, null, 2), 'utf8');
      console.log(
        '[DevPrepare] ✅ Injected @jingyun-ai/jingyun-dsh into development node_modules/@deepseek-ai/dsh/package.json'
      );
    }
  } catch (e) {
    console.error('[DevPrepare] ❌ Failed to prepare dev package.json:', e);
  }
}

// 2. Ensure portable data directory and default config exist
const dataDir = path.join(rootDir, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 注入便携环境变量
process.env.DSH_HOME = process.env.DSH_HOME || dataDir;
process.env.DSH_CONFIG_DIR = process.env.DSH_CONFIG_DIR || dataDir;
process.env.DSH_PORTABLE = '1';

// 清理 data/.env 中被 DSH 规范禁止显式定义的 DSH_* 变量
const envPath = path.join(dataDir, '.env');
if (fs.existsSync(envPath)) {
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    const cleaned = raw
      .split('\n')
      .filter((line) => !line.trim().startsWith('DSH_'))
      .join('\n');
    if (cleaned !== raw) fs.writeFileSync(envPath, cleaned, 'utf8');
  } catch {}
}

const targetConfig = path.join(dataDir, 'desktop-config.json');
const srcConfig = path.join(
  rootDir,
  'packages',
  'jingyun-dsh',
  'desktop-config.json'
);
const exampleConfig = path.join(
  rootDir,
  'packages',
  'jingyun-dsh',
  'desktop-config.example.json'
);

if (!fs.existsSync(targetConfig)) {
  if (fs.existsSync(srcConfig)) {
    fs.copyFileSync(srcConfig, targetConfig);
    console.log(
      '[DevPrepare] 📁 Initialized data/desktop-config.json from packages/jingyun-dsh/desktop-config.json'
    );
  } else if (fs.existsSync(exampleConfig)) {
    fs.copyFileSync(exampleConfig, targetConfig);
    console.log(
      '[DevPrepare] 📁 Initialized data/desktop-config.json from example template'
    );
  }
}

// 3. Ensure data/profiles/web/package.json exists with @jingyun-ai/jingyun-dsh bundle
const webProfileDir = path.join(dataDir, 'profiles', 'web');
const webProfilePkg = path.join(webProfileDir, 'package.json');
if (!fs.existsSync(webProfileDir)) {
  fs.mkdirSync(webProfileDir, { recursive: true });
}
if (!fs.existsSync(webProfilePkg)) {
  const defaultPkg = {
    name: 'dsh-profile-web',
    private: true,
    dependencies: {},
    dsh: {
      profile: {
        bundles: [
          '@deepseek-ai/dsh-base',
          '@deepseek-ai/dsh-web-app',
          '@jingyun-ai/jingyun-dsh',
        ],
      },
    },
  };
  fs.writeFileSync(webProfilePkg, JSON.stringify(defaultPkg, null, 2), 'utf8');
}
