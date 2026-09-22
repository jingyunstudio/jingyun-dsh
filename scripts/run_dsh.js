// 修复 Node.js 原生 --watch 注入 WATCH_REPORT_DEPENDENCIES 导致 DSH Windows runner IPC 校验失败的 Bug
delete process.env.WATCH_REPORT_DEPENDENCIES;

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. 自动推导项目根目录或运行基准目录
function resolveRootDir() {
  const currentParent = path.resolve(__dirname, '..');
  // 如果当前在 resources/vendor/jingyun/scripts 下
  if (
    fs.existsSync(path.join(currentParent, 'packages', 'jingyun-dsh')) ||
    fs.existsSync(
      path.join(currentParent, 'node_modules', '@deepseek-ai', 'dsh')
    )
  ) {
    return currentParent;
  }
  return path.resolve(__dirname, '..');
}

const rootDir = resolveRootDir();

// 2. 自动定位 vendor 目录
function resolveVendorDir(appRoot) {
  const candidates = [
    path.join(appRoot, '..'), // 当 appRoot 是 vendor/jingyun 时
    path.join(appRoot, 'src-tauri', 'resources', 'vendor'), // 开发环境
    path.join(appRoot, 'resources', 'vendor'), // 打包资源目录
  ];
  return candidates.find((dir) => fs.existsSync(dir)) || candidates[0];
}

const vendorDir = resolveVendorDir(rootDir);
const vendorNodeDir = path.join(vendorDir, 'node');

// 3. 确定环境与 DSH_HOME 路径
function resolveDshHome(appRoot) {
  if (process.env.DSH_HOME?.trim()) {
    return {
      dshHome: path.resolve(process.env.DSH_HOME.trim()),
      isPortable: process.env.DSH_PORTABLE === '1',
    };
  }

  // 优先检测本地或便携的 data 目录
  const candidates = [
    path.join(appRoot, 'data'),
    path.join(appRoot, '..', 'data'),
    path.join(appRoot, '..', '..', 'data'),
  ];
  const portableData = candidates.find((p) => fs.existsSync(p));
  if (portableData) {
    return {
      dshHome: portableData,
      isPortable: true,
    };
  }

  return {
    dshHome: path.join(os.homedir(), '.dsh'),
    isPortable: false,
  };
}

const { dshHome, isPortable } = resolveDshHome(rootDir);

// 4. 统一环境准备逻辑（收拢原 Rust 与 prepare_dev.js 的逻辑）
export function prepareDshEnvironment() {
  if (!fs.existsSync(dshHome)) {
    fs.mkdirSync(dshHome, { recursive: true });
  }

  // 注入便携与基础环境变量
  process.env.DSH_HOME = dshHome;
  process.env.DSH_CONFIG_DIR = dshHome;
  process.env.ADB_MDNS_AUTO_CONNECT = '0';
  if (isPortable) {
    process.env.DSH_PORTABLE = '1';
  }

  // 清理 data/.env 中被 DSH 规范禁止显式定义的 DSH_* 变量
  const envPath = path.join(dshHome, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const raw = fs.readFileSync(envPath, 'utf8');
      const cleaned = raw
        .split('\n')
        .filter((line) => !line.trim().startsWith('DSH_'))
        .join('\n');
      if (cleaned !== raw) fs.writeFileSync(envPath, cleaned, 'utf8');
    } catch {}
  }

  // 确保 desktop-config.json 存在
  const targetConfig = path.join(dshHome, 'desktop-config.json');
  if (!fs.existsSync(targetConfig)) {
    const candidateConfigs = [
      path.join(rootDir, 'packages', 'jingyun-dsh', 'desktop-config.json'),
      path.join(
        rootDir,
        'packages',
        'jingyun-dsh',
        'desktop-config.example.json'
      ),
      path.join(
        rootDir,
        'node_modules',
        '@jingyun-ai',
        'jingyun-dsh',
        'desktop-config.json'
      ),
      path.join(rootDir, 'desktop-config.json'),
    ];
    const srcConfig = candidateConfigs.find((p) => fs.existsSync(p));
    if (srcConfig) {
      try {
        fs.copyFileSync(srcConfig, targetConfig);
        console.log(`[DSH Runner] 📁 Initialized config: ${targetConfig}`);
      } catch (e) {
        console.warn(`[DSH Runner] ⚠️ Failed to copy config template:`, e);
      }
    }
  }

  // 确保 profiles/web/package.json 存在并包含 @jingyun-ai/jingyun-dsh
  const webProfileDir = path.join(dshHome, 'profiles', 'web');
  const webProfilePkg = path.join(webProfileDir, 'package.json');
  if (!fs.existsSync(webProfileDir)) {
    fs.mkdirSync(webProfileDir, { recursive: true });
  }

  const defaultPkg = {
    name: 'dsh-profile-web',
    private: true,
    dependencies: {},
    dsh: {
      profile: {
        bundles: [
          '@deepseek-ai/dsh-base',
          '@deepseek-ai/dsh-web-app',
          '@jingyun-ai/jingyun-dsh',
        ],
      },
    },
  };

  let needsWriteProfile = true;
  if (fs.existsSync(webProfilePkg)) {
    try {
      const raw = fs.readFileSync(webProfilePkg, 'utf8');
      if (raw.includes('@jingyun-ai/jingyun-dsh')) {
        needsWriteProfile = false;
      }
    } catch {}
  }

  if (needsWriteProfile) {
    try {
      fs.writeFileSync(
        webProfilePkg,
        JSON.stringify(defaultPkg, null, 2),
        'utf8'
      );
      console.log(`[DSH Runner] 📦 Initialized profile: ${webProfilePkg}`);
    } catch (e) {
      console.warn(`[DSH Runner] ⚠️ Failed to write profile:`, e);
    }
  }

  // 如果是在本地开发环境，确保 DSH 的 package.json 注入了 plugin workspace 依赖
  const devDshPkgPath = path.join(
    rootDir,
    'node_modules',
    '@deepseek-ai',
    'dsh',
    'package.json'
  );
  if (fs.existsSync(devDshPkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(devDshPkgPath, 'utf8'));
      if (!pkg.dependencies) pkg.dependencies = {};
      if (!pkg.dependencies['@jingyun-ai/jingyun-dsh']) {
        pkg.dependencies['@jingyun-ai/jingyun-dsh'] = 'workspace:^';
        fs.writeFileSync(devDshPkgPath, JSON.stringify(pkg, null, 2), 'utf8');
      }
    } catch {}
  }

  // 拼接 PATH 环境变量（优先置前：dshHome/bin, node, python, git）
  const dshBinDir = path.join(dshHome, 'bin');
  const pathKey =
    Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
  const currentPath = process.env[pathKey] || '';

  const priorityPaths = [
    dshBinDir,
    path.join(dshBinDir, 'bin'),
    vendorNodeDir,
    path.join(vendorNodeDir, 'bin'),
    path.join(vendorDir, 'python'),
    path.join(vendorDir, 'python', 'bin'),
    path.join(vendorDir, 'adb'),
    path.join(vendorDir, 'git', 'PortableGit', 'cmd'),
  ].filter((p) => fs.existsSync(p));

  process.env[pathKey] = [...priorityPaths, currentPath].join(path.delimiter);

  // 拼接 DWS_CONFIG_DIR
  process.env.DWS_CONFIG_DIR =
    process.env.DWS_CONFIG_DIR || path.join(dshHome, 'connectors', 'dingtalk');
}

export async function launchDsh() {
  const downloadScriptPath = path.join(
    rootDir,
    'scripts',
    'download_runtimes.js'
  );
  if (fs.existsSync(downloadScriptPath)) {
    const { checkRuntimesExist, ensureRuntimes } = await import(
      pathToFileURL(downloadScriptPath).href
    );
    if (!checkRuntimesExist()) {
      console.log(
        '[DSH Runner] ⚠️ 检测到必要运行时环境缺失，正在自动准备 (Node/Python/ADB)...'
      );
      await ensureRuntimes();
    }
  }

  prepareDshEnvironment();

  const rawArgs = process.argv.slice(2).filter((a) => a !== '--tauri');
  const isNodeOpt = (arg) => /^--(watch|inspect|trace|experimental)/.test(arg);
  const hasNodeOpts = rawArgs.some(isNodeOpt);

  const dshBinPath = path.join(
    rootDir,
    'node_modules',
    '@deepseek-ai',
    'dsh',
    'lib',
    'bin.js'
  );

  if (!fs.existsSync(dshBinPath)) {
    console.error(`[DSH Runner] ❌ 未找到 DSH 入口文件: ${dshBinPath}`);
    process.exit(1);
  }

  const finalDshArgs = [];
  if (!rawArgs.includes('--profile')) {
    finalDshArgs.push('--profile', 'web');
  }
  finalDshArgs.push(...rawArgs.filter((arg) => !isNodeOpt(arg)));

  if (hasNodeOpts) {
    const nodeBin = process.execPath;
    const childArgs = [
      ...rawArgs.filter(isNodeOpt),
      dshBinPath,
      ...finalDshArgs,
    ];

    const child = spawn(nodeBin, childArgs, {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('exit', (code, signal) => {
      if (signal) process.kill(process.pid, signal);
      else process.exit(code ?? 0);
    });
  } else {
    process.argv = [process.argv[0], 'dsh', ...finalDshArgs];
    const binUrl = pathToFileURL(dshBinPath).href;
    const { runCli } = await import(binUrl);
    await runCli();
  }
}

// 如果是直接作为脚本执行，则启动 DSH
const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  await launchDsh();
}
