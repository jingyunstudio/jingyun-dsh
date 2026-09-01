import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dshPkgPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@deepseek-ai',
  'dsh',
  'package.json'
);

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
} else {
  console.warn(
    '[DevPrepare] ⚠️ node_modules/@deepseek-ai/dsh/package.json not found. Make sure pnpm install is complete.'
  );
}
