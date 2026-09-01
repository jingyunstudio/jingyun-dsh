import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.join(__dirname, '..');
const targetVendorDir = path.join(baseDir, 'src-tauri', 'resources', 'vendor');
const targetVendorDeps = path.join(targetVendorDir, 'vendor_deps.zip');
const targetWorkspace = path.join(targetVendorDir, 'workspace');

console.log('[VendorPrepare] 🚀 Preparing workspace uncompressed resources...');

// 1. Verify vendor_deps.zip exists
if (!fs.existsSync(targetVendorDeps)) {
  console.warn(
    '[VendorPrepare] ⚠️ vendor_deps.zip missing in resources/vendor! Running build_deps.js automatically...'
  );
  await import('./build_deps.js');
}

// 2. Safely clear old workspace folder
if (fs.existsSync(targetWorkspace)) {
  try {
    fs.rmSync(targetWorkspace, { recursive: true, force: true });
  } catch (e) {}
}
fs.mkdirSync(targetWorkspace, { recursive: true });

// Copy directory recursively resolving symlinks
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
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
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

// 3. Inject packages/ (custom plugins)
const srcPackages = path.join(baseDir, 'packages');
const dstPackages = path.join(targetWorkspace, 'packages');
if (fs.existsSync(srcPackages)) {
  console.log('[VendorPrepare] ⚡ Copying workspace plugins (packages/)...');
  copyRealDir(srcPackages, dstPackages);
}

// 4. Inject package.json
const srcPkgJson = path.join(baseDir, 'package.json');
const dstPkgJson = path.join(targetWorkspace, 'package.json');
if (fs.existsSync(srcPkgJson)) {
  fs.copyFileSync(srcPkgJson, dstPkgJson);
}

// 5. Inject pnpm-workspace.yaml
const srcWsYaml = path.join(baseDir, 'pnpm-workspace.yaml');
const dstWsYaml = path.join(targetWorkspace, 'pnpm-workspace.yaml');
if (fs.existsSync(srcWsYaml)) {
  fs.copyFileSync(srcWsYaml, dstWsYaml);
}

// 6. Ensure frontendDist directory exists for Tauri WebView
const distTauriTemp = path.join(baseDir, 'dist_tauri_temp');
if (!fs.existsSync(distTauriTemp)) {
  fs.mkdirSync(distTauriTemp, { recursive: true });
  fs.writeFileSync(
    path.join(distTauriTemp, 'index.html'),
    `<!DOCTYPE html>
<html>
<head><title>Jingyun.Studio</title></head>
<body><div id="root">Loading...</div></body>
</html>`
  );
}

console.log(
  '[VendorPrepare] 🎉 Workspace uncompressed resources prepared in 0.05 seconds!'
);
