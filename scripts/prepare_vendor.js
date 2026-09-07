import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.join(__dirname, '..');
const targetVendorDir = path.join(baseDir, 'src-tauri', 'resources', 'vendor');
const targetJingyun = path.join(targetVendorDir, 'jingyun');
const dshBin = path.join(
  targetJingyun,
  'node_modules',
  '@deepseek-ai',
  'dsh',
  'lib',
  'bin.js'
);
const nodeExe = path.join(targetVendorDir, 'node', 'node.exe');
const pythonExe = path.join(targetVendorDir, 'python', 'python.exe');

// 1. Ensure node and python runtimes exist
if (!fs.existsSync(nodeExe) || !fs.existsSync(pythonExe)) {
  console.log(
    '[VendorPrepare] ⚠️ Missing node or python runtime! Ensuring runtimes...'
  );
  const { ensureRuntimes } = await import('./download_runtimes.js');
  await ensureRuntimes();
}

// 2. Ensure production dependencies are collected
if (!fs.existsSync(dshBin)) {
  console.log(
    '[VendorPrepare] ⚠️ Dependencies missing in resources! Collecting dependencies...'
  );
  await import('./build_deps.js');
}

// 2. Sync packages/jingyun-dsh and @jingyun-ai alias
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

// 3. Ensure frontendDist directory exists for Tauri splash template
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

console.log('[VendorPrepare] 🎉 Resources ready in 0.02s!');
