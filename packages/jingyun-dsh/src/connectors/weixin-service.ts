import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import type { Context } from '@deepseek-ai/cordis';

declare module '@deepseek-ai/cordis' {
  interface Events {
    'session/event'(
      session: { id: string },
      event: { type: string; data?: unknown }
    ): void;
  }
}
import { assistantSessionManager } from '../agent/assistant-session-manager';
import { getWeixinConfigDir } from '../common/paths';
import type {
  WeixinBotConfig,
  WeixinBotStatus,
  WeixinQrCodeResult,
  WeixinQrPollResult,
} from './types';

const DEFAULT_ILINK_BASE_URL = 'https://ilinkai.weixin.qq.com';

function randomWechatUin(): string {
  const num = crypto.randomBytes(4).readUInt32BE(0);
  return Buffer.from(String(num), 'utf-8').toString('base64');
}
export class WeixinConnectorService {
  private config: WeixinBotConfig | null = null;
  private abortController: AbortController | null = null;
  private isPolling = false;
  private pollCursor = '';
  private currentStatus: WeixinBotStatus = {
    connected: false,
    status: 'disconnected',
    botType: 'weixin',
  };
  private ctx: Context | null = null;
  private pendingReplies = new Map<
    string,
    {
      toUserId: string;
      contextToken?: string;
      timestamp: number;
    }
  >();

  public setContext(ctx: Context): void {
    this.ctx = ctx;

    // 监听会话日志追加事件：当 DSH Agent 回复生成 (assistant/message) 时，回推给手机微信
    ctx.on(
      'session/event',
      async (
        session: { id: string },
        event: { type: string; data?: unknown }
      ) => {
        try {
          if (event.type === 'assistant/message') {
            const pending = this.pendingReplies.get(session.id);
            if (pending) {
              this.pendingReplies.delete(session.id);
              const content = (
                event.data as {
                  message?: {
                    content?: Array<{ type: string; text?: string }>;
                  };
                }
              )?.message?.content;

              const textParts: string[] = [];
              if (Array.isArray(content)) {
                for (const part of content) {
                  if (part.type === 'text' && typeof part.text === 'string') {
                    textParts.push(part.text);
                  }
                }
              }
              const replyText = textParts.join('\n').trim();
              if (replyText) {
                await this.sendMessage({
                  toUserId: pending.toUserId,
                  contextToken: pending.contextToken,
                  content: replyText,
                });
                console.log(
                  `[WeixinConnector] Successfully forwarded DSH reply to WeChat user: ${pending.toUserId}`
                );
              }
            }
          }
        } catch (err: unknown) {
          console.warn(
            '[WeixinConnector] Failed to forward assistant reply to WeChat:',
            err
          );
        }
      }
    );
  }

  public async resolveAssistantSessionId(): Promise<string | undefined> {
    if (!this.ctx) return undefined;
    try {
      return await assistantSessionManager.ensureAssistantSession(this.ctx);
    } catch (err: unknown) {
      console.warn(
        '[WeixinConnector] Failed to resolve assistant session:',
        err
      );
      return undefined;
    }
  }

  private get configDir(): string {
    return getWeixinConfigDir();
  }

  private get configPath(): string {
    return path.join(this.configDir, 'weixin-bot.json');
  }

  public async init(): Promise<void> {
    await this.loadConfig();
    if (
      this.config?.enabled &&
      this.config.botToken &&
      this.config.autoReconnect
    ) {
      this.startPollLoop().catch((err) => {
        this.currentStatus.status = 'error';
        this.currentStatus.lastError =
          err instanceof Error ? err.message : String(err);
      });
    }
  }

  public async loadConfig(): Promise<WeixinBotConfig | null> {
    if (!fs.existsSync(this.configPath)) {
      return null;
    }
    try {
      const raw = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(raw);
      if (this.config?.botToken) {
        this.currentStatus.accountId = this.config.accountId;
        this.currentStatus.userId = this.config.userId;
        this.currentStatus.nickName = this.config.nickName;
        this.currentStatus.botType = this.config.botType || 'weixin';
        this.currentStatus.baseUrl =
          this.config.baseUrl || DEFAULT_ILINK_BASE_URL;
      }
      return this.config;
    } catch (err) {
      console.error('[WeixinConnector] Failed to parse config file:', err);
      throw err;
    }
  }

  public async saveConfig(
    config: Partial<WeixinBotConfig>
  ): Promise<WeixinBotConfig> {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    const merged: WeixinBotConfig = {
      enabled: config.enabled ?? this.config?.enabled ?? true,
      botType: config.botType ?? this.config?.botType ?? 'weixin',
      baseUrl:
        config.baseUrl?.trim() ||
        this.config?.baseUrl ||
        DEFAULT_ILINK_BASE_URL,
      botToken: config.botToken ?? this.config?.botToken,
      accountId: config.accountId ?? this.config?.accountId,
      userId: config.userId ?? this.config?.userId,
      nickName: config.nickName ?? this.config?.nickName,
      autoReconnect: config.autoReconnect ?? this.config?.autoReconnect ?? true,
      lastConnectedAt: config.lastConnectedAt ?? this.config?.lastConnectedAt,
    };

    fs.writeFileSync(this.configPath, JSON.stringify(merged, null, 2), 'utf-8');
    this.config = merged;
    this.currentStatus.botType = merged.botType;
    this.currentStatus.accountId = merged.accountId;
    this.currentStatus.userId = merged.userId;
    this.currentStatus.nickName = merged.nickName;
    this.currentStatus.baseUrl = merged.baseUrl;
    return merged;
  }

  public getStatus(): WeixinBotStatus {
    return {
      ...this.currentStatus,
      connected: this.currentStatus.status === 'connected',
      botType: this.config?.botType || this.currentStatus.botType || 'weixin',
      accountId: this.config?.accountId || this.currentStatus.accountId,
      userId: this.config?.userId || this.currentStatus.userId,
      nickName: this.config?.nickName || this.currentStatus.nickName,
      baseUrl:
        this.config?.baseUrl ||
        this.currentStatus.baseUrl ||
        DEFAULT_ILINK_BASE_URL,
    };
  }

  public async getQrCode(): Promise<WeixinQrCodeResult> {
    const baseUrl = this.config?.baseUrl || DEFAULT_ILINK_BASE_URL;
    // 微信个人助理协议：bot_type 为 '3'
    const url = `${baseUrl.replace(/\/+$/, '')}/ilink/bot/get_bot_qrcode?bot_type=3`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'iLink-App-ClientVersion': '1',
      },
    });

    if (!resp.ok) {
      throw new Error(
        `获取微信二维码失败: HTTP ${resp.status} ${resp.statusText}`
      );
    }

    const data = (await resp.json()) as {
      ret?: number;
      errcode?: number;
      errmsg?: string;
      qrcode?: string;
      qrcode_img?: string;
      qrcode_img_content?: string;
      expired_at?: number;
    };

    if (data.errcode && data.errcode !== 0) {
      throw new Error(data.errmsg || `获取二维码返回错误码: ${data.errcode}`);
    }

    if (!data.qrcode) {
      throw new Error('微信二维码接口未返回 qrcode 凭证');
    }

    const qrUrl = (data.qrcode_img_content || data.qrcode || '') as string;
    return {
      qrcode: data.qrcode,
      qrUrl,
      qrcodeImg: qrUrl,
      botType: 'weixin',
      expiredAt: data.expired_at,
    };
  }

  public async pollQrStatus(qrcode: string): Promise<WeixinQrPollResult> {
    if (!qrcode?.trim()) {
      throw new Error('二维码标识不能为空');
    }

    const baseUrl = this.config?.baseUrl || DEFAULT_ILINK_BASE_URL;
    const url = `${baseUrl.replace(/\/+$/, '')}/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode.trim())}`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'iLink-App-ClientVersion': '1',
      },
    });

    if (!resp.ok) {
      throw new Error(`查询微信二维码状态失败: HTTP ${resp.status}`);
    }

    const data = (await resp.json()) as {
      status?: 'wait' | 'scaned' | 'confirmed' | 'expired';
      bot_token?: string;
      account_id?: string;
      ilink_bot_id?: string;
      user_id?: string;
      ilink_user_id?: string;
      nick_name?: string;
      base_url?: string;
      errmsg?: string;
    };

    const status = data.status || 'wait';

    if (status === 'confirmed' && data.bot_token) {
      const resolvedBaseUrl = data.base_url || baseUrl;
      const accountId = data.ilink_bot_id || data.account_id;
      const userId = data.ilink_user_id || data.user_id;

      await this.saveConfig({
        enabled: true,
        botToken: data.bot_token,
        accountId,
        userId,
        nickName: data.nick_name,
        baseUrl: resolvedBaseUrl,
        lastConnectedAt: Date.now(),
      });

      this.currentStatus = {
        connected: true,
        status: 'connected',
        accountId,
        userId,
        nickName: data.nick_name,
        botType: this.config?.botType || 'weixin',
        baseUrl: resolvedBaseUrl,
        lastSyncTime: Date.now(),
      };

      this.startPollLoop().catch((err) => {
        this.currentStatus.status = 'error';
        this.currentStatus.lastError =
          err instanceof Error ? err.message : String(err);
      });

      return {
        status: 'confirmed',
        botToken: data.bot_token,
        accountId,
        userId,
        nickName: data.nick_name,
        baseUrl: resolvedBaseUrl,
        connected: true,
      };
    }

    return {
      status,
      message: data.errmsg,
    };
  }

  public async startPollLoop(): Promise<void> {
    if (this.isPolling) {
      return;
    }

    if (!this.config?.botToken) {
      this.currentStatus.status = 'disconnected';
      return;
    }

    this.isPolling = true;
    this.abortController = new AbortController();
    this.currentStatus.status = 'connected';
    this.currentStatus.connected = true;

    let retryDelay = 1000;

    const loop = async () => {
      while (this.isPolling && this.config?.botToken) {
        try {
          const baseUrl = this.config.baseUrl || DEFAULT_ILINK_BASE_URL;
          const url = `${baseUrl.replace(/\/+$/, '')}/ilink/bot/getupdates`;

          const bodyData = JSON.stringify({
            get_updates_buf: this.pollCursor || '',
            base_info: { channel_version: 'dsh-1.0.0' },
          });

          const resp = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              AuthorizationType: 'ilink_bot_token',
              Authorization: `Bearer ${this.config.botToken}`,
              'Content-Length': String(Buffer.byteLength(bodyData, 'utf-8')),
              'X-WECHAT-UIN': randomWechatUin(),
            },
            body: bodyData,
            signal: this.abortController?.signal,
          });

          if (!resp.ok) {
            if (resp.status === 401) {
              this.currentStatus.status = 'disconnected';
              this.currentStatus.connected = false;
              this.currentStatus.lastError =
                '微信助理凭据已失效，请重新扫码绑定';
              await this.disconnect(false);
              break;
            }
            throw new Error(`轮询 updates 异常: HTTP ${resp.status}`);
          }
          const data = (await resp.json()) as {
            ret?: number;
            errcode?: number;
            errmsg?: string;
            get_updates_buf?: string;
            msgs?: Array<{
              msg_type?: number;
              message_state?: number;
              from_user_id?: string;
              to_user_id?: string;
              context_token?: string;
              item_list?: Array<{
                type?: number;
                text_item?: { text?: string };
              }>;
            }>;
          };

          if (data.get_updates_buf) {
            this.pollCursor = data.get_updates_buf;
          }

          this.currentStatus.lastSyncTime = Date.now();
          this.currentStatus.status = 'connected';
          this.currentStatus.connected = true;
          this.currentStatus.lastError = undefined;
          retryDelay = 1000;

          if (Array.isArray(data.msgs)) {
            for (const item of data.msgs) {
              // 过滤用户发出的有效文本消息
              const textItem = item.item_list?.find(
                (i) => i.type === 1 && i.text_item?.text
              );
              const text = textItem?.text_item?.text;
              if (text && item.from_user_id) {
                await this.handleIncomingMessage({
                  fromUserId: item.from_user_id,
                  content: text,
                  contextToken: item.context_token,
                });
              }
            }
          }
        } catch (err: unknown) {
          const isAbort =
            (err instanceof Error && err.name === 'AbortError') ||
            !this.isPolling;
          if (isAbort) {
            break;
          }
          this.currentStatus.lastError =
            err instanceof Error ? err.message : String(err);
          const { promise, resolve } = Promise.withResolvers<void>();
          setTimeout(resolve, retryDelay);
          await promise;
          retryDelay = Math.min(retryDelay * 2, 30000);
        }
      }
      this.isPolling = false;
    };
    loop().catch((err) => {
      this.isPolling = false;
      this.currentStatus.status = 'error';
      this.currentStatus.lastError =
        err instanceof Error ? err.message : String(err);
    });
  }

  private async handleIncomingMessage(msg: {
    fromUserId: string;
    content: string;
    contextToken?: string;
  }): Promise<void> {
    // 拦截重置指令：仅支持 /new 开启全新对话
    const trimmed = msg.content.trim();
    const lower = trimmed.toLowerCase();

    if (lower === '/new') {
      try {
        if (this.ctx) {
          await assistantSessionManager.createAssistantSession(this.ctx);
        }
        await this.sendMessage({
          toUserId: msg.fromUserId,
          contextToken: msg.contextToken,
          content: '✅ 智能助理会话已重置，已为你开启全新的对话上下文。',
        });
        return;
      } catch (err: unknown) {
        console.warn(
          '[WeixinConnector] Failed to reset assistant session via command:',
          err
        );
      }
    }

    // 拦截帮助指令：说明 /new 指令用法
    if (lower === '/help' || trimmed === '帮助') {
      try {
        const helpMsg = `🤖 微信个人助理使用指引

• 发送任意文本即可与电脑端工作台 AI 助理对话
• /new - 重置上下文，开启全新会话
• /help - 查看本使用指南`;
        await this.sendMessage({
          toUserId: msg.fromUserId,
          contextToken: msg.contextToken,
          content: helpMsg,
        });
        return;
      } catch (err: unknown) {
        console.warn('[WeixinConnector] Failed to send help response:', err);
      }
    }

    // 将微信普通消息投递至 DSH 原生助理会话，并记录发送者上下文用于回复推回
    if (!this.ctx) return;
    try {
      const controller = (
        this.ctx as unknown as {
          sessionController?: {
            prompt: (req: unknown, signal: AbortSignal) => Promise<unknown>;
          };
        }
      ).sessionController;
      if (controller) {
        let assistantSessionId = await this.resolveAssistantSessionId();
        if (assistantSessionId) {
          this.pendingReplies.set(assistantSessionId, {
            toUserId: msg.fromUserId,
            contextToken: msg.contextToken,
            timestamp: Date.now(),
          });

          const promptPayload = {
            sessionId: assistantSessionId,
            requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            mode: 'queue',
            content: [{ type: 'text', text: msg.content }],
          };

          try {
            await controller.prompt(
              promptPayload,
              new AbortController().signal
            );
          } catch (promptErr: unknown) {
            const errStr = String(promptErr);
            if (
              errStr.includes('corrupt') ||
              errStr.includes('failed validation') ||
              errStr.includes('SessionQueryError')
            ) {
              console.warn(
                '[WeixinConnector] Stored assistant session is corrupt, creating clean session and retrying:',
                assistantSessionId
              );
              assistantSessionId =
                await assistantSessionManager.createAssistantSession(this.ctx);
              this.pendingReplies.set(assistantSessionId, {
                toUserId: msg.fromUserId,
                contextToken: msg.contextToken,
                timestamp: Date.now(),
              });
              promptPayload.sessionId = assistantSessionId;
              await controller.prompt(
                promptPayload,
                new AbortController().signal
              );
            } else {
              throw promptErr;
            }
          }
        }
      }
    } catch (err: unknown) {
      console.warn(
        '[WeixinConnector] Failed to inject message to DSH native session:',
        err
      );
    }
  }

  public async sendMessage(params: {
    toUserId?: string;
    content: string;
    contextToken?: string;
  }): Promise<{ success: boolean; message?: string }> {
    if (!this.config?.botToken) {
      throw new Error('微信助理未连接或未配置 Token');
    }

    const baseUrl = this.config.baseUrl || DEFAULT_ILINK_BASE_URL;
    const url = `${baseUrl.replace(/\/+$/, '')}/ilink/bot/sendmessage`;

    const targetUserId = params.toUserId || this.config.userId;
    if (!targetUserId && !params.contextToken) {
      throw new Error('缺少接收目标 user_id 或 context_token');
    }

    const bodyData = JSON.stringify({
      msg: {
        from_user_id: '',
        to_user_id: targetUserId,
        client_id: `dsh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message_type: 2,
        message_state: 2,
        context_token: params.contextToken,
        item_list: [
          {
            type: 1,
            text_item: {
              text: params.content,
            },
          },
        ],
      },
      base_info: { channel_version: 'dsh-1.0.0' },
    });

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        AuthorizationType: 'ilink_bot_token',
        Authorization: `Bearer ${this.config.botToken}`,
        'Content-Length': String(Buffer.byteLength(bodyData, 'utf-8')),
        'X-WECHAT-UIN': randomWechatUin(),
      },
      body: bodyData,
    });

    if (!resp.ok) {
      throw new Error(`发送微信消息失败: HTTP ${resp.status}`);
    }

    return { success: true };
  }

  public async disconnect(clearCredentials = false): Promise<void> {
    this.isPolling = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.currentStatus.status = 'disconnected';
    this.currentStatus.connected = false;

    if (clearCredentials) {
      if (fs.existsSync(this.configPath)) {
        fs.unlinkSync(this.configPath);
      }
      this.config = null;
      this.currentStatus.accountId = undefined;
      this.currentStatus.userId = undefined;
      this.currentStatus.nickName = undefined;
    } else if (this.config) {
      await this.saveConfig({ enabled: false });
    }
  }
}

export const weixinConnector = new WeixinConnectorService();
