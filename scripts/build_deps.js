import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.join(__dirname, '..');
const targetVendorDir = path.join(baseDir, 'src-tauri', 'resources', 'vendor');
const targetZip = path.join(targetVendorDir, 'vendor_deps.zip');
const tempDir = path.join(baseDir, 'temp_deps_build');

console.log('[BuildDeps] 🚀 Starting standalone static dependency builder...');

// Read official DSH version automatically from root package.json
const rootPkgPath = path.join(baseDir, 'package.json');
let dshVersion = "0.1.0-rc.8";
if (fs.existsSync(rootPkgPath)) {
  try {
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
    if (rootPkg.dependencies && rootPkg.dependencies['@deepseek-ai/dsh']) {
      dshVersion = rootPkg.dependencies['@deepseek-ai/dsh'];
    }
  } catch (e) {}
}

console.log(`[BuildDeps] Target @deepseek-ai/dsh version: ${dshVersion}`);

// Copy real physical modules recursively resolving symlinks
function copyRealDir(src, dst) {
  if (!fs.existsSync(src)) return;
  let realSrc = src;
  try { realSrc = fs.realpathSync(src); } catch (e) { return; }
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(realSrc, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.endsWith('.map')) continue;
    const srcPath = path.join(realSrc, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyRealDir(srcPath, dstPath);
    } else if (entry.isFile()) {
      try { fs.copyFileSync(srcPath, dstPath); } catch (e) {}
    } else if (entry.isSymbolicLink()) {
      try {
        const target = fs.realpathSync(srcPath);
        if (fs.statSync(target).isDirectory()) {
          copyRealDir(target, dstPath);
        } else {
          fs.copyFileSync(target, dstPath);
        }
      } catch (e) {}
    }
  }
}

// 1. Prepare sandbox directory (Reuse existing if available for speed)
const srcNodeModInSandbox = path.join(tempDir, 'node_modules');
if (!fs.existsSync(srcNodeModInSandbox)) {
  fs.mkdirSync(tempDir, { recursive: true });
  const cleanPkgJson = {
    name: "jingyun-dsh-deps-sandbox",
    version: "0.1.0",
    private: true,
    dependencies: {
      "@deepseek-ai/dsh": dshVersion
    }
  };
  fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(cleanPkgJson, null, 2));

  console.log('[BuildDeps] Running official npm install in temp sandbox...');
  try {
    execSync('npm install --no-audit --no-fund --omit=dev', { cwd: tempDir, stdio: 'inherit' });
  } catch (e) {
    console.error('[BuildDeps] npm install warning:', e.message);
  }
} else {
  console.log('[BuildDeps] ⚡ Reusing existing npm install sandbox directory!');
}

// 2. Prepare staging node_modules folder
const stagingFolder = path.join(baseDir, 'temp_staging_node_modules');
if (fs.existsSync(stagingFolder)) {
  try { fs.rmSync(stagingFolder, { recursive: true, force: true }); } catch (e) {}
}
const dstNodeMod = path.join(stagingFolder, 'node_modules');
fs.mkdirSync(dstNodeMod, { recursive: true });

console.log('[BuildDeps] Copying pristine node_modules with symlink dereferencing...');
copyRealDir(srcNodeModInSandbox, dstNodeMod);

// Inject real physical @deepseek-ai package with lib/bin.js
const srcDeepseek = path.join(baseDir, 'node_modules', '@deepseek-ai');
const dstDeepseek = path.join(dstNodeMod, '@deepseek-ai');
if (fs.existsSync(srcDeepseek)) {
  console.log('[BuildDeps] Injecting real physical @deepseek-ai runtime packages...');
  copyRealDir(srcDeepseek, dstDeepseek);
}

// Inject @jingyun-ai/jingyun-dsh into @deepseek-ai/dsh dependencies for Healer self-linking
const dshPkgPath = path.join(dstNodeMod, '@deepseek-ai', 'dsh', 'package.json');
if (fs.existsSync(dshPkgPath)) {
  console.log('[BuildDeps] Injecting @jingyun-ai/jingyun-dsh into @deepseek-ai/dsh dependencies...');
  try {
    const pkg = JSON.parse(fs.readFileSync(dshPkgPath, 'utf8'));
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies['@jingyun-ai/jingyun-dsh'] = 'workspace:^';
    fs.writeFileSync(dshPkgPath, JSON.stringify(pkg, null, 2));
  } catch (err) {
    console.error('[BuildDeps] Failed to inject custom plugin dependency:', err.message);
  }
}

// Ensure js-yaml compatibility wrapper
const jsYamlDir = path.join(dstNodeMod, 'js-yaml');
if (fs.existsSync(jsYamlDir)) {
  const jsYamlDist = path.join(jsYamlDir, 'dist');
  fs.mkdirSync(jsYamlDist, { recursive: true });
  const jsYamlMjs = path.join(jsYamlDist, 'js-yaml.mjs');
  fs.writeFileSync(jsYamlMjs, `import jsYaml from '../index.js';
export default jsYaml;
export const load = jsYaml.load;
export const dump = jsYaml.dump;
export const loadAll = jsYaml.loadAll;
export const dumpAll = jsYaml.dumpAll;
export const FAILSAFE_SCHEMA = jsYaml.FAILSAFE_SCHEMA;
export const JSON_SCHEMA = jsYaml.JSON_SCHEMA;
export const DEFAULT_SCHEMA = jsYaml.DEFAULT_SCHEMA;
export const Type = jsYaml.Type;
export const Schema = jsYaml.Schema;
`);
}

// 3. Compress into vendor_deps.zip using .NET Native Zip API for maximum performance
console.log(`[BuildDeps] Ultra-fast compressing into ${targetZip} via .NET Native ZipEngine...`);
fs.mkdirSync(targetVendorDir, { recursive: true });
if (fs.existsSync(targetZip)) {
  try { fs.unlinkSync(targetZip); } catch (e) {
    try { execSync(`powershell -Command "Remove-Item -Path '${targetZip}' -Force -ErrorAction SilentlyContinue"`); } catch (err) {}
  }
}

try {
  const psZipCmd = `Add-Type -Assembly System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${stagingFolder}', '${targetZip}')`;
  execSync(`powershell -Command "${psZipCmd}"`, { stdio: 'inherit' });
  console.log('[BuildDeps] 🎉 Pristine vendor_deps.zip created successfully via .NET ZipEngine!');
} catch (e) {
  console.error('[BuildDeps] Zip compression error:', e.message);
}

// Clean staging folder
try { fs.rmSync(stagingFolder, { recursive: true, force: true }); } catch (e) {}

console.log('[BuildDeps] ✅ Static dependencies build complete!');
