import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import { fileURLToPath } from 'url';

import decompress from 'decompress';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.join(__dirname, '..');
const targetVendorDir = path.join(baseDir, 'src-tauri', 'resources', 'vendor');
const tempDir = path.join(baseDir, 'temp_runtimes_download');

export function resolveTargetPlatformAndArch() {
  const targetTriple =
    process.env.TAURI_ENV_TARGET_TRIPLE || process.env.TARGET || '';
  const rawPlatform =
    process.env.TARGET_PLATFORM ||
    (targetTriple.includes('darwin') || targetTriple.includes('apple')
      ? 'darwin'
      : targetTriple.includes('linux')
        ? 'linux'
        : targetTriple.includes('windows')
          ? 'win32'
          : process.platform);
  const rawArch =
    process.env.TARGET_ARCH ||
    process.env.TAURI_ENV_ARCH ||
    (targetTriple.includes('aarch64') || targetTriple.includes('arm64')
      ? 'arm64'
      : targetTriple.includes('x86_64')
        ? 'x64'
        : process.arch);

  let platform = 'win32';
  if (
    rawPlatform.includes('darwin') ||
    rawPlatform.includes('mac') ||
    rawPlatform.includes('apple')
  ) {
    platform = 'darwin';
  } else if (rawPlatform.includes('linux')) {
    platform = 'linux';
  } else if (rawPlatform.includes('win')) {
    platform = 'win32';
  }

  let arch = 'x64';
  if (rawArch === 'arm64' || rawArch === 'aarch64') {
    arch = 'arm64';
  } else {
    arch = 'x64';
  }

  return { platform, arch };
}

export function getRuntimeConfig(platform, arch) {
  if (!platform || !arch) {
    const resolved = resolveTargetPlatformAndArch();
    platform = resolved.platform;
    arch = resolved.arch;
  }

  const isWin = platform === 'win32';
  const isMac = platform === 'darwin';

  // 1. Node.js 配置 (v24.20.0)
  const nodeVersion = 'v24.20.0';
  let nodeConfig;
  if (isWin) {
    nodeConfig = {
      name: `Node.js (${nodeVersion} win-${arch})`,
      targetDir: path.join(targetVendorDir, 'node'),
      expectedFile: 'node.exe',
      urls: [
        `https://registry.npmmirror.com/-/binary/node/${nodeVersion}/node-${nodeVersion}-win-${arch}.zip`,
        `https://nodejs.org/dist/${nodeVersion}/node-${nodeVersion}-win-${arch}.zip`,
      ],
    };
  } else if (isMac) {
    nodeConfig = {
      name: `Node.js (${nodeVersion} darwin-${arch})`,
      targetDir: path.join(targetVendorDir, 'node'),
      expectedFile: path.join('bin', 'node'),
      urls: [
        `https://registry.npmmirror.com/-/binary/node/${nodeVersion}/node-${nodeVersion}-darwin-${arch}.tar.gz`,
        `https://nodejs.org/dist/${nodeVersion}/node-${nodeVersion}-darwin-${arch}.tar.gz`,
      ],
    };
  } else {
    // Linux
    nodeConfig = {
      name: `Node.js (${nodeVersion} linux-${arch})`,
      targetDir: path.join(targetVendorDir, 'node'),
      expectedFile: path.join('bin', 'node'),
      urls: [
        `https://registry.npmmirror.com/-/binary/node/${nodeVersion}/node-${nodeVersion}-linux-${arch}.tar.gz`,
        `https://nodejs.org/dist/${nodeVersion}/node-${nodeVersion}-linux-${arch}.tar.gz`,
      ],
    };
  }

  // 2. Python 配置 (3.11.9)
  const pyVersion = '3.11.9';
  let pythonConfig;
  if (isWin) {
    pythonConfig = {
      name: `Python (${pyVersion} embed-amd64)`,
      targetDir: path.join(targetVendorDir, 'python'),
      expectedFile: 'python.exe',
      urls: [
        `https://npmmirror.com/mirrors/python/${pyVersion}/python-${pyVersion}-embed-amd64.zip`,
        `https://www.python.org/ftp/python/${pyVersion}/python-${pyVersion}-embed-amd64.zip`,
      ],
    };
  } else if (isMac) {
    const targetTriple =
      arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin';
    const filename = `cpython-${pyVersion}+20240415-${targetTriple}-install_only.tar.gz`;
    pythonConfig = {
      name: `Python (${pyVersion} standalone-${arch}-darwin)`,
      targetDir: path.join(targetVendorDir, 'python'),
      expectedFile: path.join('bin', 'python3'),
      urls: [
        `https://github.com/astral-sh/python-build-standalone/releases/download/20240415/${filename}`,
        `https://ghfast.top/https://github.com/astral-sh/python-build-standalone/releases/download/20240415/${filename}`,
      ],
    };
  } else {
    // Linux
    const targetTriple =
      arch === 'arm64'
        ? 'aarch64-unknown-linux-gnu'
        : 'x86_64-unknown-linux-gnu';
    const filename = `cpython-${pyVersion}+20240415-${targetTriple}-install_only.tar.gz`;
    pythonConfig = {
      name: `Python (${pyVersion} standalone-${arch}-linux)`,
      targetDir: path.join(targetVendorDir, 'python'),
      expectedFile: path.join('bin', 'python3'),
      urls: [
        `https://github.com/astral-sh/python-build-standalone/releases/download/20240415/${filename}`,
        `https://ghfast.top/https://github.com/astral-sh/python-build-standalone/releases/download/20240415/${filename}`,
      ],
    };
  }

  // 3. ADB 运行时配置
  let adbConfig;
  if (isWin) {
    adbConfig = {
      name: `ADB (win)`,
      targetDir: path.join(targetVendorDir, 'adb'),
      expectedFile: 'adb.exe',
      urls: [
        'https://dl.google.com/android/repository/platform-tools-latest-windows.zip',
      ],
    };
  } else if (isMac) {
    adbConfig = {
      name: `ADB (darwin)`,
      targetDir: path.join(targetVendorDir, 'adb'),
      expectedFile: 'adb',
      urls: [
        'https://dl.google.com/android/repository/platform-tools-latest-darwin.zip',
      ],
    };
  } else {
    adbConfig = {
      name: `ADB (linux)`,
      targetDir: path.join(targetVendorDir, 'adb'),
      expectedFile: 'adb',
      urls: [
        'https://dl.google.com/android/repository/platform-tools-latest-linux.zip',
      ],
    };
  }

  return {
    node: nodeConfig,
    python: pythonConfig,
    adb: adbConfig,
    platform,
    arch,
  };
}

export function checkRuntimesExist(platform, arch) {
  const configs = getRuntimeConfig(platform, arch);
  const nodeExpected = path.join(
    configs.node.targetDir,
    configs.node.expectedFile
  );
  const pythonExpected = path.join(
    configs.python.targetDir,
    configs.python.expectedFile
  );
  const adbExpected = path.join(
    configs.adb.targetDir,
    configs.adb.expectedFile
  );

  const hasNodeBinary =
    fs.existsSync(nodeExpected) ||
    fs.existsSync(path.join(configs.node.targetDir, 'node')) ||
    fs.existsSync(path.join(configs.node.targetDir, 'node.exe'));

  const hasNpmBinary =
    fs.existsSync(path.join(configs.node.targetDir, 'npm.cmd')) ||
    fs.existsSync(path.join(configs.node.targetDir, 'npm')) ||
    fs.existsSync(path.join(configs.node.targetDir, 'bin', 'npm'));

  const nodeOk = hasNodeBinary && hasNpmBinary;

  const pythonOk =
    fs.existsSync(pythonExpected) ||
    fs.existsSync(path.join(configs.python.targetDir, 'python')) ||
    fs.existsSync(path.join(configs.python.targetDir, 'python.exe')) ||
    fs.existsSync(path.join(configs.python.targetDir, 'python3'));

  const adbOk = fs.existsSync(adbExpected);

  return nodeOk && pythonOk && adbOk;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

async function downloadWithFallback(urls, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  let lastError = null;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      console.log(
        `[RuntimeDownload] 📥 正在从下载源 [${i + 1}/${urls.length}] 下载: ${url}`
      );
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) {
        throw new Error(
          `HTTP 状态码异常: ${response.status} ${response.statusText}`
        );
      }

      const totalBytes = Number(response.headers.get('content-length') || 0);
      let receivedBytes = 0;
      let lastPercent = -1;

      const fileStream = fs.createWriteStream(destPath);
      const stream = Readable.fromWeb(response.body);

      stream.on('data', (chunk) => {
        receivedBytes += chunk.length;
        if (totalBytes > 0) {
          const percent = Math.floor((receivedBytes / totalBytes) * 100);
          if (percent !== lastPercent && percent % 10 === 0) {
            process.stdout.write(
              `\r[RuntimeDownload] ⏳ 进度: ${percent}% (${formatBytes(receivedBytes)} / ${formatBytes(totalBytes)})`
            );
            lastPercent = percent;
          }
        }
      });

      await finished(stream.pipe(fileStream));
      process.stdout.write('\n');
      console.log(
        `[RuntimeDownload] ✅ 下载完成: ${destPath} (${formatBytes(receivedBytes)})`
      );
      return;
    } catch (err) {
      console.warn(`[RuntimeDownload] ⚠️ 源 [${url}] 失败: ${err.message}`);
      lastError = err;
      if (fs.existsSync(destPath)) {
        try {
          fs.rmSync(destPath, { force: true });
        } catch {}
      }
    }
  }

  throw new Error(`所有可用下载源均失败! 最后一个错误: ${lastError?.message}`);
}

async function processNodeRuntime(config, force = false) {
  const targetExpected = path.join(config.targetDir, config.expectedFile);

  if (!force && fs.existsSync(targetExpected)) {
    console.log(
      `[RuntimeDownload] 💡 ${config.name} (${config.expectedFile}) 已存在，跳过处理。`
    );
    return;
  }

  console.log(`[RuntimeDownload] 🚀 开始准备 ${config.name}...`);
  const rawArchivePath = path.join(tempDir, `raw_node_archive`);
  const extractTempDir = path.join(tempDir, 'extracted_node');

  // 1. 下载原始包
  await downloadWithFallback(config.urls, rawArchivePath);

  // 2. 一行代码使用 decompress 解压 (支持 .zip 与 .tar.gz)
  console.log(`[RuntimeDownload] 📦 正在解压 Node.js 运行时...`);
  // 2. 提取 Node.js 及配套的 NPM 工具链 (跳过无关的 include/share 等开发头文件)
  console.log(
    `[RuntimeDownload] 📦 正在从压缩包提取 Node.js 及完整 NPM 工具链...`
  );
  if (fs.existsSync(extractTempDir)) {
    fs.rmSync(extractTempDir, { recursive: true, force: true });
  }

  const isNeededNodeFile = (file) => {
    const p = file.path.replace(/\\/g, '/');
    const parts = p.split('/');
    if (parts.length <= 1) return true;
    const rel = parts.slice(1).join('/');

    // Windows 单文件及模块
    if (
      rel === 'node.exe' ||
      rel === 'npm' ||
      rel === 'npm.cmd' ||
      rel === 'npx' ||
      rel === 'npx.cmd'
    )
      return true;
    if (rel.startsWith('node_modules/npm')) return true;

    // Unix 结构
    if (rel === 'bin/node' || rel === 'bin/npm' || rel === 'bin/npx')
      return true;
    if (rel.startsWith('lib/node_modules/npm')) return true;

    return false;
  };

  await decompress(rawArchivePath, extractTempDir, {
    filter: isNeededNodeFile,
  });

  // 3. 递归寻找解压出的包含 node / node.exe 的根目录
  let foundRoot = null;
  function findNodeRoot(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (
        (stat.isFile() && (entry === 'node.exe' || entry === 'node')) ||
        (stat.isDirectory() &&
          entry === 'bin' &&
          fs.existsSync(path.join(full, 'node')))
      ) {
        foundRoot = dir;
        return;
      }
      if (stat.isDirectory()) {
        findNodeRoot(full);
        if (foundRoot) return;
      }
    }
  }
  findNodeRoot(extractTempDir);

  if (!foundRoot) {
    throw new Error(`未能在解压产物中找到 node 可执行文件或根目录!`);
  }

  // 4. 将提取内容平铺同步到目标目录
  if (fs.existsSync(config.targetDir)) {
    fs.rmSync(config.targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(config.targetDir, { recursive: true });
  fs.cpSync(foundRoot, config.targetDir, { recursive: true });

  // 5. 实体化软链接 (防止 Tauri walkdir 打包报错) 并赋予执行权限
  resolveAllSymlinks(config.targetDir);
  if (process.platform !== 'win32') {
    const binDir = path.join(config.targetDir, 'bin');
    if (fs.existsSync(binDir)) {
      for (const f of fs.readdirSync(binDir)) {
        try {
          fs.chmodSync(path.join(binDir, f), 0o755);
        } catch {}
      }
    }
  }

  // 6. 清理临时文件
  fs.rmSync(rawArchivePath, { force: true });
  fs.rmSync(extractTempDir, { recursive: true, force: true });
  console.log(
    `[RuntimeDownload] 🎉 ${config.name} 准备完成 (已包含完整 npm 工具链)`
  );
}

/**
 * 递归遍历目录，将所有符号链接实体化为真实物理文件，并删除失效链接
 * 解决 Tauri 在打包 bundle.resources 时 walkdir 遇到相对符号链接判定不存在导致构建失败的问题
 */
function resolveAllSymlinks(dir) {
  if (!fs.existsSync(dir)) return;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    try {
      const lstat = fs.lstatSync(fullPath);
      if (lstat.isSymbolicLink()) {
        try {
          const realPath = fs.realpathSync(fullPath);
          if (fs.existsSync(realPath)) {
            const realStat = fs.statSync(realPath);
            fs.unlinkSync(fullPath);
            if (realStat.isDirectory()) {
              fs.cpSync(realPath, fullPath, { recursive: true });
              resolveAllSymlinks(fullPath);
            } else {
              fs.copyFileSync(realPath, fullPath);
              if (process.platform !== 'win32') {
                try {
                  fs.chmodSync(fullPath, realStat.mode);
                } catch {}
              }
            }
          } else {
            // 目标不存在，直接移除失效的死链接
            fs.unlinkSync(fullPath);
          }
        } catch {
          try {
            fs.unlinkSync(fullPath);
          } catch {}
        }
      } else if (lstat.isDirectory()) {
        resolveAllSymlinks(fullPath);
      }
    } catch {}
  }
}

async function processPythonRuntime(config, force = false) {
  const targetExpected = path.join(config.targetDir, config.expectedFile);

  if (!force && fs.existsSync(targetExpected)) {
    console.log(
      `[RuntimeDownload] 💡 ${config.name} (${config.expectedFile}) 已存在，跳过处理。`
    );
    return;
  }

  console.log(`[RuntimeDownload] 🚀 开始准备 ${config.name}...`);
  const rawArchivePath = path.join(tempDir, `raw_python_archive`);
  const extractTempDir = path.join(tempDir, 'extracted_python');

  // 1. 下载原始包
  await downloadWithFallback(config.urls, rawArchivePath);

  // 2. 一行代码使用 decompress 解压
  console.log(`[RuntimeDownload] 📦 正在解压 Python 运行时环境...`);
  if (fs.existsSync(extractTempDir)) {
    fs.rmSync(extractTempDir, { recursive: true, force: true });
  }
  await decompress(rawArchivePath, extractTempDir);

  // 3. 寻找实际目录（Windows embed 是平铺的，standalone 通常有一层 python/）
  let contentDir = extractTempDir;
  const subEntries = fs.readdirSync(extractTempDir);
  for (const entry of subEntries) {
    const full = path.join(extractTempDir, entry);
    if (fs.statSync(full).isDirectory()) {
      if (
        fs.existsSync(path.join(full, 'python.exe')) ||
        fs.existsSync(path.join(full, 'bin', 'python3')) ||
        fs.existsSync(path.join(full, 'bin', 'python'))
      ) {
        contentDir = full;
        break;
      }
    }
  }

  // 4. 平铺放置到目标目录
  if (fs.existsSync(config.targetDir)) {
    fs.rmSync(config.targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(config.targetDir, { recursive: true });
  fs.cpSync(contentDir, config.targetDir, { recursive: true });

  // 5. 清理 bin 目录下无用的辅助工具（2to3, idle3, pydoc 等）
  const binDir = path.join(config.targetDir, 'bin');
  if (fs.existsSync(binDir)) {
    try {
      for (const name of fs.readdirSync(binDir)) {
        if (
          name.startsWith('2to3') ||
          name.startsWith('idle') ||
          name.startsWith('pydoc')
        ) {
          try {
            fs.rmSync(path.join(binDir, name), {
              force: true,
              recursive: true,
            });
          } catch {}
        }
      }
    } catch {}
  }

  // 6. 递归解除所有符号链接，将其转化为实体物理文件，消除 Tauri 打包报错
  console.log(`[RuntimeDownload] 🔗 正在实体化符号链接并清理死链...`);
  resolveAllSymlinks(config.targetDir);

  // 7. Windows 启用 site-packages 支持 (解除 python*._pth 中 import site 注释)
  const pthFiles = fs
    .readdirSync(config.targetDir)
    .filter((f) => f.endsWith('._pth'));
  for (const pthFile of pthFiles) {
    const pthPath = path.join(config.targetDir, pthFile);
    let pthContent = fs.readFileSync(pthPath, 'utf8');
    if (pthContent.includes('#import site')) {
      pthContent = pthContent.replace('#import site', 'import site');
      fs.writeFileSync(pthPath, pthContent, 'utf8');
      console.log(
        `[RuntimeDownload] 🔧 已为 ${pthFile} 启用 import site 支持。`
      );
    }
  }

  // 8. Unix 下赋予可执行权限
  if (process.platform !== 'win32') {
    if (fs.existsSync(binDir)) {
      try {
        for (const entry of fs.readdirSync(binDir)) {
          try {
            fs.chmodSync(path.join(binDir, entry), 0o755);
          } catch {}
        }
      } catch {}
    }
  }

  // 9. 清理临时文件
  fs.rmSync(rawArchivePath, { force: true });
  fs.rmSync(extractTempDir, { recursive: true, force: true });
  console.log(
    `[RuntimeDownload] 🎉 ${config.name} 准备完成: ${config.targetDir}`
  );
}

async function processAdbRuntime(config, force = false) {
  const targetExpected = path.join(config.targetDir, config.expectedFile);

  if (!force && fs.existsSync(targetExpected)) {
    console.log(
      `[RuntimeDownload] 💡 ${config.name} (${config.expectedFile}) 已存在，跳过处理。`
    );
    return;
  }

  console.log(`[RuntimeDownload] 🚀 开始准备 ${config.name}...`);
  const rawArchivePath = path.join(tempDir, `raw_adb.zip`);
  const extractTempDir = path.join(tempDir, 'extracted_adb');

  // 1. 下载原始包
  await downloadWithFallback(config.urls, rawArchivePath);

  // 2. 解压
  console.log(`[RuntimeDownload] 📦 正在解压 ADB...`);
  if (fs.existsSync(extractTempDir)) {
    fs.rmSync(extractTempDir, { recursive: true, force: true });
  }

  await decompress(rawArchivePath, extractTempDir);

  // 3. 校验解压出的 platform-tools 根目录（Google 官方 zip 压缩包顶层目录为 platform-tools）
  const adbDir = path.join(extractTempDir, 'platform-tools');
  const adbBinary = path.join(adbDir, config.expectedFile);
  if (!fs.existsSync(adbBinary)) {
    throw new Error(`解压后的目录中未能找到期望的可执行文件: ${adbBinary}`);
  }

  // 4. 清理旧 targetDir 并移入文件到 vendor/adb
  if (fs.existsSync(config.targetDir)) {
    fs.rmSync(config.targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(config.targetDir, { recursive: true });

  for (const item of fs.readdirSync(adbDir)) {
    const srcItem = path.join(adbDir, item);
    const destItem = path.join(config.targetDir, item);
    fs.cpSync(srcItem, destItem, { recursive: true });
  }

  // 5. Unix 赋权
  if (process.platform !== 'win32') {
    const unixAdb = path.join(config.targetDir, 'adb');
    if (fs.existsSync(unixAdb)) {
      fs.chmodSync(unixAdb, 0o755);
    }
  }

  // 6. 清理临时文件
  fs.rmSync(rawArchivePath, { force: true });
  fs.rmSync(extractTempDir, { recursive: true, force: true });
  console.log(
    `[RuntimeDownload] 🎉 ${config.name} 准备完成: ${config.targetDir}`
  );
}

export async function ensureRuntimes(
  force = false,
  targetPlatform,
  targetArch
) {
  fs.mkdirSync(targetVendorDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const runtimes = getRuntimeConfig(targetPlatform, targetArch);

  try {
    await processNodeRuntime(runtimes.node, force);
    await processPythonRuntime(runtimes.python, force);
    await processAdbRuntime(runtimes.adb, force);
    console.log('[RuntimeDownload] ✨ 所有运行时环境准备完毕！');
  } finally {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const force = process.argv.includes('--force');
  ensureRuntimes(force).catch((err) => {
    console.error('[RuntimeDownload] ❌ 运行时下载与准备失败:', err);
    process.exit(1);
  });
}
