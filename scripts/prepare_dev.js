import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
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

const targetConfig = path.join(dataDir, 'jingyun-config.json');
const srcConfig = path.join(
  rootDir,
  'packages',
  'jingyun-dsh',
  'jingyun-config.json'
);
const exampleConfig = path.join(
  rootDir,
  'packages',
  'jingyun-dsh',
  'jingyun-config.example.json'
);

if (!fs.existsSync(targetConfig)) {
  if (fs.existsSync(srcConfig)) {
    fs.copyFileSync(srcConfig, targetConfig);
    console.log(
      '[DevPrepare] 📁 Initialized data/jingyun-config.json from packages/jingyun-dsh/jingyun-config.json'
    );
  } else if (fs.existsSync(exampleConfig)) {
    fs.copyFileSync(exampleConfig, targetConfig);
    console.log(
      '[DevPrepare] 📁 Initialized data/jingyun-config.json from example template'
    );
  }
}
