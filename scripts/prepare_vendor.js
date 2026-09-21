import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { checkRuntimesExist, ensureRuntimes } from './download_runtimes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.join(__dirname, '..');
const targetVendorDir = path.join(baseDir, 'src-tauri', 'resources', 'vendor');
const targetJingyun = path.join(targetVendorDir, 'jingyun');

// 1. Ensure node and python runtimes exist
if (!checkRuntimesExist()) {
  console.log(
    '[VendorPrepare] ⚠️ Missing node or python runtime! Ensuring runtimes...'
  );
  await ensureRuntimes();
}

// 2. 使用 pnpm 原生官方部署机制 (方案 1: pnpm deploy --prod --node-linker hoisted)
console.log(
  '[VendorPrepare] 🚀 Deploying production dependencies via official pnpm deploy...'
);
if (fs.existsSync(targetJingyun)) {
  fs.rmSync(targetJingyun, { recursive: true, force: true });
}
execSync(
  `pnpm --filter jingyun-dsh deploy --prod --node-linker hoisted "${targetJingyun}"`,
  {
    cwd: baseDir,
    stdio: 'inherit',
    env: process.env,
  }
);

// 3. Sync compiled packages/jingyun-dsh and @jingyun-ai alias
const srcPlugin = path.join(baseDir, 'packages', 'jingyun-dsh');
const dstPlugin = path.join(targetJingyun, 'packages', 'jingyun-dsh');
const dstAlias = path.join(
  targetJingyun,
  'node_modules',
  '@jingyun-ai',
  'jingyun-dsh'
);

if (fs.existsSync(srcPlugin)) {
  const filter = (src) =>
    !src.includes('node_modules') && !src.includes('.git');
  fs.mkdirSync(path.dirname(dstPlugin), { recursive: true });
  fs.cpSync(srcPlugin, dstPlugin, { recursive: true, filter });
  fs.mkdirSync(path.dirname(dstAlias), { recursive: true });
  fs.cpSync(srcPlugin, dstAlias, { recursive: true, filter });
}

// 4. Sync unified runner script to resources/vendor/jingyun/scripts/run_dsh.js
const dstScripts = path.join(targetJingyun, 'scripts');
fs.mkdirSync(dstScripts, { recursive: true });
fs.copyFileSync(
  path.join(__dirname, 'run_dsh.js'),
  path.join(dstScripts, 'run_dsh.js')
);

// 5. Ensure frontendDist directory exists for Tauri splash template
const distTauriTemp = path.join(baseDir, 'dist_tauri_temp');
fs.mkdirSync(distTauriTemp, { recursive: true });
const splashTemplatePath = path.join(
  baseDir,
  'src-tauri',
  'resources',
  'splash',
  'index.html'
);
if (fs.existsSync(splashTemplatePath)) {
  fs.copyFileSync(splashTemplatePath, path.join(distTauriTemp, 'index.html'));
}

// 6. 安全清理生产依赖中无用的调试与文档文件（.map, .d.ts, 测试用例, 文档）
function pruneVendor(dir) {
  const nodeMod = path.join(dir, 'node_modules');
  if (!fs.existsSync(nodeMod)) return;

  const uselessDirs = new Set([
    'test',
    'tests',
    '__tests__',
    'spec',
    'docs',
    'example',
    'examples',
  ]);
  let freedBytes = 0;
  let freedCount = 0;

  function walk(curr) {
    let list = [];
    try {
      list = fs.readdirSync(curr);
    } catch {
      return;
    }
    for (const item of list) {
      const p = path.join(curr, item);
      let st;
      try {
        st = fs.lstatSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (uselessDirs.has(item.toLowerCase())) {
          freedBytes += getDirSize(p);
          fs.rmSync(p, { recursive: true, force: true });
        } else {
          walk(p);
        }
      } else {
        const lower = item.toLowerCase();
        if (
          lower.endsWith('.map') ||
          lower.endsWith('.d.ts') ||
          lower.endsWith('.d.ts.map') ||
          lower.endsWith('.md') ||
          lower.endsWith('.markdown') ||
          lower.startsWith('changelog')
        ) {
          freedBytes += st.size;
          freedCount++;
          try {
            fs.unlinkSync(p);
          } catch {}
        }
      }
    }
  }

  function getDirSize(d) {
    let sz = 0;
    try {
      for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        const s = fs.lstatSync(p);
        if (s.isDirectory()) sz += getDirSize(p);
        else sz += s.size;
      }
    } catch {}
    return sz;
  }

  walk(nodeMod);
  console.log(
    `[VendorPrepare] 🧹 Pruning finished: freed ${(freedBytes / 1024 / 1024).toFixed(2)} MB across ${freedCount} files!`
  );
}

pruneVendor(targetJingyun);

console.log('[VendorPrepare] 🎉 Resources deployed, pruned, and ready!');
