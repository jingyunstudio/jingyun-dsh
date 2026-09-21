import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DWClient, TOPIC_ROBOT } from 'dingtalk-stream';

import { getDshHome } from '../common/paths';
import {
  clearTokenCache,
  downloadMediaByCode,
  getAccessToken,
} from './dingtalk-tunnel-support';
import type {
  DingtalkInboundMessage,
  DingtalkMediaFile,
  DingtalkTunnelConfig,
  DingtalkTunnelState,
  DingtalkTunnelStatus,
} from './dingtalk-tunnel-types';

const DEDUP_WINDOW_MS = 5 * 60 * 1000;
const DEDUP_SWEEP_INTERVAL_MS = 60 * 1000;

export type DingtalkMessageListener = (
  message: DingtalkInboundMessage
) => Promise<void> | void;

export class DingtalkTunnelClient {
  private client: DWClient | null = null;
  private config: DingtalkTunnelConfig | null = null;
  private status: DingtalkTunnelStatus = 'disconnected';
  private connectedAt?: number;
  private lastError?: string;
  private running = false;
  private activeSessionWebhook?: string;
  private activeSessionWebhookExpiredTime?: number;
  private dedupMap = new Map<string, number>();
  private dedupSweepTimer: NodeJS.Timeout | null = null;
  private messageListeners = new Set<DingtalkMessageListener>();
  private statusListeners = new Set<(status: DingtalkTunnelStatus) => void>();

  private get configDir(): string {
    return path.join(getDshHome(), 'connectors', 'dingtalk-tunnel');
  }

  private get configPath(): string {
    return path.join(this.configDir, 'config.json');
  }

  public onMessage(listener: DingtalkMessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public onStatusChange(
    listener: (status: DingtalkTunnelStatus) => void
  ): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: DingtalkTunnelStatus, error?: string): void {
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
        console.error('[DingtalkTunnelClient] Status listener error:', err);
      }
    }
  }

  public async init(): Promise<void> {
    const cfg = await this.loadConfig();
    if (cfg?.appKey && cfg?.appSecret) {
      console.info(
        `[DingtalkTunnelClient] Auto-connecting saved DingTalk bot (${cfg.appKey.slice(0, 6)}...)...`
      );
      this.connect().catch((err: unknown) => {
        console.warn(
          '[DingtalkTunnelClient] Auto-connect failed on startup:',
          err
        );
      });
    }
  }

  public getStatus(): DingtalkTunnelState {
    const isWebhookValid = Boolean(
      this.activeSessionWebhook &&
      (!this.activeSessionWebhookExpiredTime ||
        Date.now() < this.activeSessionWebhookExpiredTime)
    );

    return {
      status: this.status,
      appKey: this.config?.appKey,
      robotCode: this.config?.robotCode || this.config?.appKey,
      connectedAt: this.connectedAt,
      lastError: this.lastError,
      hasConfig: Boolean(this.config?.appKey && this.config?.appSecret),
      requireMention: this.config?.requireMention ?? true,
      hasSessionWebhook: isWebhookValid,
      hasChat: Boolean(this.config?.lastChatId),
    };
  }

  public getActiveSessionWebhook(): string | undefined {
    if (
      this.activeSessionWebhook &&
      (!this.activeSessionWebhookExpiredTime ||
        Date.now() < this.activeSessionWebhookExpiredTime)
    ) {
      return this.activeSessionWebhook;
    }
    return undefined;
  }

  public updateActiveSessionWebhook(
    webhook: string,
    expiredTime?: number
  ): void {
    this.activeSessionWebhook = webhook;
    this.activeSessionWebhookExpiredTime = expiredTime;
  }

  public async recordLastChat(params: {
    chatId: string;
    chatType: 'p2p' | 'group';
    senderId?: string;
    sessionWebhook?: string;
    sessionWebhookExpiredTime?: number;
  }): Promise<void> {
    if (!this.config) return;
    this.config.lastChatId = params.chatId;
    this.config.lastChatType = params.chatType;
    if (params.senderId) this.config.lastSenderId = params.senderId;
    if (params.sessionWebhook) {
      this.config.lastSessionWebhook = params.sessionWebhook;
      this.activeSessionWebhook = params.sessionWebhook;
    }
    if (params.sessionWebhookExpiredTime) {
      this.config.lastSessionWebhookExpiredTime =
        params.sessionWebhookExpiredTime;
      this.activeSessionWebhookExpiredTime = params.sessionWebhookExpiredTime;
    }
    try {
      await fs.mkdir(this.configDir, { recursive: true });
      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.warn('[DingtalkTunnelClient] Failed to persist lastChatId:', err);
    }
  }

  public getConfig(): DingtalkTunnelConfig | null {
    return this.config;
  }

  public async loadConfig(): Promise<DingtalkTunnelConfig | null> {
    if (!fsSync.existsSync(this.configPath)) {
      return null;
    }
    const raw = await fs.readFile(this.configPath, 'utf-8');
    try {
      this.config = JSON.parse(raw);
      if (
        this.config?.lastSessionWebhook &&
        this.config.lastSessionWebhookExpiredTime &&
        Date.now() < this.config.lastSessionWebhookExpiredTime
      ) {
        this.activeSessionWebhook = this.config.lastSessionWebhook;
        this.activeSessionWebhookExpiredTime =
          this.config.lastSessionWebhookExpiredTime;
      }
      return this.config;
    } catch (err) {
      throw new Error(
        `[DingtalkTunnelClient] 配置文件解析失败 (${this.configPath}): ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  public async saveConfig(cfg: DingtalkTunnelConfig): Promise<void> {
    const current = this.config || ({} as Partial<DingtalkTunnelConfig>);
    this.config = {
      ...current,
      ...cfg,
      updatedAt: Date.now(),
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
    clearTokenCache();
    if (fsSync.existsSync(this.configPath)) {
      await fs.unlink(this.configPath);
    }
  }

  public async connect(overrideConfig?: DingtalkTunnelConfig): Promise<void> {
    if (overrideConfig) {
      await this.saveConfig(overrideConfig);
    }
    const config = this.config || (await this.loadConfig());
    if (!config?.appKey || !config?.appSecret) {
      throw new Error('未配置钉钉应用 AppKey 与 AppSecret');
    }

    this.running = true;
    this.setStatus('connecting');

    // 1. 预先校验凭据合法性
    try {
      await getAccessToken(config.appKey, config.appSecret);
    } catch (authErr: any) {
      const msg = authErr?.message || String(authErr);
      this.setStatus('error', msg);
      throw new Error(`钉钉凭证校验失败: ${msg}`);
    }

    await this.connectStream(config.appKey, config.appSecret);

    if (!this.dedupSweepTimer) {
      this.dedupSweepTimer = setInterval(
        () => this.sweepDedup(),
        DEDUP_SWEEP_INTERVAL_MS
      );
    }
  }

  public disconnect(): void {
    this.running = false;
    if (this.dedupSweepTimer) {
      clearInterval(this.dedupSweepTimer);
      this.dedupSweepTimer = null;
    }
    this.dedupMap.clear();
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
    this.setStatus('disconnected');
  }

  private async connectStream(
    appKey: string,
    appSecret: string
  ): Promise<void> {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }

    const client = new DWClient({
      clientId: appKey,
      clientSecret: appSecret,
      keepAlive: true,
      debug: false,
    });

    client.registerCallbackListener(TOPIC_ROBOT, (res) => {
      this.handleRobotCallback(client, res);
    });

    try {
      await client.connect();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[DingtalkTunnelClient] Stream connect error:', err);
      this.setStatus('error', msg);
      throw new Error(`连接钉钉 Stream 网关失败: ${msg}`);
    }

    this.client = client;
    this.setStatus('connected');
    console.info(
      `[DingtalkTunnelClient] Successfully connected to DingTalk Stream Gateway (${appKey.slice(0, 6)}...)`
    );
  }

  private dedupCheck(messageId: string): boolean {
    const now = Date.now();
    if (this.dedupMap.has(messageId)) {
      return false;
    }
    this.dedupMap.set(messageId, now + DEDUP_WINDOW_MS);
    return true;
  }

  private sweepDedup(): void {
    const now = Date.now();
    for (const [id, expiry] of this.dedupMap) {
      if (expiry <= now) {
        this.dedupMap.delete(id);
      }
    }
  }

  private handleRobotCallback(
    client: DWClient,
    res: { headers?: { messageId?: string }; data?: unknown }
  ): void {
    const messageId = res.headers?.messageId;
    if (!messageId) return;

    // 1. 底层第一时间即时响应 ACK，避免钉钉网关由于超时重试或流控排队
    try {
      client.socketCallBackResponse(messageId, {
        status: 'SUCCESS',
        success: true,
      });
    } catch (ackErr) {
      console.warn(
        `[DingtalkTunnelClient] Failed to ACK message ${messageId}:`,
        ackErr
      );
    }

    // 2. 5 分钟窗口消息防重
    if (!this.dedupCheck(messageId)) {
      console.info(
        `[DingtalkTunnelClient] Duplicate message ignored: ${messageId}`
      );
      return;
    }

    let data: Record<string, any>;
    try {
      data =
        typeof res.data === 'string'
          ? JSON.parse(res.data)
          : (res.data as Record<string, any>);
    } catch (parseErr) {
      console.warn(
        `[DingtalkTunnelClient] Failed to parse message data for ${messageId}:`,
        parseErr
      );
      return;
    }

    if (!data) return;

    // 3. 异步非阻塞执行入站转换与业务分发，完全释放当前 WebSocket 事件循环
    queueMicrotask(async () => {
      try {
        const inbound = await this.convertToInbound(data, messageId);
        if (!inbound) return;

        for (const listener of this.messageListeners) {
          try {
            const result = listener(inbound);
            if (
              result &&
              typeof (result as Promise<void>).catch === 'function'
            ) {
              (result as Promise<void>).catch((err) => {
                console.error(
                  '[DingtalkTunnelClient] Message listener async rejection:',
                  err
                );
              });
            }
          } catch (err) {
            console.error(
              '[DingtalkTunnelClient] Message listener execution error:',
              err
            );
          }
        }
      } catch (convErr) {
        console.error(
          `[DingtalkTunnelClient] Failed to process inbound message ${messageId}:`,
          convErr
        );
      }
    });
  }

  private async convertToInbound(
    data: Record<string, any>,
    fallbackMsgId: string
  ): Promise<DingtalkInboundMessage | null> {
    const sessionWebhook = data.sessionWebhook;
    if (!sessionWebhook || typeof sessionWebhook !== 'string') {
      console.warn(
        `[DingtalkTunnelClient] Message ${fallbackMsgId} ignored: missing required sessionWebhook`
      );
      return null;
    }

    const msgId = data.msgId || fallbackMsgId;
    const conversationType: '1' | '2' =
      String(data.conversationType) === '2' ? '2' : '1';
    const conversationId = data.conversationId || '';
    const senderId = data.senderStaffId || data.senderId || '';
    const senderNick = data.senderNick || '';
    const sessionWebhookExpiredTime =
      typeof data.sessionWebhookExpiredTime === 'number'
        ? data.sessionWebhookExpiredTime
        : undefined;

    // 维护当前活跃的 sessionWebhook（用于状态展示与测试回复）
    this.updateActiveSessionWebhook(sessionWebhook, sessionWebhookExpiredTime);

    // 群聊场景下严格读取钉钉标准 isInAtList 布尔值，拒绝启发式猜测遍历
    const isInAtList =
      conversationType === '2' ? Boolean(data.isInAtList) : undefined;

    const textSegments: string[] = [];
    const mediaFiles: DingtalkMediaFile[] = [];
    const msgType = data.msgtype;
    const appKey = this.config?.appKey || '';
    const appSecret = this.config?.appSecret || '';
    const robotCode = this.config?.robotCode || appKey;

    switch (msgType) {
      case 'text': {
        const content = data.text?.content || '';
        if (content) textSegments.push(content.trim());
        break;
      }
      case 'richText': {
        const richParts = Array.isArray(data.content?.richText)
          ? data.content.richText
          : [];
        for (const part of richParts) {
          if (part.text) textSegments.push(part.text);
          const downloadCode = part.downloadCode || part.pictureUrl;
          if (downloadCode && appKey && appSecret) {
            try {
              const downloaded = await downloadMediaByCode(
                downloadCode,
                robotCode,
                appKey,
                appSecret,
                'image'
              );
              mediaFiles.push(downloaded);
            } catch (err) {
              console.error(
                '[DingtalkTunnelClient] Failed to download richText image:',
                err
              );
            }
          }
        }
        break;
      }
      case 'picture': {
        const downloadCode = data.content?.downloadCode;
        if (downloadCode && appKey && appSecret) {
          try {
            const downloaded = await downloadMediaByCode(
              downloadCode,
              robotCode,
              appKey,
              appSecret,
              'image'
            );
            mediaFiles.push(downloaded);
          } catch (err) {
            console.error(
              '[DingtalkTunnelClient] Failed to download picture:',
              err
            );
          }
        }
        break;
      }
      case 'audio': {
        if (data.content?.recognition) {
          textSegments.push(data.content.recognition);
        }
        const downloadCode = data.content?.downloadCode;
        if (downloadCode && appKey && appSecret) {
          try {
            const downloaded = await downloadMediaByCode(
              downloadCode,
              robotCode,
              appKey,
              appSecret,
              'audio'
            );
            mediaFiles.push(downloaded);
          } catch (err) {
            console.error(
              '[DingtalkTunnelClient] Failed to download audio:',
              err
            );
          }
        }
        break;
      }
      case 'file': {
        const downloadCode = data.content?.downloadCode;
        if (downloadCode && appKey && appSecret) {
          try {
            const downloaded = await downloadMediaByCode(
              downloadCode,
              robotCode,
              appKey,
              appSecret,
              'file'
            );
            if (data.content?.fileName) {
              downloaded.fileName = data.content.fileName;
            }
            mediaFiles.push(downloaded);
          } catch (err) {
            console.error(
              '[DingtalkTunnelClient] Failed to download file:',
              err
            );
          }
        }
        break;
      }
      default: {
        const genericText = data.text?.content || data.content || '';
        if (typeof genericText === 'string' && genericText.trim()) {
          textSegments.push(genericText.trim());
        }
        break;
      }
    }

    return {
      messageId: msgId,
      conversationId,
      conversationType,
      senderId,
      senderNick,
      sessionWebhook,
      sessionWebhookExpiredTime,
      isInAtList,
      text: textSegments.join('\n').trim(),
      mediaFiles,
      raw: data,
    };
  }
}

export const dingtalkTunnelClient = new DingtalkTunnelClient();
