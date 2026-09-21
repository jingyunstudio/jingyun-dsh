import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import * as lark from '@larksuiteoapi/node-sdk';

import { getDshHome } from '../common/paths';
import { getBotInfo, getWsOrigin } from './feishu-support';
import type {
  FeishuConfig,
  FeishuInboundData,
  FeishuState,
  FeishuStatus,
} from './feishu-types';

const DEDUP_WINDOW_MS = 5 * 60 * 1000;
const DEDUP_SWEEP_INTERVAL_MS = 60 * 1000;
const DEDUP_MAX_SIZE = 2000;
const MESSAGE_MAX_AGE_MS = 30 * 60 * 1000;

export type FeishuMessageListener = (
  data: FeishuInboundData
) => Promise<void> | void;

export class FeishuClient {
  private wsClient: lark.WSClient | null = null;
  private config: FeishuConfig | null = null;
  private status: FeishuStatus = 'disconnected';
  private botOpenId?: string;
  private botName?: string;
  private botAvatar?: string;
  private connectedAt?: number;
  private lastError?: string;
  private seenMessages = new Map<string, number>();
  private dedupSweepTimer: NodeJS.Timeout | null = null;
  private messageListeners = new Set<FeishuMessageListener>();
  private statusListeners = new Set<(status: FeishuStatus) => void>();

  private get configDir(): string {
    return path.join(getDshHome(), 'connectors', 'feishu');
  }

  private get configPath(): string {
    return path.join(this.configDir, 'config.json');
  }

  public onMessage(listener: FeishuMessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public onStatusChange(listener: (status: FeishuStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: FeishuStatus, error?: string): void {
    this.status = status;
    this.lastError = error;
    if (status === 'connected') {
      this.connectedAt = Date.now();
    } else if (status === 'disconnected') {
      this.connectedAt = undefined;
    }
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (err) {
        console.error('[FeishuClient] Status listener error:', err);
      }
    }
  }

  public async init(): Promise<void> {
    const cfg = await this.loadConfig();
    if (cfg?.appId && cfg?.appSecret) {
      console.info(
        `[FeishuClient] Auto-connecting saved Feishu bot (${cfg.appId})...`
      );
      this.connect().catch((err: unknown) => {
        console.warn('[FeishuClient] Auto-connect failed on init:', err);
      });
    }
  }

  public getStatus(): FeishuState {
    return {
      status: this.status,
      botId: this.config?.appId,
      botName: this.botName,
      botOpenId: this.botOpenId,
      botAvatar: this.botAvatar,
      domain: this.config?.domain,
      connectedAt: this.connectedAt,
      lastError: this.lastError,
      hasConfig: Boolean(this.config?.appId && this.config?.appSecret),
      appId: this.config?.appId,
      customHost: this.config?.customHost,
      requireMention: this.config?.requireMention ?? true,
      lastChatId: this.config?.lastChatId,
      lastChatType: this.config?.lastChatType,
    };
  }

  public async recordLastChat(
    chatId: string,
    chatType: 'p2p' | 'group'
  ): Promise<void> {
    if (!this.config) return;
    this.config.lastChatId = chatId;
    this.config.lastChatType = chatType;
    try {
      await fs.mkdir(this.configDir, { recursive: true });
      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.warn('[FeishuClient] Failed to persist lastChatId:', err);
    }
  }

  public getConfig(): FeishuConfig | null {
    return this.config;
  }

  public getBotOpenId(): string | undefined {
    return this.botOpenId;
  }

  public async loadConfig(): Promise<FeishuConfig | null> {
    try {
      if (!fsSync.existsSync(this.configPath)) {
        return null;
      }
      const raw = await fs.readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(raw) as FeishuConfig;
      this.config = parsed;
      return parsed;
    } catch (err) {
      console.warn('[FeishuClient] Failed to load config:', err);
      return null;
    }
  }

  public async saveConfig(cfg: FeishuConfig): Promise<void> {
    this.config = {
      ...this.config,
      ...cfg,
      domain: cfg.domain || 'feishu',
      requireMention: cfg.requireMention ?? true,
    };
    await fs.mkdir(this.configDir, { recursive: true });
    await fs.writeFile(
      this.configPath,
      JSON.stringify(this.config, null, 2),
      'utf-8'
    );
  }

  public async clearConfig(): Promise<void> {
    this.disconnect();
    this.config = null;
    this.botOpenId = undefined;
    this.botName = undefined;
    this.botAvatar = undefined;
    try {
      if (fsSync.existsSync(this.configPath)) {
        await fs.unlink(this.configPath);
      }
    } catch (err) {
      console.warn('[FeishuClient] Failed to remove config file:', err);
    }
  }

  public async connect(overrideConfig?: FeishuConfig): Promise<void> {
    if (overrideConfig) {
      await this.saveConfig(overrideConfig);
    }
    const currentConfig = this.config;
    if (!currentConfig?.appId || !currentConfig?.appSecret) {
      throw new Error('未配置飞书 App ID 或 App Secret，无法建立连接');
    }

    // 若当前已有连接，先强制停止
    if (this.wsClient) {
      this.disconnect();
    }

    this.setStatus('connecting');

    try {
      // 1. 探活并获取 Bot 基础信息
      const botInfo = await getBotInfo(currentConfig);
      this.botName = botInfo.app_name;
      this.botOpenId = botInfo.open_id;
      this.botAvatar = botInfo.avatar_url;
      console.info(
        `[FeishuClient] Bot probe verified: ${this.botName} (openId: ${this.botOpenId})`
      );

      // 2. 初始化事件分发器（日志级别设为 error，静默所有非关键通知与噪音告警）
      const eventDispatcher = new lark.EventDispatcher({
        encryptKey: currentConfig.encryptKey || '',
        verificationToken: currentConfig.verificationToken || '',
        loggerLevel: lark.LoggerLevel.error,
      });

      eventDispatcher.register({
        'im.message.receive_v1': async (data: any) => {
          try {
            await this.handleInboundEvent(data as FeishuInboundData);
          } catch (err) {
            console.error(
              '[FeishuClient] Error in im.message.receive_v1 handler:',
              err
            );
          }
        },
      });

      // 3. 构建并启动 WebSocket 长连接
      const hasCustomHost =
        typeof currentConfig.customHost === 'string' &&
        currentConfig.customHost.trim().length > 0;
      const wsOrigin = hasCustomHost
        ? getWsOrigin(currentConfig.domain, currentConfig.customHost)
        : '';
      const domainVal = hasCustomHost
        ? wsOrigin
        : currentConfig.domain === 'lark'
          ? lark.Domain.Lark
          : lark.Domain.Feishu;

      const wsClient = new lark.WSClient({
        appId: currentConfig.appId,
        appSecret: currentConfig.appSecret,
        domain: domainVal,
        loggerLevel: lark.LoggerLevel.error,
      });

      this.wsClient = wsClient;

      // 启动并捕获异步断开
      wsClient.start({ eventDispatcher }).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[FeishuClient] WebSocket runtime error:', msg);
        this.setStatus('error', msg);
      });

      this.setStatus('connected');
      console.info('[FeishuClient] WebSocket client connected successfully.');

      // 启动消息去重定期淘汰清理
      this.dedupSweepTimer = setInterval(
        () => this.evictExpiredDedup(),
        DEDUP_SWEEP_INTERVAL_MS
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[FeishuClient] Failed to connect to Feishu:', msg);
      this.setStatus('error', msg);
      throw err;
    }
  }

  public disconnect(): void {
    if (this.dedupSweepTimer) {
      clearInterval(this.dedupSweepTimer);
      this.dedupSweepTimer = null;
    }
    if (this.wsClient) {
      try {
        this.wsClient.close({ force: true });
      } catch (err) {
        console.warn('[FeishuClient] Error closing WSClient:', err);
      }
      this.wsClient = null;
    }
    this.setStatus('disconnected');
    this.seenMessages.clear();
  }

  private async handleInboundEvent(data: FeishuInboundData): Promise<void> {
    const msg = data.message;
    if (!msg || !msg.message_id) return;

    // 1. 丢弃超期（30分钟前）的历史消息，防止重连后积压历史洪水
    const createTimeMs = Number(msg.create_time);
    if (createTimeMs > 0 && Date.now() - createTimeMs > MESSAGE_MAX_AGE_MS) {
      console.info(
        `[FeishuClient] Discarding stale message ${msg.message_id} (age: ${Date.now() - createTimeMs}ms)`
      );
      return;
    }

    // 2. 消息去重
    if (this.seenMessages.has(msg.message_id)) {
      console.info(
        `[FeishuClient] Duplicate message skipped: ${msg.message_id}`
      );
      return;
    }

    if (this.seenMessages.size >= DEDUP_MAX_SIZE) {
      this.evictExpiredDedup();
    }
    this.seenMessages.set(msg.message_id, Date.now());

    // 3. 分发给消息监听器
    for (const listener of this.messageListeners) {
      try {
        await listener(data);
      } catch (err) {
        console.error('[FeishuClient] Message listener error:', err);
      }
    }
  }

  private evictExpiredDedup(): void {
    const cutoff = Date.now() - DEDUP_WINDOW_MS;
    for (const [id, ts] of this.seenMessages.entries()) {
      if (ts < cutoff) {
        this.seenMessages.delete(id);
      }
    }
  }
}

export const feishuClient = new FeishuClient();
