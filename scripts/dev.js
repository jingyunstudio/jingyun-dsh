import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'tsdown';

import { launchDsh } from './run_dsh.js';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '..');
const pkgDir = path.join(rootDir, 'packages', 'jingyun-dsh');

console.log('[Dev Server] 🚀 启动前端增量构建监听 (tsdown watch)...');
const bundleWatcher = await build({
  cwd: pkgDir,
  watch: true,
});

console.log('[Dev Server] 📦 构建就绪，启动 DSH 核心服务...');

let isStopping = false;
async function cleanup() {
  if (isStopping) return;
  isStopping = true;
  console.log('\n[Dev Server] 🛑 正在退出开发服务...');
  if (bundleWatcher?.watch?.close) {
    try {
      await bundleWatcher.watch.close();
    } catch {}
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

await launchDsh();
