import { exec, spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

import type { LarkAuthStartResult, LarkAuthStatus } from './types';

const execAsync = promisify(exec);

export class LarkConnectorService {
  private currentInitProcess: ChildProcess | null = null;
  private currentPollProcess: ChildProcess | null = null;

  public async getStatus(): Promise<LarkAuthStatus> {
    try {
      const { stdout } = await execAsync('lark-cli auth status --json');
      return JSON.parse(stdout) as LarkAuthStatus;
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'stdout' in err) {
        const out = String((err as { stdout: unknown }).stdout);
        try {
          return JSON.parse(out) as LarkAuthStatus;
        } catch {}
      }
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'needs_login', error: message };
    }
  }

  public async startAuth(): Promise<LarkAuthStartResult> {
    let isConfigured = false;
    try {
      const { stdout } = await execAsync('lark-cli auth status --json');
      const data = JSON.parse(stdout) as { appId?: string };
      if (data?.appId) {
        isConfigured = true;
      }
    } catch (err: unknown) {
      const out =
        typeof err === 'object' && err !== null && 'stdout' in err
          ? String((err as { stdout: unknown }).stdout)
          : '';
      const msg = err instanceof Error ? err.message : String(err);

      if (out.includes('not_configured') || msg.includes('not configured')) {
        isConfigured = false;
      } else {
        isConfigured = true;
      }
    }

    if (!isConfigured) {
      const res = await this.runConfigInitAndGetUrl();
      const urlObj = new URL(res.url);
      const userCode = urlObj.searchParams.get('user_code') || 'init_code';
      return {
        mode: 'init',
        verification_url: res.url,
        device_code: userCode,
      };
    } else {
      const { stdout } = await execAsync(
        'lark-cli auth login --no-wait --json --domain all'
      );
      const data = JSON.parse(stdout) as {
        verification_url: string;
        device_code: string;
      };
      return {
        mode: 'login',
        verification_url: data.verification_url,
        device_code: data.device_code,
      };
    }
  }

  public async logout(): Promise<{ success: boolean }> {
    try {
      await execAsync('lark-cli auth logout');
    } catch {}
    return { success: true };
  }

  public async pollAuth(deviceCode: string): Promise<{
    success: boolean;
    mode?: string;
    data?: unknown;
    status?: string;
    error?: string;
  }> {
    let timeoutId: NodeJS.Timeout | null = null;
    let childProcessForLogin: ChildProcess | null = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (childProcessForLogin) {
        console.log(
          '[LarkConnector] Cleaning up and killing auth login poll process...'
        );
        try {
          childProcessForLogin.kill();
        } catch {}
      }
    };

    try {
      if (this.currentInitProcess && !this.currentInitProcess.killed) {
        console.log(
          '[LarkConnector] Poll: Waiting for active Phase 1 config init process to exit...'
        );
        const initProc = this.currentInitProcess;
        await new Promise<void>((resolve, reject) => {
          initProc.once('close', (code: number | null) => {
            this.currentInitProcess = null;
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`配置初始化失败，退出码: ${code}`));
            }
          });
          initProc.once('error', (err: unknown) => {
            this.currentInitProcess = null;
            reject(err);
          });
        });
        console.log(
          '[LarkConnector] Poll: Phase 1 config init exited successfully.'
        );
        return {
          success: true,
          mode: 'init_done',
        };
      }

      if (this.currentPollProcess) {
        console.log(
          '[LarkConnector] Killing previous active auth login poll process.'
        );
        try {
          this.currentPollProcess.kill();
        } catch {}
      }

      console.log(
        `[LarkConnector] Spawning Phase 2: lark-cli auth login --device-code ${deviceCode}`
      );
      const child = spawn(
        'lark-cli',
        ['auth', 'login', '--device-code', deviceCode, '--json'],
        { shell: true }
      );
      this.currentPollProcess = child;
      childProcessForLogin = child;

      timeoutId = setTimeout(() => {
        console.warn(
          '[LarkConnector] Auth login poll timeout (120s). Killing process.'
        );
        cleanup();
      }, 120000);

      const stdout = await new Promise<string>((resolve, reject) => {
        let out = '';
        child.stdout?.on('data', (data: Buffer | string) => {
          out += data.toString();
        });
        child.on('close', (code: number | null) => {
          this.currentPollProcess = null;
          if (code === 0) {
            resolve(out);
          } else {
            reject(new Error(`授权登录失败，退出码: ${code}. 输出: ${out}`));
          }
        });
        child.on('error', (err: unknown) => {
          this.currentPollProcess = null;
          reject(err);
        });
      });

      if (timeoutId) clearTimeout(timeoutId);
      console.log('[LarkConnector] Phase 2 auth login finished successfully!');
      return {
        success: true,
        mode: 'login',
        data: JSON.parse(stdout),
      };
    } catch (err: unknown) {
      if (timeoutId) clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : String(err);
      console.error('[LarkConnector] Auth poll error:', message);
      return {
        success: false,
        status: 'error',
        error: message,
      };
    }
  }

  private runConfigInitAndGetUrl(): Promise<{ url: string; mode: string }> {
    return new Promise((resolve, reject) => {
      const tempLogPath = path.join(os.tmpdir(), `lark_init_${Date.now()}.log`);
      console.log(`[LarkConnector] Temp log path: ${tempLogPath}`);

      if (this.currentInitProcess) {
        console.log(
          '[LarkConnector] Killing previous active config init process.'
        );
        try {
          this.currentInitProcess.kill();
        } catch {}
      }

      const cmd = `lark-cli config init --new > "${tempLogPath}" 2>&1`;
      console.log(`[LarkConnector] Executing command: ${cmd}`);

      const child = exec(cmd);
      this.currentInitProcess = child;

      let urlFound = false;
      let checkInterval: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (checkInterval) clearInterval(checkInterval);
        try {
          if (fs.existsSync(tempLogPath)) {
            fs.unlinkSync(tempLogPath);
          }
        } catch {}
      };

      checkInterval = setInterval(() => {
        try {
          if (fs.existsSync(tempLogPath)) {
            const content = fs.readFileSync(tempLogPath, 'utf8');
            const match = content.match(
              /https:\/\/open\.feishu\.cn\/page\/cli\?user_code=[A-Za-z0-9\-_&=%.]+/i
            );
            if (match && !urlFound) {
              urlFound = true;
              cleanup();
              console.log(
                '[LarkConnector] Successfully captured config init URL from file:',
                match[0]
              );
              resolve({ url: match[0], mode: 'init' });
            }
          }
        } catch (err: unknown) {
          console.error('[LarkConnector] Read temp init log error:', err);
        }
      }, 300);

      child.on('error', (err: unknown) => {
        console.error('[LarkConnector] Command redirect execution error:', err);
        if (!urlFound) {
          cleanup();
          reject(err);
        }
      });

      setTimeout(() => {
        if (!urlFound) {
          console.warn(
            '[LarkConnector] Timeout waiting for redirect config-init URL. Killing process.'
          );
          cleanup();
          try {
            child.kill();
          } catch {}
          reject(new Error('等待获取初始化连接超时(120s)'));
        }
      }, 120000);
    });
  }
}

export const larkConnector = new LarkConnectorService();
