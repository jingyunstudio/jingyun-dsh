import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { getJingyunTunnelConfigDir } from '../common/paths';
import { jingyunTunnelClient } from './jingyun-tunnel-client';
import type {
  JingyunTunnelConfig,
  JingyunTunnelState,
} from './jingyun-tunnel-types';

export class JingyunTunnelService {
  private configPath: string;

  constructor() {
    this.configPath = path.join(getJingyunTunnelConfigDir(), 'config.json');
  }

  private ensureConfigDir(): void {
    const dir = getJingyunTunnelConfigDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public readConfig(): JingyunTunnelConfig {
    if (!fs.existsSync(this.configPath)) {
      return {};
    }
    const raw = fs.readFileSync(this.configPath, 'utf-8');
    try {
      return JSON.parse(raw);
    } catch (err) {
      throw new Error(
        `[JingyunTunnelService] 配置文件破损无法解析 (${this.configPath}): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  public writeConfig(config: JingyunTunnelConfig): void {
    this.ensureConfigDir();
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  private getOrCreateFingerprint(config: JingyunTunnelConfig): string {
    if (config.deviceFingerprint && config.deviceFingerprint.trim()) {
      return config.deviceFingerprint.trim();
    }
    const seed = `${os.hostname()}_${os.platform()}_${os.arch()}_${crypto.randomUUID()}`;
    const fp = `fp_${crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32)}`;
    config.deviceFingerprint = fp;
    this.writeConfig(config);
    return fp;
  }

  public async init(): Promise<void> {
    const config = this.readConfig();
    if (
      config.enabled !== false &&
      config.deviceId &&
      config.deviceToken &&
      config.cloudUrl
    ) {
      const targetBaseUrl = config.cloudUrl.replace(/\/+$/, '');
      const wsScheme = targetBaseUrl.startsWith('https://')
        ? 'wss://'
        : 'ws://';
      const hostPart = targetBaseUrl.replace(/^https?:\/\//, '');
      const cloudWsUrl = `${wsScheme}${hostPart}/v1/dsh/tunnel`;

      console.info(
        `[JingyunTunnelService] Auto-connecting saved cloud tunnel (${config.deviceId})...`
      );
      jingyunTunnelClient.connect({
        cloudWsUrl,
        deviceId: config.deviceId,
        deviceToken: config.deviceToken,
        deviceName: config.deviceName,
      });
    }
  }

  public getStatus(): JingyunTunnelState & { config: JingyunTunnelConfig } {
    const clientState = jingyunTunnelClient.getState();
    const config = this.readConfig();
    return {
      ...clientState,
      deviceId: clientState.deviceId || config.deviceId,
      deviceName: clientState.deviceName || config.deviceName,
      cloudUrl: clientState.cloudUrl || config.cloudUrl,
      config,
    };
  }

  public async connect(params: {
    userToken?: string;
    cloudUrl?: string;
    deviceName?: string;
  }): Promise<JingyunTunnelState> {
    const config = this.readConfig();

    let targetBaseUrl = params.cloudUrl?.trim() || config.cloudUrl?.trim();
    if (!targetBaseUrl) {
      throw new Error(
        '未检测到云端服务器地址，请先在客户端登录账号或传入目标云端地址'
      );
    }

    targetBaseUrl = targetBaseUrl.replace(/\/+$/, '');
    config.cloudUrl = targetBaseUrl;

    const deviceName =
      params.deviceName?.trim() ||
      config.deviceName?.trim() ||
      `${os.hostname()} 的工作台`;
    config.deviceName = deviceName;

    const fingerprint = this.getOrCreateFingerprint(config);

    // 若本地未有设备信息或传入了 userToken，则向云端注册或更新绑定
    if (!config.deviceId || !config.deviceToken || params.userToken) {
      if (!params.userToken) {
        throw new Error(
          '未提供用户登录凭证 (userToken)，无法向云端注册或绑定设备'
        );
      }

      const registerUrl = `${targetBaseUrl}/v1/dsh/device/register`;
      const res = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.userToken}`,
        },
        body: JSON.stringify({
          device_fingerprint: fingerprint,
          device_name: deviceName,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`云端设备注册失败 (${res.status}): ${errorText}`);
      }

      const data = (await res.json()) as {
        device_id?: string;
        device_token?: string;
        device_name?: string;
      };

      if (!data.device_id || !data.device_token) {
        throw new Error('云端返回的设备凭据不完整');
      }

      config.deviceId = data.device_id;
      config.deviceToken = data.device_token;
      config.deviceName = data.device_name || deviceName;
      config.enabled = true;
      this.writeConfig(config);
    } else {
      config.enabled = true;
      this.writeConfig(config);
    }

    // 转换 HTTP 为 WebSocket 地址
    const wsScheme = targetBaseUrl.startsWith('https://') ? 'wss://' : 'ws://';
    const hostPart = targetBaseUrl.replace(/^https?:\/\//, '');
    const cloudWsUrl = `${wsScheme}${hostPart}/v1/dsh/tunnel`;

    await jingyunTunnelClient.connect({
      cloudWsUrl,
      deviceId: config.deviceId!,
      deviceToken: config.deviceToken!,
      deviceName: config.deviceName,
    });

    return this.getStatus();
  }

  public disconnect(): JingyunTunnelState {
    const config = this.readConfig();
    config.enabled = false;
    this.writeConfig(config);
    jingyunTunnelClient.disconnect(true);
    return this.getStatus();
  }
}

export const jingyunTunnelService = new JingyunTunnelService();
