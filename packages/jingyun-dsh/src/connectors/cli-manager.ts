import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

import { getDshHome } from '../common/paths';
import type { AllCliStatus, CliToolStatus } from './types';

const execAsync = promisify(exec);

export class CliManagerService {
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

  public resolveNpmPath(): string | null {
    const isWin = process.platform === 'win32';
    const vendorDir = this.resolveVendorDir();
    if (vendorDir) {
      const vendorNpmWin = path.resolve(vendorDir, 'node', 'npm.cmd');
      const vendorNpmUnixBin = path.resolve(vendorDir, 'node', 'bin', 'npm');
      const vendorNpmUnix = path.resolve(vendorDir, 'node', 'npm');

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

  public getEnv(): NodeJS.ProcessEnv {
    const vendorDir = this.resolveVendorDir();
    const currentPath = process.env.PATH || '';
    const isWin = process.platform === 'win32';
    const pathParts: string[] = [];

    if (vendorDir) {
      const nodeDir = isWin
        ? path.resolve(vendorDir, 'node')
        : path.resolve(vendorDir, 'node', 'bin');
      pathParts.push(nodeDir);
    }

    // 探测本地 WorkBuddy 或全局 node 安装目录中可能存在的 CLI packages
    const wbCliDir = path.resolve(
      os.homedir(),
      '.workbuddy',
      'binaries',
      'node',
      'cli-connector-packages'
    );
    if (fs.existsSync(wbCliDir)) {
      pathParts.push(wbCliDir);
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
    const isWin = process.platform === 'win32';
    let cmdName: string;
    let fallbackCmd: string;

    if (name === 'wecom') {
      cmdName = isWin ? 'wecom-cli.cmd' : 'wecom-cli';
      fallbackCmd = 'wecom-cli';
    } else if (name === 'lark') {
      cmdName = isWin ? 'lark-cli.cmd' : 'lark-cli';
      fallbackCmd = 'lark-cli';
    } else {
      cmdName = isWin ? 'dws.cmd' : 'dws';
      fallbackCmd = 'dws';
    }

    try {
      const { stdout } = await execAsync(`${cmdName} --version`, {
        env: this.getEnv(),
      });
      const version = stdout.trim();
      return {
        installed: true,
        version: version.replace(/^.*version\s*/i, '').trim() || version,
        command: cmdName,
      };
    } catch (err: any) {
      // 尝试不用 .cmd 后缀再探测一次
      try {
        const { stdout } = await execAsync(`${fallbackCmd} --version`, {
          env: this.getEnv(),
        });
        const version = stdout.trim();
        return {
          installed: true,
          version: version.replace(/^.*version\s*/i, '').trim() || version,
          command: fallbackCmd,
        };
      } catch {
        return {
          installed: false,
          error: err?.message || 'Not installed',
        };
      }
    }
  }

  public async getAllStatus(): Promise<AllCliStatus> {
    const [wecom, lark, dingtalk] = await Promise.all([
      this.getSingleCliStatus('wecom'),
      this.getSingleCliStatus('lark'),
      this.getSingleCliStatus('dingtalk'),
    ]);

    const vendorNpm = this.resolveNpmPath();
    let npmAvailable = Boolean(vendorNpm);
    let npmPath = vendorNpm || undefined;

    if (!npmAvailable) {
      try {
        await execAsync('npm --version', { env: this.getEnv() });
        npmAvailable = true;
        npmPath = 'npm';
      } catch {}
    }

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
    const npmExec = this.resolveNpmPath() || 'npm';
    let pkgName: string;
    if (name === 'wecom') {
      pkgName = '@wecom/cli';
    } else if (name === 'lark') {
      pkgName = '@larksuite/cli';
    } else {
      pkgName = 'dingtalk-workspace-cli';
    }

    const cmd = `"${npmExec}" install -g ${pkgName} --registry=https://registry.npmmirror.com`;
    console.log(`[CliManager] Executing install: ${cmd}`);

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
          message: `已成功安装 ${pkgName} (${status.version || 'latest'})`,
          version: status.version,
        };
      } else {
        return {
          success: false,
          message: `安装命令已执行，但检测工具未能就绪: ${status.error || 'unknown error'}`,
        };
      }
    } catch (err: any) {
      console.error(`[CliManager] Install error:`, err);
      return {
        success: false,
        message: `安装失败: ${err.message}`,
      };
    }
  }
}

export const cliManager = new CliManagerService();
