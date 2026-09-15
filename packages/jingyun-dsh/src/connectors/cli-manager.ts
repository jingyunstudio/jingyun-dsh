import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);
import { getDshHome, getDshBinDir } from '../common/paths';
import type { AllCliStatus, CliToolStatus } from './types';

export class CliManagerService {
  private installingPromises = new Map<string, Promise<string>>();
  private versionCache = new Map<string, string>();

  private resolveVendorDir(): string | null {
    const isWin = process.platform === 'win32';
    const appDataDir = isWin
      ? process.env.APPDATA || path.resolve(os.homedir(), 'AppData', 'Roaming')
      : process.env.XDG_DATA_HOME ||
        path.resolve(os.homedir(), '.local', 'share');

    const dshHome = getDshHome();
    const candidates = [
      path.resolve(dshHome, 'vendor'),
      path.resolve(appDataDir, 'com.jingyun.dstudio', 'vendor'),
      path.resolve(process.cwd(), 'src-tauri', 'resources', 'vendor'),
      path.resolve(process.cwd(), 'resources', 'vendor'),
      path.resolve(process.cwd(), 'vendor'),
      path.resolve(dshHome, '..', 'resources', 'vendor'),
      path.resolve(dshHome, '..', 'vendor'),
    ];

    for (const c of candidates) {
      const hasNode =
        fs.existsSync(path.resolve(c, 'node', 'node.exe')) ||
        fs.existsSync(path.resolve(c, 'node', 'bin', 'node')) ||
        fs.existsSync(path.resolve(c, 'node', 'node'));
      if (hasNode) return c;
    }
    return null;
  }

  public resolveNodeDir(): string | null {
    const vendorDir = this.resolveVendorDir();
    if (!vendorDir) return null;
    return path.resolve(vendorDir, 'node');
  }

  public resolveCliExec(name: 'wecom' | 'lark' | 'dingtalk'): string | null {
    const isWin = process.platform === 'win32';
    const baseNames =
      name === 'wecom'
        ? ['wecom-cli']
        : name === 'lark'
          ? ['lark-cli']
          : ['dws'];

    const binDir = getDshBinDir();
    const nodeDir = this.resolveNodeDir();
    const searchDirs = [binDir, nodeDir].filter(Boolean) as string[];

    for (const dir of searchDirs) {
      for (const base of baseNames) {
        if (isWin) {
          const candidates = [
            path.resolve(dir, `${base}.cmd`),
            path.resolve(dir, `${base}.exe`),
            path.resolve(dir, base),
          ];
          for (const candidate of candidates) {
            if (fs.existsSync(candidate)) return candidate;
          }
        } else {
          const candidates = [
            path.resolve(dir, 'bin', base),
            path.resolve(dir, base),
          ];
          for (const candidate of candidates) {
            if (fs.existsSync(candidate)) return candidate;
          }
        }
      }
    }
    return null;
  }

  public resolveNpmPath(): string | null {
    const isWin = process.platform === 'win32';

    const nodeDir = this.resolveNodeDir();
    if (nodeDir) {
      const vendorNpmWin = path.resolve(nodeDir, 'npm.cmd');
      const vendorNpmUnixBin = path.resolve(nodeDir, 'bin', 'npm');
      const vendorNpmUnix = path.resolve(nodeDir, 'npm');

      if (isWin && fs.existsSync(vendorNpmWin)) {
        return vendorNpmWin;
      }
      if (!isWin && fs.existsSync(vendorNpmUnixBin)) {
        return vendorNpmUnixBin;
      }
      if (!isWin && fs.existsSync(vendorNpmUnix)) {
        return vendorNpmUnix;
      }
    }
    return null;
  }
  public async ensureCliExec(
    name: 'wecom' | 'lark' | 'dingtalk'
  ): Promise<string> {
    const existing = this.resolveCliExec(name);
    if (existing) {
      return existing;
    }

    const pending = this.installingPromises.get(name);
    if (pending) {
      return pending;
    }

    const task = (async () => {
      try {
        console.log(
          `[CliManager] CLI '${name}' 未安装，在使用时自动下载安装...`
        );
        const res = await this.installCli(name);
        if (!res.success) {
          throw new Error(`自动安装 ${name} CLI 失败: ${res.message}`);
        }
        const execPath = this.resolveCliExec(name);
        if (!execPath) {
          throw new Error(
            `自动安装 ${name} CLI 完成，但在便携目录下未能找到可执行文件`
          );
        }
        return execPath;
      } finally {
        this.installingPromises.delete(name);
      }
    })();

    this.installingPromises.set(name, task);
    return task;
  }
  public getEnv(): NodeJS.ProcessEnv {
    const isWin = process.platform === 'win32';
    const binDir = getDshBinDir();
    const vendorDir = this.resolveVendorDir();
    const currentPath = process.env.PATH || '';
    const pathParts: string[] = [];

    if (binDir) {
      pathParts.push(binDir);
      if (!isWin) {
        pathParts.push(path.resolve(binDir, 'bin'));
      }
    }

    if (vendorDir) {
      const nodeDir = isWin
        ? path.resolve(vendorDir, 'node')
        : path.resolve(vendorDir, 'node', 'bin');
      pathParts.push(nodeDir);
      if (!isWin) {
        pathParts.push(path.resolve(vendorDir, 'node'));
      }
    }

    const sep = isWin ? ';' : ':';
    const newPath =
      pathParts.length > 0
        ? `${pathParts.join(sep)}${sep}${currentPath}`
        : currentPath;

    return {
      ...process.env,
      PATH: newPath,
    };
  }

  public async getSingleCliStatus(
    name: 'wecom' | 'lark' | 'dingtalk'
  ): Promise<CliToolStatus> {
    const cliExec = this.resolveCliExec(name);
    const isInstalling = this.installingPromises.has(name);
    if (!cliExec) {
      this.versionCache.delete(name);
      return {
        installed: false,
        installing: isInstalling,
        error: isInstalling
          ? '正在自动下载安装中...'
          : '便携 Node 运行时尚未安装此 CLI',
      };
    }

    let version = this.versionCache.get(name);
    if (!version) {
      try {
        const { stdout } = await execAsync(`"${cliExec}" --version`, {
          env: this.getEnv(),
          timeout: 5000,
        });
        const trimmed = stdout.trim();
        version = trimmed.replace(/^.*version\s*/i, '').trim() || trimmed;
        if (version) {
          this.versionCache.set(name, version);
        }
      } catch {
        version = 'installed';
      }
    }

    return {
      installed: true,
      installing: isInstalling,
      version,
      command: cliExec,
    };
  }

  public async getAllStatus(): Promise<AllCliStatus> {
    const [wecom, lark, dingtalk] = await Promise.all([
      this.getSingleCliStatus('wecom'),
      this.getSingleCliStatus('lark'),
      this.getSingleCliStatus('dingtalk'),
    ]);

    const vendorNpm = this.resolveNpmPath();
    const npmAvailable = Boolean(vendorNpm);
    const npmPath = vendorNpm || undefined;

    return {
      wecom,
      lark,
      dingtalk,
      npmAvailable,
      npmPath,
    };
  }

  public async installCli(
    name: 'wecom' | 'lark' | 'dingtalk'
  ): Promise<{ success: boolean; message: string; version?: string }> {
    const npmExec = this.resolveNpmPath();
    const nodeDir = this.resolveNodeDir();
    if (!npmExec || !nodeDir) {
      return {
        success: false,
        message:
          '未检测到便携 Node.js 运行时 (vendor/node)，已禁用回退到系统全局环境',
      };
    }

    let pkgName: string;
    if (name === 'wecom') {
      pkgName = '@wecom/cli';
    } else if (name === 'lark') {
      pkgName = '@larksuite/cli';
    } else {
      pkgName = 'dingtalk-workspace-cli';
    }

    const binDir = getDshBinDir();
    if (!fs.existsSync(binDir)) {
      try {
        fs.mkdirSync(binDir, { recursive: true });
      } catch {}
    }

    const cmd = `"${npmExec}" install -g ${pkgName} --prefix "${binDir}" --registry=https://registry.npmmirror.com`;
    console.log(`[CliManager] Executing install to ${binDir}: ${cmd}`);

    try {
      const { stdout, stderr } = await execAsync(cmd, {
        env: this.getEnv(),
        timeout: 180000,
      });
      console.log(`[CliManager] Install output:`, stdout, stderr);

      const status = await this.getSingleCliStatus(name);
      if (status.installed) {
        return {
          success: true,
          message: `已成功安装 ${pkgName} (${status.version || 'latest'}) 到便携环境`,
          version: status.version,
        };
      } else {
        return {
          success: false,
          message: `安装命令已执行，但检测便携工具未能就绪: ${status.error || 'unknown error'}`,
        };
      }
    } catch (err: unknown) {
      console.error(`[CliManager] Install error:`, err);
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `安装失败: ${message}`,
      };
    }
  }
}

export const cliManager = new CliManagerService();
