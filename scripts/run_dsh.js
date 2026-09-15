import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
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
    : ([
        path.join(vendorNodeDir, 'node'),
        path.join(vendorNodeDir, 'bin', 'node'),
      ].find(fs.existsSync) ?? path.join(vendorNodeDir, 'node'));

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

// 分离 Node 运行时选项（--watch 等）与 DSH 应用参数（--no-open 等）
const args = process.argv.slice(2);
const isNodeOpt = (arg) => /^--(watch|inspect|trace|experimental)/.test(arg);

const dshArgs = [
  '--import',
  './scripts/prepare_dev.js',
  ...args.filter(isNodeOpt),
  'node_modules/@deepseek-ai/dsh/lib/bin.js',
  '--profile',
  'web',
  ...args.filter((arg) => !isNodeOpt(arg)),
];

// 将 $DSH_HOME/bin 与 vendor node/npm 优先置于 PATH 最前列
const defaultDataDir = path.join(rootDir, 'data');
const dshHome =
  process.env.DSH_HOME?.trim() ||
  (fs.existsSync(defaultDataDir)
    ? defaultDataDir
    : path.join(os.homedir(), '.dsh'));
const dshBinDir = path.join(dshHome, 'bin');
const dingtalkConfigDir = path.join(dshHome, 'connectors', 'dingtalk');
const pathKey =
  Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
const envPath = [
  dshBinDir,
  path.join(dshBinDir, 'bin'),
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
    DSH_HOME: dshHome,
    DSH_CONFIG_DIR: dshHome,
    DWS_CONFIG_DIR: process.env.DWS_CONFIG_DIR || dingtalkConfigDir,
    [pathKey]: envPath,
  },
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
