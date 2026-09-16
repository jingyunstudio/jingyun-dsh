import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { getImaConfigDir } from '../common/paths';
import type { ImaConfig, ImaState } from './types';

export function getLanIp(): string {
  try {
    const nets = os.networkInterfaces();
    for (const [name, addrs] of Object.entries(nets)) {
      if (/wsl|vethernet|vmware|virtual|hyper-v|loopback/i.test(name)) continue;
      for (const net of addrs || []) {
        if (
          net.family === 'IPv4' &&
          !net.internal &&
          net.address.startsWith('192.168.')
        ) {
          return net.address;
        }
      }
    }
    for (const [name, addrs] of Object.entries(nets)) {
      if (/wsl|vethernet|vmware|virtual|hyper-v|loopback/i.test(name)) continue;
      for (const net of addrs || []) {
        if (
          net.family === 'IPv4' &&
          !net.internal &&
          (net.address.startsWith('10.') || net.address.startsWith('172.'))
        ) {
          return net.address;
        }
      }
    }
  } catch {}
  return '127.0.0.1';
}

export class ImaConnectorService {
  private config: ImaConfig | null = null;

  private get configDir(): string {
    return getImaConfigDir();
  }

  private get configPath(): string {
    return path.join(this.configDir, 'config.json');
  }

  public async init(): Promise<void> {
    const cfg = await this.loadConfig();
    this.syncOfficialCredentials(cfg);
  }

  private syncOfficialCredentials(cfg: ImaConfig | null): void {
    if (!cfg) return;
    try {
      const homedir = os.homedir();
      const officialConfigDir = path.join(homedir, '.config', 'ima');
      if (!fs.existsSync(officialConfigDir)) {
        fs.mkdirSync(officialConfigDir, { recursive: true });
      }
      if (cfg.apiKey) {
        const ak = cfg.apiKey.trim();
        fs.writeFileSync(path.join(officialConfigDir, 'api_key'), ak, 'utf-8');
        process.env.IMA_API_KEY = ak;
        process.env.IMA_OPENAPI_APIKEY = ak;
      }
      if (cfg.clientId) {
        const ci = cfg.clientId.trim();
        fs.writeFileSync(
          path.join(officialConfigDir, 'client_id'),
          ci,
          'utf-8'
        );
        process.env.IMA_CLIENT_ID = ci;
        process.env.IMA_OPENAPI_CLIENTID = ci;
      }
    } catch {}
  }

  public loadConfigSync(): ImaConfig | null {
    try {
      if (!fs.existsSync(this.configPath)) {
        this.config = null;
        return null;
      }
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(raw);
      return this.config;
    } catch {
      this.config = null;
      return null;
    }
  }

  public async loadConfig(): Promise<ImaConfig | null> {
    return this.loadConfigSync();
  }

  public async saveConfig(cfg: Partial<ImaConfig>): Promise<ImaConfig> {
    const dir = this.configDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const current = (await this.loadConfig()) || {};
    const merged: ImaConfig = {
      ...current,
      ...cfg,
      boundAt: cfg.boundAt || current.boundAt || Date.now(),
    };
    fs.writeFileSync(this.configPath, JSON.stringify(merged, null, 2), 'utf-8');
    this.syncOfficialCredentials(merged);
    this.config = merged;
    return merged;
  }

  public async removeConfig(): Promise<void> {
    try {
      if (fs.existsSync(this.configPath)) {
        fs.unlinkSync(this.configPath);
      }
      const homedir = os.homedir();
      const officialConfigDir = path.join(homedir, '.config', 'ima');
      const akFile = path.join(officialConfigDir, 'api_key');
      const ciFile = path.join(officialConfigDir, 'client_id');
      if (fs.existsSync(akFile)) fs.unlinkSync(akFile);
      if (fs.existsSync(ciFile)) fs.unlinkSync(ciFile);
      delete process.env.IMA_API_KEY;
      delete process.env.IMA_OPENAPI_APIKEY;
      delete process.env.IMA_CLIENT_ID;
      delete process.env.IMA_OPENAPI_CLIENTID;
    } catch {}
    this.config = null;
  }

  public getStatus(): ImaState {
    const cfg = this.loadConfigSync();
    if (!cfg || !cfg.apiKey || !cfg.clientId) {
      return {
        status: 'disconnected',
        hasConfig: Boolean(cfg && (cfg.apiKey || cfg.clientId)),
        apiKeyMasked: cfg?.apiKey
          ? cfg.apiKey.length > 10
            ? `${cfg.apiKey.slice(0, 6)}****${cfg.apiKey.slice(-4)}`
            : '已设置'
          : undefined,
        clientId: cfg?.clientId,
        lastError:
          cfg?.apiKey && !cfg?.clientId
            ? '缺少 Client ID，请补充配置'
            : undefined,
      };
    }
    const ak = cfg.apiKey.trim();
    const masked =
      ak.length > 10
        ? `${ak.slice(0, 6)}****${ak.slice(-4)}`
        : `${ak.slice(0, 2)}****`;

    return {
      status: 'connected',
      hasConfig: true,
      apiKeyMasked: masked,
      clientId: cfg.clientId,
      nickname:
        cfg.nickname ||
        (cfg.clientId
          ? `Client: ${cfg.clientId.slice(0, 8)}...`
          : '腾讯 ima 知识库用户'),
      avatar: cfg.avatar,
      defaultKbId: cfg.defaultKbId,
      validTime: cfg.validTime,
      boundAt: cfg.boundAt,
    };
  }

  public async connect(data: {
    apiKey: string;
    clientId?: string;
    apiBase?: string;
    defaultKbId?: string;
    nickname?: string;
    validTime?: number;
  }): Promise<ImaState> {
    if (!data.apiKey || !data.apiKey.trim()) {
      throw new Error('请提供有效的 API Key');
    }
    if (!data.clientId || !data.clientId.trim()) {
      throw new Error(
        '请提供有效的 Client ID（腾讯官方技能必须提供 Client ID）'
      );
    }
    await this.saveConfig({
      apiKey: data.apiKey.trim(),
      clientId: data.clientId.trim(),
      apiBase: data.apiBase?.trim() || 'https://api.ima.qq.com',
      defaultKbId: data.defaultKbId?.trim(),
      nickname: data.nickname?.trim() || 'ima 知识库连接',
      validTime: data.validTime,
      boundAt: Date.now(),
    });
    return this.getStatus();
  }

  public async disconnect(): Promise<void> {
    await this.removeConfig();
  }
}

export const imaConnector = new ImaConnectorService();
