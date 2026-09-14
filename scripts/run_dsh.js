import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const vendorNodeDir = path.join(
  rootDir,
  'src-tauri',
  'resources',
  'vendor',
  'node'
);

const nodeBin =
  process.platform === 'win32'
    ? path.join(vendorNodeDir, 'node.exe')
    : fs.existsSync(path.join(vendorNodeDir, 'node'))
      ? path.join(vendorNodeDir, 'node')
      : path.join(vendorNodeDir, 'bin', 'node');

if (!fs.existsSync(nodeBin)) {
  console.log('[DSH Runner] 📦 未检测到独立 Node 运行时，正在自动下载安装...');
  execSync('node scripts/download_runtimes.js', {
    cwd: rootDir,
    stdio: 'inherit',
  });
  if (!fs.existsSync(nodeBin)) {
    console.error(`[DSH Runner] ❌ 独立 Node 运行时下载失败: ${nodeBin}`);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const dshArgs = [
  '--import',
  './scripts/prepare_dev.js',
  ...args,
  'node_modules/@deepseek-ai/dsh/lib/bin.js',
  '--profile',
  'web',
];

// 将 vendor node/npm 优先置于 PATH 最前列，与生产/Tauri 环境完全一致
const pathKey =
  Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
const newPath = [
  vendorNodeDir,
  path.join(vendorNodeDir, 'bin'),
  process.env[pathKey],
]
  .filter(Boolean)
  .join(path.delimiter);

const child = spawn(nodeBin, dshArgs, {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    [pathKey]: newPath,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
