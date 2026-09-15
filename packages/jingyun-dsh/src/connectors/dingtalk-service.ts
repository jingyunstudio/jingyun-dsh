import { exec, spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

import { getDingtalkConfigDir } from '../common/paths';
import { cliManager } from './cli-manager';
import type {
  DingtalkAuthStatus,
  DingtalkConfig,
  DingtalkState,
} from './types';
const execAsync = promisify(exec);

export class DingtalkConnectorService {
  private currentLoginProcess: ChildProcess | null = null;
  private cachedCliStatus: {
    data: DingtalkAuthStatus;
    expiresAt: number;
  } | null = null;
  private config: DingtalkConfig | null = null;

  private get configDir(): string {
    return getDingtalkConfigDir();
  }

  private get configPath(): string {
    return path.join(this.configDir, 'config.json');
  }

  private getDingtalkEnv(): NodeJS.ProcessEnv {
    const dir = this.configDir;
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    return {
      ...cliManager.getEnv(),
      DWS_CONFIG_DIR: dir,
      DINGTALK_CONFIG_DIR: dir,
    };
  }

  private migrateLegacyHomeConfig(): void {
    try {
      const targetDir = getDingtalkConfigDir();
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const legacyHome = path.join(os.homedir(), '.dws');
      if (!fs.existsSync(legacyHome)) return;

      const filesToMigrate = ['identity.json', 'skills-state.json'];
      for (const file of filesToMigrate) {
        const src = path.join(legacyHome, file);
        const dst = path.join(targetDir, file);
        if (fs.existsSync(src) && !fs.existsSync(dst)) {
          fs.copyFileSync(src, dst);
        }
      }
    } catch {}
  }

  public async init(): Promise<void> {
    this.migrateLegacyHomeConfig();
    await this.loadConfig();
    await this.getCliAuthStatus().catch(() => {});
  }

  public async loadConfig(): Promise<DingtalkConfig | null> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return null;
      }
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(raw);
      return this.config;
    } catch {
      return null;
    }
  }

  public async saveConfig(cfg: Partial<DingtalkConfig>): Promise<void> {
    const current = this.config || {};
    this.config = {
      ...current,
      ...cfg,
      updatedAt: Date.now(),
    };
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    fs.writeFileSync(
      this.configPath,
      JSON.stringify(this.config, null, 2),
      'utf-8'
    );
  }

  public async clearConfig(): Promise<void> {
    await this.logoutCli();
    this.config = null;
    try {
      if (fs.existsSync(this.configPath)) {
        fs.unlinkSync(this.configPath);
      }
      const identityFile = path.join(this.configDir, 'identity.json');
      if (fs.existsSync(identityFile)) {
        fs.unlinkSync(identityFile);
      }
    } catch {}
  }

  public async getCliAuthStatus(): Promise<DingtalkAuthStatus> {
    if (this.cachedCliStatus && Date.now() < this.cachedCliStatus.expiresAt) {
      return this.cachedCliStatus.data;
    }
    const cmd = cliManager.resolveCliExec('dingtalk');
    if (!cmd) {
      return { authenticated: false };
    }
    try {
      const { stdout } = await execAsync(`"${cmd}" auth status --format json`, {
        env: this.getDingtalkEnv(),
      });
      let parsed: any;
      try {
        parsed = JSON.parse(stdout.trim());
      } catch {
        const isAuth =
          stdout.includes('"authenticated": true') ||
          stdout.includes('"authenticated":true');
        parsed = { authenticated: isAuth };
      }
      const data: DingtalkAuthStatus = {
        authenticated: Boolean(parsed?.authenticated),
        userId: parsed?.user?.userId || parsed?.userId,
        userName: parsed?.user?.userName || parsed?.userName,
        corpId: parsed?.org?.corpId || parsed?.corpId,
        corpName: parsed?.org?.corpName || parsed?.corpName,
        message: parsed?.message,
      };
      if (data.authenticated) {
        // 同步企业与用户信息到本地 config.json
        this.saveConfig({
          corpId: data.corpId,
          userId: data.userId,
          userName: data.userName,
        }).catch(() => {});
      }
      this.cachedCliStatus = { data, expiresAt: Date.now() + 5000 };
      return data;
    } catch (err: any) {
      const out = err?.stdout || err?.stderr || '';
      try {
        const parsed = JSON.parse(out.trim());
        const data: DingtalkAuthStatus = {
          authenticated: Boolean(parsed?.authenticated),
          message: parsed?.message,
        };
        this.cachedCliStatus = { data, expiresAt: Date.now() + 3000 };
        return data;
      } catch {}
      return {
        authenticated: false,
        error: err?.message || 'dws auth status failed',
      };
    }
  }

  public async startCliAuth(): Promise<{
    verification_url: string;
    device_code: string;
  }> {
    this.cancelCliAuth();

    const cmd = await cliManager.ensureCliExec('dingtalk');
    return new Promise((resolve, reject) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('获取钉钉授权 URL 超时'));
        }
      }, 15000);

      const child = spawn(cmd, ['auth', 'login', '-y', '--no-browser'], {
        env: this.getDingtalkEnv(),
        shell: true,
        windowsHide: true,
      });

      this.currentLoginProcess = child;

      const handleOutput = (chunk: Buffer | string) => {
        const text = chunk.toString();
        const match = text.match(
          /(https:\/\/login\.dingtalk\.com\/oauth2\/(?:auth|challenge\.htm)\?[^\s'"]+)/
        );
        if (match && !resolved) {
          resolved = true;
          clearTimeout(timer);
          const url = match[1];
          let userCode = 'dingtalk_auth';
          try {
            const urlObj = new URL(url);
            userCode = urlObj.searchParams.get('client_id') || 'dingtalk_auth';
          } catch {}
          resolve({
            verification_url: url,
            device_code: userCode,
          });
        }
      };

      child.stdout?.on('data', handleOutput);
      child.stderr?.on('data', handleOutput);

      child.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          reject(err);
        }
      });

      child.on('close', (code) => {
        this.currentLoginProcess = null;
        this.cachedCliStatus = null;
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          reject(new Error(`dws auth login 进程已退出 (code ${code})`));
        }
      });
    });
  }

  public cancelCliAuth(): void {
    if (this.currentLoginProcess) {
      try {
        const pid = this.currentLoginProcess.pid;
        if (pid && process.platform === 'win32') {
          exec(`taskkill /pid ${pid} /T /F`, () => {});
        } else {
          this.currentLoginProcess.kill();
        }
      } catch {}
      this.currentLoginProcess = null;
    }
  }

  public async logoutCli(): Promise<void> {
    this.cancelCliAuth();
    this.cachedCliStatus = null;
    try {
      const cmd = cliManager.resolveCliExec('dingtalk');
      if (cmd) {
        await execAsync(`"${cmd}" auth logout`, {
          env: this.getDingtalkEnv(),
        });
      }
    } catch (err) {
      console.warn('[DingtalkConnector] dws auth logout error:', err);
    }
  }
  public async getCombinedStatus(): Promise<
    DingtalkState & { cliAuth?: DingtalkAuthStatus; connected: boolean }
  > {
    const cliAuth = await this.getCliAuthStatus();
    const cfg = this.config || (await this.loadConfig());
    const isConnected = cliAuth.authenticated === true;
    const corpId = cliAuth.corpId || cfg?.corpId;
    const userId = cliAuth.userId || cfg?.userId;
    const userName = cliAuth.userName || cfg?.userName;
    const displayName = cliAuth.corpName
      ? `${cliAuth.corpName}${userName ? ' · ' + userName : ''}`
      : userName || cfg?.appKey || undefined;

    return {
      status: isConnected ? 'connected' : 'disconnected',
      connected: isConnected,
      hasConfig: Boolean(cfg?.appKey || cfg?.corpId || isConnected),
      appKey: displayName,
      robotCode: cfg?.robotCode,
      corpId,
      userId,
      userName,
      lastError: cliAuth.error,
      cliAuth,
    };
  }

  public getStatus(): DingtalkState {
    const auth = this.cachedCliStatus?.data;
    const cfg = this.config;
    const isConnected = auth?.authenticated === true;
    const corpId = auth?.corpId || cfg?.corpId;
    const userId = auth?.userId || cfg?.userId;
    const userName = auth?.userName || cfg?.userName;
    const displayName = auth
      ? auth.corpName
        ? `${auth.corpName}${userName ? ' · ' + userName : ''}`
        : userName
      : cfg?.appKey || undefined;

    return {
      status: isConnected ? 'connected' : 'disconnected',
      hasConfig: Boolean(cfg?.appKey || cfg?.corpId || isConnected),
      appKey: displayName,
      robotCode: cfg?.robotCode,
      corpId,
      userId,
      userName,
      lastError: auth?.error,
    };
  }
}

export const dingtalkConnector = new DingtalkConnectorService();
