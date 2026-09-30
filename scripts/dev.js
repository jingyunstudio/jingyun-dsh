import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'tsdown';

import { launchDsh } from './run_dsh.js';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '..');
const pkgDir = path.join(rootDir, 'packages', 'jingyun-dsh');

const bundleWatcher = await build({
  cwd: pkgDir,
  watch: true,
});

let isStopping = false;
async function cleanup() {
  if (isStopping) return;
  isStopping = true;
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
