import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.join(__dirname, '..');
const targetVendorDir = path.join(baseDir, 'src-tauri', 'resources', 'vendor');
const targetZip = path.join(targetVendorDir, 'vendor_deps.zip');
const tempDir = path.join(baseDir, 'temp_deps_build');

console.log('[BuildDeps] 🚀 Starting standalone static dependency builder...');

// Read official DSH version automatically from root package.json
const rootPkgPath = path.join(baseDir, 'package.json');
let dshVersion = '0.1.0-rc.8';
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
  try {
    realSrc = fs.realpathSync(src);
  } catch (e) {
    return;
  }
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(realSrc, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.endsWith('.map')) continue;
    const srcPath = path.join(realSrc, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyRealDir(srcPath, dstPath);
    } else if (entry.isFile()) {
      try {
        fs.copyFileSync(srcPath, dstPath);
      } catch (e) {}
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

// 1. Prepare staging node_modules folder
const stagingFolder = path.join(baseDir, 'temp_staging_node_modules');
if (fs.existsSync(stagingFolder)) {
  try {
    fs.rmSync(stagingFolder, { recursive: true, force: true });
  } catch (e) {}
}
fs.mkdirSync(stagingFolder, { recursive: true });

const appDataVendor = path.join(
  process.env.LOCALAPPDATA || '',
  'com.jingyun.dstudio',
  'vendor',
  'jingyun'
);
const srcVendor =
  fs.existsSync(path.join(appDataVendor, 'node_modules')) &&
  fs.readdirSync(path.join(appDataVendor, 'node_modules')).length > 10
    ? appDataVendor
    : path.join(tempDir);

console.log(`[BuildDeps] Using pristine dependency source: ${srcVendor}`);

copyRealDir(srcVendor, stagingFolder);

// Ensure @deepseek-ai is included
const srcDeepseek = path.join(baseDir, 'node_modules', '@deepseek-ai');
const dstDeepseek = path.join(stagingFolder, 'node_modules', '@deepseek-ai');
if (fs.existsSync(srcDeepseek)) {
  console.log(
    '[BuildDeps] Injecting real physical @deepseek-ai runtime packages...'
  );
  copyRealDir(srcDeepseek, dstDeepseek);
}

// 3. Compress into vendor_deps.zip using .NET Native Zip API
console.log(`[BuildDeps] Compressing into ${targetZip}...`);
fs.mkdirSync(targetVendorDir, { recursive: true });
if (fs.existsSync(targetZip)) {
  try {
    fs.unlinkSync(targetZip);
  } catch (e) {}
}

try {
  const psCmd = `Add-Type -Assembly System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${stagingFolder.replace(/\\/g, '/')}', '${targetZip.replace(/\\/g, '/')}')`;
  execSync(`powershell -Command "${psCmd}"`, { stdio: 'inherit' });
  console.log('[BuildDeps] 🎉 Pristine vendor_deps.zip created successfully!');
} catch (e) {
  console.error('[BuildDeps] Zip compression error:', e.message);
}

// Clean staging folder
try {
  fs.rmSync(stagingFolder, { recursive: true, force: true });
} catch (e) {}

console.log('[BuildDeps] ✅ Static dependencies build complete!');
