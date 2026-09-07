import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.join(__dirname, '..');
const targetDir = path.join(
  baseDir,
  'src-tauri',
  'resources',
  'vendor',
  'jingyun'
);
const dstNodeMod = path.join(targetDir, 'node_modules');

console.log('[BuildDeps] 🚀 Collecting production dependencies...');

// 1. Collect dependencies from .pnpm
const visited = new Map();

function findPackageDir(fromDir, pkgName) {
  let curr = fromDir;
  while (curr && curr !== path.dirname(curr)) {
    const candidate = path.join(curr, 'node_modules', pkgName);
    if (fs.existsSync(candidate)) {
      try {
        return fs.realpathSync(candidate);
      } catch {}
    }
    curr = path.dirname(curr);
  }
  const base = path.join(baseDir, 'node_modules', pkgName);
  return fs.existsSync(base) ? fs.realpathSync(base) : undefined;
}

function collect(pkgName, fromDir) {
  if (visited.has(pkgName) || pkgName.startsWith('@jingyun-ai/')) return;
  const realDir = findPackageDir(fromDir, pkgName);
  if (!realDir) return;
  visited.set(pkgName, realDir);

  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(realDir, 'package.json'), 'utf8')
    );
    for (const dep of Object.keys({
      ...pkg.dependencies,
      ...pkg.peerDependencies,
      ...pkg.optionalDependencies,
    })) {
      collect(dep, realDir);
    }
  } catch {}
}

const pnpmDir = path.join(baseDir, 'node_modules', '.pnpm');
if (fs.existsSync(pnpmDir)) {
  for (const entry of fs.readdirSync(pnpmDir)) {
    const dsDir = path.join(pnpmDir, entry, 'node_modules', '@deepseek-ai');
    if (fs.existsSync(dsDir)) {
      for (const sub of fs.readdirSync(dsDir)) {
        try {
          visited.set(
            `@deepseek-ai/${sub}`,
            fs.realpathSync(path.join(dsDir, sub))
          );
        } catch {}
      }
    }
  }
}

const rootPkg = JSON.parse(
  fs.readFileSync(path.join(baseDir, 'package.json'), 'utf8')
);
for (const dep of Object.keys(rootPkg.dependencies || {})) {
  collect(dep, baseDir);
}
for (const dir of Array.from(visited.values())) {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(dir, 'package.json'), 'utf8')
    );
    for (const dep of Object.keys({
      ...pkg.dependencies,
      ...pkg.peerDependencies,
      ...pkg.optionalDependencies,
    })) {
      collect(dep, dir);
    }
  } catch {}
}

// 2. Direct copy to resources/vendor/jingyun
console.log(
  `[BuildDeps] 📦 Copying ${visited.size} packages directly to resources/vendor/jingyun...`
);
fs.mkdirSync(dstNodeMod, { recursive: true });
for (const [pkgName, realSrc] of visited.entries()) {
  const target = path.join(dstNodeMod, pkgName);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(realSrc, target, {
      recursive: true,
      filter: (f) => !f.endsWith('.map') && !f.includes('.git'),
    });
  }
}

// 3. Inject wrappers & package.json
const jsYamlDir = path.join(dstNodeMod, 'js-yaml');
if (fs.existsSync(jsYamlDir)) {
  fs.mkdirSync(path.join(jsYamlDir, 'dist'), { recursive: true });
  fs.writeFileSync(
    path.join(jsYamlDir, 'dist', 'js-yaml.mjs'),
    `import jsYaml from '../index.js';\nexport default jsYaml;\nexport const { load, dump, loadAll, dumpAll, FAILSAFE_SCHEMA, JSON_SCHEMA, DEFAULT_SCHEMA, Type, Schema } = jsYaml;\n`
  );
}

fs.copyFileSync(
  path.join(baseDir, 'package.json'),
  path.join(targetDir, 'package.json')
);
const dshPkgPath = path.join(dstNodeMod, '@deepseek-ai', 'dsh', 'package.json');
if (fs.existsSync(dshPkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(dshPkgPath, 'utf8'));
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies['@jingyun-ai/jingyun-dsh'] = 'workspace:^';
    fs.writeFileSync(dshPkgPath, JSON.stringify(pkg, null, 2));
  } catch {}
}

console.log('[BuildDeps] ✅ Dependencies ready in resources/vendor/jingyun!');
