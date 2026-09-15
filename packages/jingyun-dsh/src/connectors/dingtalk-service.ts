import { exec, spawn, type ChildProcess } from 'child_process';
import { promisify } from 'util';

import { cliManager } from './cli-manager';
import type { DingtalkAuthStatus, DingtalkState } from './types';

const execAsync = promisify(exec);

export class DingtalkConnectorService {
  private currentLoginProcess: ChildProcess | null = null;
  private cachedCliStatus: {
    data: DingtalkAuthStatus;
    expiresAt: number;
  } | null = null;

  public async init(): Promise<void> {
    await this.getCliAuthStatus().catch(() => {});
  }

  public async clearConfig(): Promise<void> {
    await this.logoutCli();
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
        env: cliManager.getEnv(),
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
        env: cliManager.getEnv(),
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
          env: cliManager.getEnv(),
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
    const isConnected = cliAuth.authenticated === true;
    const displayName = cliAuth.corpName
      ? `${cliAuth.corpName}${cliAuth.userName ? ' · ' + cliAuth.userName : ''}`
      : cliAuth.userName || undefined;

    return {
      status: isConnected ? 'connected' : 'disconnected',
      connected: isConnected,
      appKey: displayName,
      lastError: cliAuth.error,
      cliAuth,
    };
  }

  public getStatus(): DingtalkState {
    const auth = this.cachedCliStatus?.data;
    const isConnected = auth?.authenticated === true;
    const displayName = auth
      ? auth.corpName
        ? `${auth.corpName}${auth.userName ? ' · ' + auth.userName : ''}`
        : auth.userName
      : undefined;

    return {
      status: isConnected ? 'connected' : 'disconnected',
      appKey: displayName,
      lastError: auth?.error,
    };
  }
}

export const dingtalkConnector = new DingtalkConnectorService();
