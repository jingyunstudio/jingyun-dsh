import { exec, execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

import { Context } from '@deepseek-ai/cordis';

import { sendJson, sendError } from '../common/http';
import { getDshHome } from '../common/paths';

const execAsync = promisify(exec);
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

// 辅助函数：清理 Windows 下 pnpm store 锁
function cleanPnpmStoreTmp() {
  try {
    const storeTmp = path.resolve(
      os.homedir(),
      'AppData',
      'Local',
      'pnpm',
      'store',
      'v10',
      'tmp'
    );
    if (fs.existsSync(storeTmp)) {
      const list = fs.readdirSync(storeTmp);
      for (const item of list) {
        if (item.startsWith('_tmp_')) {
          try {
            fs.rmSync(path.join(storeTmp, item), {
              recursive: true,
              force: true,
            });
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
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
      } catch (e) {}
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
  const localAppData = process.env.LOCALAPPDATA || '';
  const dshHome = getDshHome();
  const candidateVendorDirs = [
    path.resolve(dshHome, 'vendor'),
    path.resolve(localAppData, 'com.jingyun.dstudio', 'vendor'),
    path.resolve(process.cwd(), 'resources', 'vendor'),
    path.resolve(process.cwd(), 'vendor'),
    path.resolve(dshHome, '..', 'resources', 'vendor'),
    path.resolve(dshHome, '..', 'vendor'),
  ];
  let vendorDir = candidateVendorDirs[0];
  for (const v of candidateVendorDirs) {
    if (fs.existsSync(path.resolve(v, 'node', 'node.exe'))) {
      vendorDir = v;
      break;
    }
  }

  const vendorNode = path.resolve(vendorDir, 'node', 'node.exe');
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

export function registerPluginsRoutes(ctx: Context) {
  // 1. 内存中底座插件列表
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/plugins',
    handler: async (req, res) => {
      try {
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
            if (!name || name.startsWith('client-') || pluginsMap.has(name))
              continue;

            const isActive =
              state?.status === 'active' || state?.active !== false;
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
            const profilePkg = JSON.parse(
              fs.readFileSync(profilePkgFile, 'utf8')
            );
            const deps: Record<string, any> = {
              ...(profilePkg.dependencies || {}),
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
                  id: isOfficial
                    ? `builtin-${depName}`
                    : `community-${depName}`,
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
        sendJson(res, { success: true, total: list.length, data: list });
      } catch (err: any) {
        sendError(res, err.message);
      }
    },
  });

  // 2. 获取开源社区插件列表 (读取 registry-snapshot.json)
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/plugins/community',
    handler: async (req, res) => {
      try {
        const urlObj = new URL(
          req.url || '',
          `http://${req.headers.host || '127.0.0.1'}`
        );
        const keyword = urlObj.searchParams.get('keyword') || '';
        const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
        const limit = parseInt(urlObj.searchParams.get('limit') || '30', 10);

        let fullNpmPlugins: any[] = [];
        try {
          const currentDir = path.dirname(fileURLToPath(import.meta.url));
          const sp = path.resolve(
            currentDir,
            '../resources/registry-snapshot.json'
          );

          if (fs.existsSync(sp)) {
            const snap = JSON.parse(fs.readFileSync(sp, 'utf8'));
            if (snap && Array.isArray(snap.plugins)) {
              fullNpmPlugins = snap.plugins
                .filter((p: any) => p && p.npm)
                .map((p: any) => {
                  const descZh =
                    typeof p.description === 'object'
                      ? p.description.zh || p.description.en || ''
                      : p.description || '';
                  return {
                    name: p.name,
                    npm: p.npm,
                    title: p.name,
                    description: descZh || '暂无详细描述',
                    owner: p.owner || 'Community',
                    stars: p.stars || 0,
                    version: '最新版',
                    updatedAt: p.added || '2026-08',
                    topics: [p.category || 'plugin', 'npm-package'],
                    url: p.url || `https://www.npmjs.com/package/${p.npm}`,
                  };
                });
            }
            console.log(
              `[UIBranding] Successfully loaded ${fullNpmPlugins.length} community plugins from ${sp}`
            );
          } else {
            console.warn(
              `[UIBranding] registry-snapshot.json not found at ${sp}`
            );
          }
        } catch (e: any) {
          console.warn('[UIBranding] Failed to read snapshot file:', e.message);
        }

        let resultList = [...fullNpmPlugins];
        if (keyword.trim()) {
          const q = keyword.trim().toLowerCase();
          resultList = resultList.filter(
            (item) =>
              item.name.toLowerCase().includes(q) ||
              item.title.toLowerCase().includes(q) ||
              item.npm.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q) ||
              item.owner.toLowerCase().includes(q) ||
              item.topics.some((t: string) => t.toLowerCase().includes(q))
          );
        }

        resultList.sort((a, b) => (b.stars || 0) - (a.stars || 0));

        const total = resultList.length;
        const startIndex = (page - 1) * limit;
        const paginated = resultList.slice(startIndex, startIndex + limit);

        sendJson(res, {
          success: true,
          total,
          page,
          hasMore: startIndex + limit < total,
          data: paginated,
        });
      } catch (err: any) {
        sendError(res, err.message);
      }
    },
  });

  // 3. 安装开源社区插件 API
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/plugins/install-community',
    handler: async (req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', async () => {
        if (isCommunityInstalling) {
          res.writeHead(429, {
            'Content-Type': 'application/json; charset=utf-8',
          });
          res.end(
            JSON.stringify({
              success: false,
              error: '当前已有插件正在安装中，请稍候片刻再试。',
            })
          );
          return;
        }

        isCommunityInstalling = true;
        try {
          const payload = JSON.parse(body || '{}');
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
            payload.npm ||
            cleanRepo.startsWith('@') ||
            !cleanRepo.includes('/');
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
              if (
                errStr.includes('ETIMEDOUT') ||
                errStr.includes('fetchTimeout')
              ) {
                cleanError = '下载依赖网络超时，请检查网络连接后重试';
              } else if (errStr.includes('404 Not Found')) {
                cleanError = 'NPM 镜像源中未找到该插件版本';
              }
              throw new Error(cleanError);
            }
          }

          console.log(`[UIBranding] Install stdout:`, execOutput.stdout);

          try {
            const profilePkgPath = path.resolve(
              getDshHome(),
              'profiles',
              profileName,
              'package.json'
            );
            if (fs.existsSync(profilePkgPath)) {
              const pkgContent = JSON.parse(
                fs.readFileSync(profilePkgPath, 'utf8')
              );
              const bundleName =
                installTarget || name || repo.split('/').pop() || repo;

              if (!pkgContent.dsh) pkgContent.dsh = {};
              if (!pkgContent.dsh.profile) pkgContent.dsh.profile = {};
              if (!Array.isArray(pkgContent.dsh.profile.bundles))
                pkgContent.dsh.profile.bundles = [];

              if (!pkgContent.dsh.profile.bundles.includes(bundleName)) {
                pkgContent.dsh.profile.bundles.push(bundleName);
                fs.writeFileSync(
                  profilePkgPath,
                  JSON.stringify(pkgContent, null, 2),
                  'utf8'
                );
                console.log(
                  `[UIBranding] Registered bundle "${bundleName}" into ${profilePkgPath}`
                );
              }
            }
          } catch (profileErr: any) {
            console.warn(
              '[UIBranding] Non-fatal profile registration error:',
              profileErr.message
            );
          }

          sendJson(res, {
            success: true,
            message: `Plugin ${installTarget} installed successfully into web profile.`,
          });
        } catch (err: any) {
          console.error(
            '[UIBranding] Failed to install community plugin:',
            err.message
          );
          sendError(res, err.message);
        } finally {
          isCommunityInstalling = false;
        }
      });
    },
  });

  // 4. 卸载开源社区插件 API
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/plugins/uninstall-community',
    handler: async (req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const { npm, name, repo } = payload;
          const targetPkg = npm || name || repo;
          if (!targetPkg)
            throw new Error('Missing parameter: target package name');

          console.log(
            `[UIBranding] Uninstalling community plugin: ${targetPkg}`
          );
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
              const pkgContent = JSON.parse(
                fs.readFileSync(profilePkgPath, 'utf8')
              );
              if (pkgContent.dependencies) {
                delete pkgContent.dependencies[targetPkg];
                delete pkgContent.dependencies[targetPkg.toLowerCase()];
              }
              if (pkgContent.dsh?.profile?.bundles) {
                pkgContent.dsh.profile.bundles =
                  pkgContent.dsh.profile.bundles.filter(
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
            const registry =
              (ctx as any).root?.registry || (ctx as any).registry;
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
                const cleanP = pName
                  .replace(/^@deepseek-ai\/dsh-/, '')
                  .toLowerCase();

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

          sendJson(res, {
            success: true,
            message: `Plugin ${targetPkg} uninstalled successfully.`,
          });
        } catch (err: any) {
          sendError(res, err.message);
        }
      });
    },
  });
}
