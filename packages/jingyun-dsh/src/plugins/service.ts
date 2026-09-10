import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

import type { Context } from '@deepseek-ai/cordis';

import { getDshHome } from '../common/paths';

const execFileAsync = promisify(execFile);

// 全局安装互斥锁，防止并发调用导致 pnpm store 冲突
let isCommunityInstalling = false;

// 辅助函数：自动为指定 profile 的 pnpm-workspace.yaml 注入并允许 allowBuilds
function setProfileAllowBuilds(profile: string, packages: string[]) {
  try {
    const file = path.resolve(
      getDshHome(),
      'profiles',
      profile,
      'pnpm-workspace.yaml'
    );
    let yaml = '';
    if (fs.existsSync(file)) {
      yaml = fs.readFileSync(file, 'utf8');
    }

    const eol = /\r\n/.test(yaml) ? '\r\n' : '\n';
    const blockRe = /allowBuilds:[ \t]*\r?\n((?:[ \t]+[^\r\n]*\r?\n?)*)/g;
    const map: Record<string, string> = {};

    const blockMatches = [...yaml.matchAll(blockRe)];
    for (const match of blockMatches) {
      for (const line of match[1].split(/\r?\n/)) {
        const m = /^[ \t]+(\S.*?)\s*:\s*(true|false)?\s*$/.exec(line);
        if (m && m[1]) {
          let key = m[1].trim();
          if (
            (key.startsWith("'") && key.endsWith("'")) ||
            (key.startsWith('"') && key.endsWith('"'))
          ) {
            key = key.slice(1, -1);
          }
          map[key] = m[2] || 'true';
        }
      }
    }

    for (const pkg of packages) {
      if (pkg && pkg.trim()) {
        const cleanKey = pkg.trim();
        if (
          /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i.test(
            cleanKey
          )
        ) {
          map[cleanKey] = 'true';
        }
      }
    }

    const blockLines = Object.entries(map)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join(eol);
    const blockText = `allowBuilds:${eol}${blockLines}${eol}`;

    let nextYaml = '';
    if (blockMatches.length === 0) {
      nextYaml = yaml
        ? `${yaml.replace(/\r?\n?$/, eol)}${blockText}`
        : blockText;
    } else {
      nextYaml = yaml.replace(blockRe, blockText);
    }

    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, nextYaml, 'utf8');
    console.log(
      `[UIBranding] Successfully updated allowBuilds in ${file} with:`,
      packages
    );
  } catch (err: any) {
    console.warn(
      `[UIBranding] Failed to update pnpm-workspace.yaml allowBuilds:`,
      err.message
    );
  }
}

// 辅助函数：清理跨平台 pnpm store 临时锁
function cleanPnpmStoreTmp() {
  try {
    const candidateStoreDirs = [
      // Windows
      path.resolve(
        os.homedir(),
        'AppData',
        'Local',
        'pnpm',
        'store',
        'v10',
        'tmp'
      ),
      // macOS
      path.resolve(os.homedir(), 'Library', 'pnpm', 'store', 'v10', 'tmp'),
      // Linux
      path.resolve(
        os.homedir(),
        '.local',
        'share',
        'pnpm',
        'store',
        'v10',
        'tmp'
      ),
    ];
    for (const storeTmp of candidateStoreDirs) {
      if (fs.existsSync(storeTmp)) {
        const list = fs.readdirSync(storeTmp);
        for (const item of list) {
          if (item.startsWith('_tmp_')) {
            try {
              fs.rmSync(path.join(storeTmp, item), {
                recursive: true,
                force: true,
              });
            } catch {}
          }
        }
      }
    }
  } catch {}
}

// 辅助函数：通过 GitHub 探测对应包名并快速验证 NPM 是否已发布
async function resolveNpmPackageForGithubRepo(
  cleanRepo: string
): Promise<string | null> {
  try {
    const rawUrls = [
      `https://ghfast.top/https://raw.githubusercontent.com/${cleanRepo}/HEAD/package.json`,
      `https://raw.githubusercontent.com/${cleanRepo}/HEAD/package.json`,
    ];
    let pkgName: string | null = null;
    for (const url of rawUrls) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const json = await res.json();
          if (json.name && typeof json.name === 'string') {
            pkgName = json.name.trim();
            break;
          }
        }
      } catch {}
    }

    if (pkgName) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const npmRes = await fetch(
        `https://registry.npmmirror.com/${encodeURIComponent(pkgName)}`,
        {
          method: 'HEAD',
          signal: controller.signal,
        }
      );
      clearTimeout(timer);
      if (npmRes.ok) {
        console.log(
          `[UIBranding] Dynamically detected NPM package for "${cleanRepo}": ${pkgName}`
        );
        return pkgName;
      }
    }
  } catch (e: any) {
    console.warn(
      `[UIBranding] Dynamic NPM check failed for ${cleanRepo}:`,
      e.message
    );
  }
  return null;
}

// 辅助函数：获取绿色运行环境与 DSH CLI 路径
function getDshRuntimeEnv() {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  const appDataDir = isWin
    ? process.env.LOCALAPPDATA || path.resolve(os.homedir(), 'AppData', 'Local')
    : isMac
      ? path.resolve(os.homedir(), 'Library', 'Application Support')
      : process.env.XDG_DATA_HOME ||
        path.resolve(os.homedir(), '.local', 'share');

  const dshHome = getDshHome();
  const candidateVendorDirs = [
    path.resolve(dshHome, 'vendor'),
    path.resolve(appDataDir, 'com.jingyun.dstudio', 'vendor'),
    path.resolve(process.cwd(), 'resources', 'vendor'),
    path.resolve(process.cwd(), 'vendor'),
    path.resolve(dshHome, '..', 'resources', 'vendor'),
    path.resolve(dshHome, '..', 'vendor'),
  ];

  let vendorDir = candidateVendorDirs[0];
  for (const v of candidateVendorDirs) {
    const hasNode =
      fs.existsSync(path.resolve(v, 'node', 'node.exe')) ||
      fs.existsSync(path.resolve(v, 'node', 'bin', 'node')) ||
      fs.existsSync(path.resolve(v, 'node', 'node'));
    if (hasNode) {
      vendorDir = v;
      break;
    }
  }

  const vendorNodeWin = path.resolve(vendorDir, 'node', 'node.exe');
  const vendorNodeUnixBin = path.resolve(vendorDir, 'node', 'bin', 'node');
  const vendorNodeUnixRoot = path.resolve(vendorDir, 'node', 'node');

  let vendorNode = vendorNodeWin;
  if (isWin) {
    vendorNode = vendorNodeWin;
  } else if (fs.existsSync(vendorNodeUnixBin)) {
    vendorNode = vendorNodeUnixBin;
  } else if (fs.existsSync(vendorNodeUnixRoot)) {
    vendorNode = vendorNodeUnixRoot;
  }

  const vendorGit = path.resolve(vendorDir, 'git', 'PortableGit', 'cmd');

  let nodeExec = process.execPath || 'node';
  if (fs.existsSync(vendorNode)) {
    nodeExec = vendorNode;
  }

  let dshBin = '';
  const candidatePaths = [
    path.resolve(
      vendorDir,
      'jingyun',
      'node_modules',
      '@deepseek-ai',
      'dsh',
      'lib',
      'bin.js'
    ),
    path.resolve(
      process.cwd(),
      'node_modules',
      '@deepseek-ai',
      'dsh',
      'lib',
      'bin.js'
    ),
    path.resolve(
      dshHome,
      'node_modules',
      '@deepseek-ai',
      'dsh',
      'lib',
      'bin.js'
    ),
    path.resolve(
      os.homedir(),
      '.dsh',
      'node_modules',
      '@deepseek-ai',
      'dsh',
      'lib',
      'bin.js'
    ),
  ];
  for (const cand of candidatePaths) {
    if (fs.existsSync(cand)) {
      dshBin = cand;
      break;
    }
  }

  const currentPath = process.env.PATH || '';
  const injectedPath = [
    path.dirname(nodeExec),
    vendorGit,
    path.resolve(vendorDir, 'python', 'bin'),
    path.resolve(vendorDir, 'python'),
    currentPath,
  ]
    .filter(Boolean)
    .join(path.delimiter);

  const customEnv: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: injectedPath,
    DSH_HOME: dshHome,
    DSH_CONFIG_DIR: dshHome,
    npm_config_registry: 'https://registry.npmmirror.com',
    CI: 'true',
  };

  return { nodeExec, dshBin, env: customEnv };
}

export async function getInstalledPlugins(ctx: Context) {
  const pluginsMap = new Map<string, any>();
  const registry = (ctx as any).root?.registry || (ctx as any).registry;

  if (registry && typeof registry.entries === 'function') {
    for (const [plugin, state] of registry.entries()) {
      let name = '';
      if (typeof plugin === 'string') name = plugin;
      else if (plugin?.name) name = plugin.name;
      else if (state?.runtime?.name) name = state.runtime.name;
      else if (state?.name) name = state.name;

      if (!name) continue;
      name = name.replace(/^@deepseek-ai\/dsh-/, '');
      if (!name || name.startsWith('client-') || pluginsMap.has(name)) continue;

      const isActive = state?.status === 'active' || state?.active !== false;
      const desc =
        state?.runtime?.description || `DSH 核心底座微内核组件 (${name})`;

      pluginsMap.set(name, {
        id: `dsh-core-${name}`,
        slug: name,
        name: name,
        category: 'plugin',
        sub_category: '系统底座',
        version: state?.runtime?.version || '0.1.0',
        description: desc,
        description_zh: desc,
        tags: ['系统底座'],
        price: 0,
        is_free: true,
        is_builtin: true,
        is_installed: true,
        source: 'builtin',
        author: 'DSH 官方底座',
        status: isActive ? 'installed' : 'disabled',
        created_at: Date.now(),
      });
    }
  }

  try {
    const profilePkgFile = path.resolve(
      getDshHome(),
      'profiles',
      'web',
      'package.json'
    );
    if (fs.existsSync(profilePkgFile)) {
      const profilePkg = JSON.parse(fs.readFileSync(profilePkgFile, 'utf8'));
      const deps: Record<string, any> = {
        ...profilePkg.dependencies,
      };
      const bundles: string[] = profilePkg.dsh?.profile?.bundles || [];
      for (const b of bundles) {
        if (b && !deps[b]) deps[b] = 'installed';
      }
      for (const [depName, ver] of Object.entries(deps)) {
        const isOfficial =
          depName.startsWith('@deepseek-ai/') ||
          depName.startsWith('@jingyun-ai/');
        const cleanName = depName.replace(/^@deepseek-ai\/dsh-/, '');
        if (!pluginsMap.has(cleanName) && !pluginsMap.has(depName)) {
          pluginsMap.set(depName, {
            id: isOfficial ? `builtin-${depName}` : `community-${depName}`,
            slug: depName,
            name: depName,
            category: 'plugin',
            sub_category: isOfficial ? '系统底座' : '社区插件',
            version: typeof ver === 'string' ? ver : '1.0.0',
            description: isOfficial
              ? `DSH 核心底座组件 (${depName})`
              : `已安装的社区插件 (${depName})`,
            description_zh: isOfficial
              ? `DSH 核心底座组件 (${depName})`
              : `已安装的社区插件 (${depName})`,
            tags: [isOfficial ? '系统底座' : '社区插件'],
            price: 0,
            is_free: true,
            is_builtin: isOfficial,
            is_installed: true,
            source: isOfficial ? 'builtin' : 'community',
            author: isOfficial ? 'DSH 官方底座' : '社区',
            status: 'installed',
            created_at: Date.now(),
          });
        }
      }
    }
  } catch (e: any) {
    console.warn(
      '[UIBranding] Failed to read profile package.json for installed plugins:',
      e.message
    );
  }

  const list = Array.from(pluginsMap.values());
  return { success: true, total: list.length, data: list };
}

export async function getCommunityPlugins(options: {
  keyword?: string;
  page?: number;
  limit?: number;
}) {
  const { keyword = '', page = 1, limit = 30 } = options;
  const snapshotPath = path.resolve(__dirname, 'registry-snapshot.json');
  let pluginsList: any[] = [];
  if (fs.existsSync(snapshotPath)) {
    try {
      const content = fs.readFileSync(snapshotPath, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) pluginsList = parsed;
      else if (parsed.objects && Array.isArray(parsed.objects)) {
        pluginsList = parsed.objects.map((obj: any) => ({
          name: obj.package?.name || obj.name,
          version: obj.package?.version || obj.version || '1.0.0',
          description: obj.package?.description || obj.description || '',
          keywords: obj.package?.keywords || obj.keywords || [],
          publisher: obj.package?.publisher || obj.publisher,
          date: obj.package?.date || obj.date,
          links: obj.package?.links || obj.links,
        }));
      }
    } catch {}
  }

  if (keyword) {
    const q = keyword.toLowerCase();
    pluginsList = pluginsList.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (Array.isArray(p.keywords) &&
          p.keywords.some((k: string) => k.toLowerCase().includes(q)))
    );
  }

  const total = pluginsList.length;
  const start = (page - 1) * limit;
  const pagedData = pluginsList.slice(start, start + limit);

  return {
    success: true,
    total,
    page,
    hasMore: start + limit < total,
    data: pagedData,
  };
}

export async function installCommunityPlugin(payload: any) {
  if (isCommunityInstalling) {
    const err: any = new Error('当前已有插件正在安装中，请稍候片刻再试。');
    err.status = 429;
    throw err;
  }

  isCommunityInstalling = true;
  try {
    const { repo, name } = payload;
    if (!repo) throw new Error('Missing parameter: repo');

    console.log(
      `[UIBranding] Installing community plugin from GitHub: ${repo} (Name: ${name || repo})`
    );

    const profileName = 'web';
    const cleanRepo = repo.replace(/^github:/, '').replace(/\.git$/, '');
    let pluginSlug = name || cleanRepo.split('/').pop() || cleanRepo;

    cleanPnpmStoreTmp();
    setProfileAllowBuilds(profileName, [pluginSlug]);

    const { nodeExec, dshBin, env: runEnv } = getDshRuntimeEnv();

    const isNpmPackage =
      payload.npm || cleanRepo.startsWith('@') || !cleanRepo.includes('/');
    let installTarget = cleanRepo;
    if (isNpmPackage) {
      installTarget = payload.npm || cleanRepo;
      pluginSlug = installTarget;
    } else {
      const detectedNpm = await resolveNpmPackageForGithubRepo(cleanRepo);
      if (detectedNpm) {
        installTarget = detectedNpm;
        pluginSlug = detectedNpm;
      } else {
        installTarget = `github:${cleanRepo}`;
      }
    }

    const installArgs = dshBin
      ? [
          dshBin,
          'plugin',
          '--profile',
          profileName,
          'add',
          installTarget,
          '--config.ignore-scripts=true',
          '--registry=https://registry.npmmirror.com',
          '--config.auto-install-peers=false',
          '--config.fetchTimeout=600000',
        ]
      : [
          'plugin',
          '--profile',
          profileName,
          'add',
          installTarget,
          '--config.ignore-scripts=true',
          '--registry=https://registry.npmmirror.com',
          '--config.auto-install-peers=false',
          '--config.fetchTimeout=600000',
        ];

    const execTarget = dshBin ? nodeExec : 'dsh';
    console.log(
      `[UIBranding] Executing community install via execFile: ${execTarget} ${installArgs.join(' ')}`
    );

    let execOutput: { stdout: string; stderr: string } = {
      stdout: '',
      stderr: '',
    };
    try {
      execOutput = await execFileAsync(execTarget, installArgs, {
        cwd: process.cwd(),
        env: runEnv,
        timeout: 600000,
        windowsHide: true,
      });
    } catch (firstErr: any) {
      const errStr = `${firstErr.stdout || ''}\n${firstErr.stderr || ''}\n${firstErr.message || ''}`;
      console.warn(
        '[UIBranding] First install attempt failed. Checking for allowBuilds prompt...',
        errStr
      );

      if (
        errStr.includes('allowBuilds') ||
        errStr.includes('prepare script') ||
        errStr.includes('ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED')
      ) {
        console.log(
          '[UIBranding] Detected allowBuilds interception. Auto-granting build permissions and retrying...'
        );

        const extractedKeys: string[] = [pluginSlug];
        setProfileAllowBuilds(profileName, extractedKeys);

        execOutput = await execFileAsync(execTarget, installArgs, {
          cwd: process.cwd(),
          env: runEnv,
          timeout: 600000,
          windowsHide: true,
        });
      } else {
        let cleanError = firstErr.message || '安装过程中发生异常';
        if (errStr.includes('ETIMEDOUT') || errStr.includes('fetchTimeout')) {
          cleanError = '下载依赖网络超时，请检查网络连接后重试';
        } else if (errStr.includes('404 Not Found')) {
          cleanError = `依赖或包版本未找到 (404): ${pluginSlug}`;
        }
        throw new Error(cleanError);
      }
    }

    try {
      const profilePkgPath = path.resolve(
        getDshHome(),
        'profiles',
        profileName,
        'package.json'
      );
      if (fs.existsSync(profilePkgPath)) {
        const pkgContent = JSON.parse(fs.readFileSync(profilePkgPath, 'utf8'));
        if (!pkgContent.dsh) pkgContent.dsh = {};
        if (!pkgContent.dsh.profile) pkgContent.dsh.profile = {};
        if (!Array.isArray(pkgContent.dsh.profile.bundles))
          pkgContent.dsh.profile.bundles = [];

        if (!pkgContent.dsh.profile.bundles.includes(pluginSlug)) {
          pkgContent.dsh.profile.bundles.push(pluginSlug);
          fs.writeFileSync(
            profilePkgPath,
            JSON.stringify(pkgContent, null, 2),
            'utf8'
          );
          console.log(
            `[UIBranding] Auto-injected ${pluginSlug} into ${profilePkgPath} dsh.profile.bundles`
          );
        }
      }
    } catch (profileErr: any) {
      console.warn(
        '[UIBranding] Non-fatal profile package.json patching error:',
        profileErr.message
      );
    }

    return {
      success: true,
      message: `Plugin ${pluginSlug} installed successfully.`,
      installedSlug: pluginSlug,
      output: execOutput.stdout || '',
    };
  } finally {
    isCommunityInstalling = false;
  }
}

export async function uninstallCommunityPlugin(ctx: Context, payload: any) {
  const { npm, name, repo } = payload;
  const targetPkg = npm || name || repo;
  if (!targetPkg) throw new Error('Missing parameter: target package name');

  console.log(`[UIBranding] Uninstalling community plugin: ${targetPkg}`);
  const profileName = 'web';

  const { nodeExec, dshBin, env: runEnv } = getDshRuntimeEnv();
  const removeArgs = dshBin
    ? [dshBin, 'plugin', '--profile', profileName, 'remove', targetPkg]
    : ['plugin', '--profile', profileName, 'remove', targetPkg];
  const execTarget = dshBin ? nodeExec : 'dsh';

  console.log(
    `[UIBranding] Executing remove via execFile: ${execTarget} ${removeArgs.join(' ')}`
  );
  try {
    await execFileAsync(execTarget, removeArgs, {
      cwd: process.cwd(),
      env: runEnv,
      timeout: 60000,
      windowsHide: true,
    });
  } catch (execErr: any) {
    console.warn(
      '[UIBranding] CLI remove exited with error (will fallback to manual cleanup):',
      execErr.message
    );
  }

  try {
    const profilePkgPath = path.resolve(
      getDshHome(),
      'profiles',
      profileName,
      'package.json'
    );
    if (fs.existsSync(profilePkgPath)) {
      const pkgContent = JSON.parse(fs.readFileSync(profilePkgPath, 'utf8'));
      if (pkgContent.dependencies) {
        delete pkgContent.dependencies[targetPkg];
        delete pkgContent.dependencies[targetPkg.toLowerCase()];
      }
      if (pkgContent.dsh?.profile?.bundles) {
        pkgContent.dsh.profile.bundles = pkgContent.dsh.profile.bundles.filter(
          (b: string) =>
            b.toLowerCase() !== targetPkg.toLowerCase() &&
            !b.toLowerCase().includes(targetPkg.toLowerCase())
        );
      }
      fs.writeFileSync(
        profilePkgPath,
        JSON.stringify(pkgContent, null, 2),
        'utf8'
      );
      console.log(
        `[UIBranding] Successfully removed ${targetPkg} from ${profilePkgPath}`
      );
    }
  } catch (profileErr: any) {
    console.warn(
      '[UIBranding] Error cleaning package.json during uninstall:',
      profileErr.message
    );
  }

  try {
    const registry = (ctx as any).root?.registry || (ctx as any).registry;
    if (registry && typeof registry.entries === 'function') {
      for (const [plugin, state] of registry.entries()) {
        let pName = '';
        if (typeof plugin === 'string') pName = plugin;
        else if (plugin?.name) pName = plugin.name;
        else if (state?.runtime?.name) pName = state.runtime.name;
        else if (state?.name) pName = state.name;

        const cleanTarget = targetPkg
          .replace(/^@deepseek-ai\/dsh-/, '')
          .toLowerCase();
        const cleanP = pName.replace(/^@deepseek-ai\/dsh-/, '').toLowerCase();

        if (
          pName &&
          (cleanP === cleanTarget ||
            pName.toLowerCase() === targetPkg.toLowerCase() ||
            pName.endsWith(targetPkg))
        ) {
          console.log(
            `[UIBranding] Hot-disposing in-memory Cordis plugin instance: "${pName}"`
          );
          if (typeof state?.dispose === 'function') {
            state.dispose();
          }
          if (typeof (ctx as any).dispose === 'function' && plugin) {
            (ctx as any).dispose(plugin);
          }
        }
      }
    }
  } catch (disposeErr: any) {
    console.warn(
      '[UIBranding] Non-fatal in-memory plugin disposal:',
      disposeErr.message
    );
  }

  return {
    success: true,
    message: `Plugin ${targetPkg} uninstalled successfully.`,
  };
}
