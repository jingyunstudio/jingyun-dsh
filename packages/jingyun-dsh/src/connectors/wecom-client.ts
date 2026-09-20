import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { RawData } from 'ws';
import WebSocket from 'ws';

import { getDshHome } from '../common/paths';
import type {
  WecomConfig,
  WecomQrResult,
  WecomState,
  WecomStatus,
  WecomWsFrame,
} from './types';

function generateReqId(prefix = 'req'): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export type WecomFrameListener = (frame: WecomWsFrame) => Promise<void> | void;

export class WecomClient {
  private ws: WebSocket | null = null;
  private config: WecomConfig | null = null;
  private status: WecomStatus = 'disconnected';
  private connectedAt?: number;
  private lastError?: string;
  private lastChatId?: string;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private missedPongCount = 0;
  private maxMissedPong = 3;
  private isIntentionalDisconnect = false;
  private shouldReconnect = true;
  private reconnectAttempts = 0;

  private messageListeners: Set<WecomFrameListener> = new Set();
  private eventListeners: Set<WecomFrameListener> = new Set();
  private statusListeners: Set<(status: WecomStatus) => void> = new Set();

  private get configPath(): string {
    return path.join(getDshHome(), 'connectors', 'wecom', 'config.json');
  }

  public onMessage(listener: WecomFrameListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public onEvent(listener: WecomFrameListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  public onStatusChange(listener: (status: WecomStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: WecomStatus, error?: string): void {
    this.status = status;
    if (error) this.lastError = error;
    if (status === 'connected') {
      this.connectedAt = Date.now();
      this.lastError = undefined;
    }
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (err) {
        console.error('[WecomClient] Status listener error:', err);
      }
    }
  }

  public async init(): Promise<void> {
    await this.loadConfig();
    if (this.config?.botId && this.config?.botSecret) {
      console.log('[WecomClient] Found credentials, connecting to WeCom...');
      await this.connect();
    }
  }

  public getStatus(): WecomState {
    return {
      status: this.status,
      botId: this.config?.botId ? this.maskBotId(this.config.botId) : undefined,
      connectedAt: this.connectedAt,
      lastError: this.lastError,
    };
  }

  public getLastChatId(): string | undefined {
    return this.lastChatId;
  }

  public getConfig(): WecomConfig | null {
    return this.config;
  }

  public async loadConfig(): Promise<WecomConfig | null> {
    try {
      if (!fsSync.existsSync(this.configPath)) return null;
      const raw = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(raw);
      return this.config;
    } catch (err) {
      console.warn('[WecomClient] Failed to load config from disk:', err);
      return null;
    }
  }

  public async saveConfig(config: WecomConfig): Promise<void> {
    this.config = { ...this.config, ...config, updatedAt: Date.now() };
    await fs.mkdir(path.dirname(this.configPath), { recursive: true });
    await fs.writeFile(
      this.configPath,
      JSON.stringify(this.config, null, 2),
      'utf8'
    );
  }

  public async clearConfig(): Promise<void> {
    this.isIntentionalDisconnect = true;
    this.shouldReconnect = false;
    this.disconnect();
    this.config = null;
    try {
      if (fsSync.existsSync(this.configPath)) {
        await fs.unlink(this.configPath);
      }
    } catch (err) {
      console.warn('[WecomClient] Failed to remove config file:', err);
    }
  }

  public async connect(overrideConfig?: WecomConfig): Promise<void> {
    if (overrideConfig) {
      await this.saveConfig(overrideConfig);
    }
    if (!this.config?.botId || !this.config?.botSecret) {
      this.setStatus('error', '缺少 botId 或 botSecret');
      return;
    }
    if (this.ws) {
      this.disconnect();
    }

    this.setStatus('connecting');
    this.isIntentionalDisconnect = false;
    this.shouldReconnect = true;

    const gatewayUrl =
      this.config.gatewayUrl || 'wss://openws.work.weixin.qq.com';
    try {
      this.ws = new WebSocket(gatewayUrl);
      this.ws.on('open', () => {
        this.reconnectAttempts = 0;
        this.sendAuth();
        this.startHeartbeat();
      });
      this.ws.on('message', (data: RawData) => this.handleMessage(data));
      this.ws.on('close', () => {
        this.stopHeartbeat();
        this.ws = null;
        if (!this.isIntentionalDisconnect) {
          this.setStatus('disconnected');
          this.scheduleReconnect();
        }
      });
      this.ws.on('error', (err) => {
        this.setStatus('error', err.message);
      });
    } catch (err: unknown) {
      this.setStatus('error', err instanceof Error ? err.message : String(err));
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.isIntentionalDisconnect = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  private sendAuth(): void {
    if (!this.config?.botId || !this.config?.botSecret) return;
    this.sendFrame({
      cmd: 'aibot_subscribe',
      headers: { req_id: generateReqId('sub') },
      body: { bot_id: this.config.botId, secret: this.config.botSecret },
    });
  }

  private sendHeartbeat(): void {
    this.sendFrame({
      cmd: 'ping',
      headers: { req_id: generateReqId('ping') },
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        if (this.missedPongCount >= this.maxMissedPong) {
          this.ws.terminate();
          return;
        }
        this.missedPongCount++;
        this.sendHeartbeat();
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleMessage(data: RawData): void {
    try {
      const text = data.toString('utf8');
      const frame = JSON.parse(text) as WecomWsFrame;
      const reqId = frame.headers?.req_id || '';

      if (reqId.startsWith('sub') || frame.cmd === 'aibot_subscribe') {
        if (frame.errcode === 0) {
          this.setStatus('connected');
        } else {
          this.setStatus('error', frame.errmsg || '认证失败');
          this.disconnect();
        }
        return;
      }

      if (reqId.startsWith('ping') || frame.cmd === 'ping') {
        this.missedPongCount = 0;
        return;
      }

      if (frame.cmd === 'aibot_event_callback') {
        const body = frame.body as Record<string, unknown> | undefined;
        if (body?.event === 'disconnected_event') {
          this.shouldReconnect = false;
          this.disconnect();
        }
        for (const listener of this.eventListeners) {
          listener(frame);
        }
        return;
      }

      if (frame.cmd === 'aibot_msg_callback') {
        const body = frame.body as Record<string, unknown> | undefined;
        if (body?.chatid) this.lastChatId = String(body.chatid);
        else if (body?.from)
          this.lastChatId = String((body.from as any).userid || '');
        for (const listener of this.messageListeners) {
          listener(frame);
        }
        return;
      }

      if (frame.errcode !== undefined && frame.errcode !== 0) {
        console.warn(
          `[WecomClient] Server returned error: cmd=${frame.cmd || 'unknown'}, req_id=${reqId}, errcode=${frame.errcode}, errmsg=${frame.errmsg}`
        );
      }
    } catch (err) {
      console.error('[WecomClient] Error parsing message:', err);
    }
  }

  private scheduleReconnect(): void {
    if (this.isIntentionalDisconnect || !this.shouldReconnect) return;
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  public sendFrame(frame: unknown): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(JSON.stringify(frame));
      return true;
    } catch {
      return false;
    }
  }

  public async sendAsyncReply(
    chatId: string,
    chatType: 'single' | 'group',
    content: string
  ): Promise<boolean> {
    if (!this.ws || this.status !== 'connected') return false;
    const chatTypeNum = chatType === 'group' ? 2 : 1;
    const MAX_CHUNK = 2000;
    if (content.length <= MAX_CHUNK) {
      return this.sendFrame({
        cmd: 'aibot_send_msg',
        headers: { req_id: generateReqId('send') },
        body: {
          chatid: chatId,
          chat_type: chatTypeNum,
          msgtype: 'markdown',
          markdown: { content },
        },
      });
    }
    let ok = true;
    for (let i = 0; i < content.length; i += MAX_CHUNK) {
      const chunk = content.slice(i, i + MAX_CHUNK);
      const sent = this.sendFrame({
        cmd: 'aibot_send_msg',
        headers: { req_id: generateReqId('send') },
        body: {
          chatid: chatId,
          chat_type: chatTypeNum,
          msgtype: 'markdown',
          markdown: { content: chunk },
        },
      });
      if (!sent) ok = false;
    }
    return ok;
  }

  public sendWelcomeMsg(reqId: string, content: string): boolean {
    return this.sendFrame({
      cmd: 'aibot_respond_welcome_msg',
      headers: { req_id: reqId },
      body: { msgtype: 'text', text: { content } },
    });
  }

  public sendRespondMsg(reqId: string, content: string): boolean {
    return this.sendFrame({
      cmd: 'aibot_respond_msg',
      headers: { req_id: reqId },
      body: {
        msgtype: 'markdown',
        markdown: { content },
      },
    });
  }

  public async sendReply(params: {
    reqId?: string;
    chatId: string;
    chatType: 'single' | 'group';
    content: string;
  }): Promise<boolean> {
    if (!this.ws || this.status !== 'connected') {
      console.warn('[WecomClient] Cannot send reply: WebSocket not connected');
      return false;
    }

    const { reqId, chatId, chatType, content } = params;

    // 1. 如果有收到消息时的 reqId，优先发送官方标准的 aibot_respond_msg 被动回复
    if (reqId) {
      console.info(
        `[WecomClient] Responding to WeCom via aibot_respond_msg (reqId: ${reqId}, length: ${content.length})`
      );
      const ok = this.sendRespondMsg(reqId, content);
      if (ok) return true;
    }

    // 2. 无 reqId 或降级场景，使用 aibot_send_msg 主动推送
    console.info(
      `[WecomClient] Pushing message to WeCom via aibot_send_msg (chatId: ${chatId}, chatType: ${chatType}, length: ${content.length})`
    );
    return this.sendAsyncReply(chatId, chatType, content);
  }

  public async getQrCode(): Promise<{
    authUrl: string;
    qrCodeUrl: string;
    scode: string;
    expireSeconds: number;
  }> {
    const url = `https://work.weixin.qq.com/ai/qc/gen?source=codebuddy&state=state_${Date.now()}&timestamp=${Date.now()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      throw new Error(
        `获取企业微信授权页面失败: HTTP ${res.status} ${res.statusText}`
      );
    }
    const html = await res.text();
    const match = html.match(
      /window\.settings\s*=\s*(\{[\s\S]*?\})\s*(?:;|<\/script>)/
    );
    if (!match || !match[1]) {
      throw new Error('未能从企业微信授权页面提取配置信息');
    }
    const settings = JSON.parse(match[1]) as {
      scode?: string;
      auth_url?: string;
      expires_in?: number;
      [key: string]: unknown;
    };
    if (!settings.scode || !settings.auth_url) {
      throw new Error('企业微信返回的授权参数缺失 (scode 或 auth_url 缺失)');
    }
    return {
      authUrl: String(settings.auth_url),
      qrCodeUrl: String(settings.auth_url),
      scode: String(settings.scode),
      expireSeconds: Number(settings.expires_in) || 300,
    };
  }

  public async queryQrResult(scode: string): Promise<WecomQrResult> {
    const queryUrl = `https://work.weixin.qq.com/ai/qc/query_result?scode=${encodeURIComponent(scode)}`;
    const res = await fetch(queryUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      throw new Error(
        `查询企业微信授权结果失败: HTTP ${res.status} ${res.statusText}`
      );
    }
    const json = (await res.json()) as Record<string, unknown>;
    const data = json?.data as Record<string, unknown> | undefined;
    const status = String(data?.status || 'waiting');
    const botInfo = data?.bot_info as Record<string, unknown> | undefined;

    if (status === 'success' && botInfo?.botid && botInfo?.secret) {
      const botId = String(botInfo.botid);
      const botSecret = String(botInfo.secret);
      await this.connect({ botId, botSecret });
      return {
        success: true,
        status: 'success',
        botId,
        botName: String(botInfo.name || '企业微信智能机器人'),
        bot_info: botInfo,
        data: { status: 'success', botId, bot_info: botInfo },
      };
    }
    return {
      success: true,
      status: status as any,
      data: { status },
    };
  }

  public maskBotId(botId: string): string {
    if (!botId || botId.length <= 8) return '****';
    return `${botId.slice(0, 4)}****${botId.slice(-4)}`;
  }
}

export const wecomClient = new WecomClient();
