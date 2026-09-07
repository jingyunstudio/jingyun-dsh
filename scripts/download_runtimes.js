import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.join(__dirname, '..');
const targetVendorDir = path.join(baseDir, 'src-tauri', 'resources', 'vendor');
const tempDir = path.join(baseDir, 'temp_runtimes_download');

// 运行时版本与多源下载地址
const RUNTIMES = {
  node: {
    name: 'Node.js (v22.23.2 win-x64)',
    targetDir: path.join(targetVendorDir, 'node'),
    expectedFile: 'node.exe',
    urls: [
      'https://registry.npmmirror.com/-/binary/node/v22.23.2/node-v22.23.2-win-x64.zip',
      'https://nodejs.org/dist/v22.23.2/node-v22.23.2-win-x64.zip',
    ],
  },
  python: {
    name: 'Python (3.11.9 embed-amd64)',
    targetDir: path.join(targetVendorDir, 'python'),
    expectedFile: 'python.exe',
    urls: [
      'https://npmmirror.com/mirrors/python/3.11.9/python-3.11.9-embed-amd64.zip',
      'https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip',
    ],
  },
};

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function extractZip(zipPath, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  try {
    execSync(`tar -xf "${zipPath}" -C "${targetDir}"`, { stdio: 'pipe' });
  } catch {
    const psCmd = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath}', '${targetDir}')`;
    execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'pipe' });
  }
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

async function processNodeRuntime(force = false) {
  const config = RUNTIMES.node;
  const targetExe = path.join(config.targetDir, config.expectedFile);

  if (!force && fs.existsSync(targetExe)) {
    console.log(
      `[RuntimeDownload] 💡 ${config.name} (${config.expectedFile}) 已存在，跳过处理。`
    );
    return;
  }

  console.log(`[RuntimeDownload] 🚀 开始准备 ${config.name}...`);
  const rawZipPath = path.join(tempDir, 'raw_node.zip');
  const extractTempDir = path.join(tempDir, 'extracted_node');

  // 1. 下载原始 zip
  await downloadWithFallback(config.urls, rawZipPath);

  // 2. 解压到临时目录
  console.log(`[RuntimeDownload] 📦 正在解包原始 Node.js 压缩包...`);
  if (fs.existsSync(extractTempDir)) {
    fs.rmSync(extractTempDir, { recursive: true, force: true });
  }
  extractZip(rawZipPath, extractTempDir);

  // 3. 寻找包含 node.exe 的实际根目录 (node-vXX.XX.X-win-x64)
  let contentDir = extractTempDir;
  for (const entry of fs.readdirSync(extractTempDir)) {
    const full = path.join(extractTempDir, entry);
    if (
      fs.statSync(full).isDirectory() &&
      fs.existsSync(path.join(full, 'node.exe'))
    ) {
      contentDir = full;
      break;
    }
  }

  if (!fs.existsSync(path.join(contentDir, 'node.exe'))) {
    throw new Error('解压的 Node.js 压缩包中未找到 node.exe，文件结构异常！');
  }

  // 4. 平铺放置到目标目录
  if (fs.existsSync(config.targetDir)) {
    fs.rmSync(config.targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(config.targetDir, { recursive: true });
  fs.cpSync(contentDir, config.targetDir, { recursive: true });

  // 5. 清理临时文件
  fs.rmSync(rawZipPath, { force: true });
  fs.rmSync(extractTempDir, { recursive: true, force: true });
  console.log(
    `[RuntimeDownload] 🎉 ${config.name} 准备完成: ${config.targetDir}`
  );
}

async function processPythonRuntime(force = false) {
  const config = RUNTIMES.python;
  const targetExe = path.join(config.targetDir, config.expectedFile);

  if (!force && fs.existsSync(targetExe)) {
    console.log(
      `[RuntimeDownload] 💡 ${config.name} (${config.expectedFile}) 已存在，跳过处理。`
    );
    return;
  }

  console.log(`[RuntimeDownload] 🚀 开始准备 ${config.name}...`);
  const rawZipPath = path.join(tempDir, 'raw_python.zip');

  // 1. 下载原始 zip
  await downloadWithFallback(config.urls, rawZipPath);

  // 2. 直接解包到目标目录（Python embed 是平铺结构）
  console.log(`[RuntimeDownload] 📦 正在解包 Python 嵌入式环境...`);
  if (fs.existsSync(config.targetDir)) {
    fs.rmSync(config.targetDir, { recursive: true, force: true });
  }
  extractZip(rawZipPath, config.targetDir);

  if (!fs.existsSync(path.join(config.targetDir, 'python.exe'))) {
    throw new Error('解压的 Python 压缩包中未找到 python.exe！');
  }

  // 3. 启用 site-packages 支持 (解除 python*._pth 中 import site 注释)
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

  // 4. 清理临时文件
  fs.rmSync(rawZipPath, { force: true });
  console.log(
    `[RuntimeDownload] 🎉 ${config.name} 准备完成: ${config.targetDir}`
  );
}

export async function ensureRuntimes(force = false) {
  fs.mkdirSync(targetVendorDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    await processNodeRuntime(force);
    await processPythonRuntime(force);
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
