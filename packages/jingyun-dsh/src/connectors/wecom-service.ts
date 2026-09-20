import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { promisify } from 'node:util';

import type { Context } from '@deepseek-ai/cordis';

import { assistantSessionManager } from '../agent/assistant-session-manager';
import { cliManager } from './cli-manager';
import type {
  WecomConfig,
  WecomQrResult,
  WecomReplyContext,
  WecomState,
  WecomWsFrame,
} from './types';
import { wecomClient } from './wecom-client';
import { downloadWecomMedia } from './wecom-media';

const execFileAsync = promisify(execFile);

/**
 * 企业微信智能连接器服务 (WeCom Service)
 * 1. 管理与企业微信官方网关的 WebSocket 长连接与心跳
 * 2. 消息接收与去重（5分钟滑动窗口）
 * 3. 附件下载与 AES 多模态解密
 * 4. 本地指令拦截 (/clear, /status, /help)
 * 5. DSH Agent 任务会话队列派发 (sessionController.prompt)
 * 6. 监听 assistant/message 并通过 Markdown 实时分段回推
 * 7. 支持向指定 chatId / 群聊主动下发通知或报告
 */
export class WecomService {
  private ctx: Context | null = null;
  private processedMsgIds = new Map<string, number>();
  private pendingReplies = new Map<string, WecomReplyContext>();

  public setContext(ctx: Context): void {
    this.ctx = ctx;

    ctx.on(
      'session/event',
      async (
        session: { id: string },
        event: { type: string; data?: unknown }
      ) => {
        try {
          if (event.type === 'assistant/message') {
            const pending = this.pendingReplies.get(session.id);
            if (!pending) return;

            const text = this.extractReplyText(event.data);
            if (!text) {
              console.warn(
                `[WecomService] assistant/message received but extracted empty text for session ${session.id}`
              );
              return;
            }

            this.pendingReplies.delete(session.id);

            console.info(
              `[WecomService] Forwarding assistant reply to WeCom (chatId: ${pending.chatId}, reqId: ${pending.reqId || 'none'}, len: ${text.length})`
            );

            await wecomClient.sendReply({
              reqId: pending.reqId,
              chatId: pending.chatId,
              chatType: pending.chattype,
              content: text,
            });
          }
        } catch (err: unknown) {
          console.error(
            '[WecomService] Failed to deliver assistant reply to WeCom:',
            err
          );
        }
      }
    );
  }

  private extractReplyText(data: unknown): string {
    if (!data) return '';
    if (typeof data === 'string') return data.trim();

    const dataObj = data as Record<string, unknown>;
    const msgObj = dataObj.message as Record<string, unknown> | undefined;
    const content = msgObj?.content || dataObj.content;

    if (Array.isArray(content)) {
      const textParts: string[] = [];
      for (const part of content) {
        if (typeof part === 'string') {
          textParts.push(part);
        } else if (part && typeof part === 'object') {
          const item = part as { type?: string; text?: string };
          if (item.type === 'text' && typeof item.text === 'string') {
            textParts.push(item.text);
          }
        }
      }
      const combined = textParts.join('\n').trim();
      if (combined) return combined;
    }

    if (typeof msgObj?.text === 'string' && msgObj.text.trim()) {
      return msgObj.text.trim();
    }
    if (typeof dataObj.text === 'string' && dataObj.text.trim()) {
      return dataObj.text.trim();
    }

    return '';
  }

  public async init(): Promise<void> {
    wecomClient.onMessage((frame) => this.handleMsgCallback(frame));
    wecomClient.onEvent((frame) => this.handleEventCallback(frame));
    await wecomClient.init();
  }

  public getStatus(): WecomState {
    return wecomClient.getStatus();
  }

  public async connect(overrideConfig?: WecomConfig): Promise<void> {
    await wecomClient.connect(overrideConfig);
  }

  public disconnect(): void {
    wecomClient.disconnect();
  }

  public async saveConfig(config: WecomConfig): Promise<void> {
    await wecomClient.saveConfig(config);
  }

  public async clearConfig(): Promise<void> {
    await wecomClient.clearConfig();
  }

  public async getQrCode(): Promise<{
    authUrl: string;
    qrCodeUrl: string;
    scode: string;
    expireSeconds: number;
  }> {
    return wecomClient.getQrCode();
  }

  public async queryQrResult(scode: string): Promise<WecomQrResult> {
    return wecomClient.queryQrResult(scode);
  }

  /**
   * 确保 wecom-cli 已通过当前机器人的 botId 和 botSecret 完成授权
   * 当 Token 过期 (853004) 或初次接入时自动调用
   */
  public async ensureCliAuthorized(): Promise<void> {
    const config = wecomClient.getConfig() || (await wecomClient.loadConfig());
    if (!config?.botId || !config?.botSecret) {
      throw new Error(
        '企业微信尚未绑定机器人凭证（缺少 botId/botSecret），请先在客户端连接器面板中扫码接入'
      );
    }

    const cliExec = cliManager.resolveCliExec('wecom');
    if (!cliExec) {
      throw new Error('未检测到 wecom-cli 命令行工具，请先在连接器面板中安装');
    }

    console.info(
      `[WecomService] Syncing CLI credentials for bot ${wecomClient.maskBotId(config.botId)}...`
    );
    try {
      await execFileAsync(
        cliExec,
        [
          'auth',
          'init',
          '--bot-id',
          config.botId,
          '--secret',
          config.botSecret,
        ],
        {
          env: cliManager.getEnv(),
          timeout: 20000,
          shell: process.platform === 'win32',
        }
      );
      console.info('[WecomService] CLI credentials successfully synced.');

      // 凭据同步后，若尚未记录 authorizedUserId，自动调用 whoami 提取并持久化
      if (!config.authorizedUserId) {
        try {
          const { stdout } = await execFileAsync(
            cliExec,
            ['identity', 'whoami'],
            {
              env: cliManager.getEnv(),
              timeout: 10000,
              shell: process.platform === 'win32',
            }
          );
          const match = stdout.match(
            /(?:授权真人用户身份[\s\S]*?ID：|ID：\s*)(wo[a-zA-Z0-9_-]+)/
          );
          if (match && match[1]) {
            config.authorizedUserId = match[1];
            await wecomClient.saveConfig(config);
            console.info(
              `[WecomService] Auto-discovered and saved authorizedUserId: ${match[1]}`
            );
          }
        } catch (e) {
          console.warn(
            '[WecomService] Failed to auto-discover authorizedUserId:',
            e
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`企业微信 CLI 授权凭据同步失败: ${msg}`);
    }
  }

  /**
   * 代理执行 wecom-cli 命令行指令
   * 自带 853004 (Token Expired) 捕获与凭证自动自愈重试
   */
  public async executeCli(
    args: string[]
  ): Promise<{ stdout: string; stderr: string }> {
    const cliExec = cliManager.resolveCliExec('wecom');
    if (!cliExec) {
      throw new Error('未检测到 wecom-cli 命令行工具，请先在连接器面板中安装');
    }

    const runOnce = async (): Promise<{
      stdout: string;
      stderr: string;
      error?: Error;
      raw: string;
    }> => {
      try {
        const { stdout, stderr } = await execFileAsync(cliExec, args, {
          env: cliManager.getEnv(),
          timeout: 60000,
          encoding: 'utf8',
          shell: process.platform === 'win32',
        });
        const raw = `${stdout}\n${stderr}`;
        return { stdout: stdout.trim(), stderr: stderr.trim(), raw };
      } catch (err: any) {
        const stdout = String(err.stdout || '').trim();
        const stderr = String(err.stderr || err.message || '').trim();
        const raw = `${stdout}\n${stderr}`;
        return { stdout, stderr, error: err, raw };
      }
    };

    let result = await runOnce();

    // 检查是否遭遇 853004 (cli token expired)
    if (
      result.raw.includes('853004') ||
      result.raw.includes('cli token expired')
    ) {
      console.warn(
        '[WecomService] CLI token expired (853004). Attempting silent re-auth with stored bot credentials...'
      );
      await this.ensureCliAuthorized();
      result = await runOnce();
    }

    if (result.error) {
      throw new Error(result.stderr || result.stdout || result.error.message);
    }

    return { stdout: result.stdout, stderr: result.stderr };
  }

  /**
   * 解析消息发送目标：
   * 1. 若显式指定目标（如群聊或特定同事 ID），直接使用
   * 2. 若未指定，单一明确目标为当前 Bot 扫码绑定的授权主人（本人）
   */
  public async resolveTargetChatId(preferredChatId?: string): Promise<string> {
    if (preferredChatId && preferredChatId.trim()) {
      return preferredChatId.trim();
    }

    const config = wecomClient.getConfig() || (await wecomClient.loadConfig());
    if (config?.authorizedUserId && config.authorizedUserId.trim()) {
      return config.authorizedUserId.trim();
    }

    // 若本地未缓存授权人 ID，通过 whoami 提取并持久化
    const { stdout } = await this.executeCli(['identity', 'whoami']);
    const match = stdout.match(
      /(?:授权真人用户身份[\s\S]*?ID：|ID：\s*)(wo[a-zA-Z0-9_-]+)/
    );
    if (match && match[1]) {
      const userId = match[1];
      if (config) {
        config.authorizedUserId = userId;
        await wecomClient.saveConfig(config);
      }
      return userId;
    }

    throw new Error(
      '未能获取当前企业微信机器人的授权人身份，请在连接器面板重新扫码绑定。'
    );
  }

  /**
   * 主动向企微单聊或群聊发送消息
   * 优先通过长连接 WebSocket 直发，未建连或异常时通过 CLI 执行
   */
  public async sendMessage(params: {
    chatId?: string;
    chatType?: 'single' | 'group';
    content: string;
  }): Promise<{ success: boolean; chatId: string }> {
    if (!params.content || !params.content.trim()) {
      throw new Error('发送内容不能为空');
    }

    const targetChatId = await this.resolveTargetChatId(params.chatId);
    const chatType = params.chatType || 'single';

    // 1. 优先走长连接通道（毫秒级、0 进程开销、免 Token 过期）
    if (wecomClient.getStatus().status === 'connected') {
      const ok = await wecomClient.sendAsyncReply(
        targetChatId,
        chatType,
        params.content
      );
      if (ok) {
        return { success: true, chatId: targetChatId };
      }
      console.warn(
        '[WecomService] WebSocket delivery failed, falling back to CLI...'
      );
    }

    // 2. 长连接未就绪或发送失败时，通过自愈 CLI 发送
    const payload = {
      chat_id: targetChatId,
      msg_type: 'markdown',
      markdown: { content: params.content },
    };
    await this.executeCli([
      'message',
      'aibot',
      'send',
      '--json',
      JSON.stringify(payload),
    ]);

    return { success: true, chatId: targetChatId };
  }

  private isDuplicate(msgid: string): boolean {
    const now = Date.now();
    if (this.processedMsgIds.size > 2000) {
      for (const [id, time] of this.processedMsgIds.entries()) {
        if (now - time > 300_000) {
          this.processedMsgIds.delete(id);
        }
      }
    }
    if (this.processedMsgIds.has(msgid)) {
      return true;
    }
    this.processedMsgIds.set(msgid, now);
    return false;
  }

  private async extractContent(
    body: NonNullable<WecomWsFrame['body']>
  ): Promise<string> {
    const msgtype = body.msgtype;
    switch (msgtype) {
      case 'text':
        return body.text?.content || '';
      case 'mixed': {
        const items = body.mixed?.msg_item;
        if (!Array.isArray(items)) return '';
        const textParts: string[] = [];
        for (const item of items) {
          if (item.msgtype === 'text' && item.text?.content) {
            textParts.push(item.text.content);
          } else if (item.msgtype === 'image' && item.image?.url) {
            try {
              const filePath = await downloadWecomMedia(
                item.image.url,
                item.image.aeskey,
                '.jpg'
              );
              textParts.push(`[图片: ${filePath}]`);
            } catch (e: unknown) {
              console.warn(
                '[WecomService] Failed to download mixed image:',
                e instanceof Error ? e.message : String(e)
              );
            }
          } else if (item.msgtype === 'file' && item.file?.url) {
            try {
              const ext = item.file.filename
                ? path.extname(item.file.filename)
                : '.bin';
              const filePath = await downloadWecomMedia(
                item.file.url,
                item.file.aeskey,
                ext
              );
              textParts.push(`[文件 ${item.file.filename || ''}: ${filePath}]`);
            } catch (e: unknown) {
              console.warn(
                '[WecomService] Failed to download mixed file:',
                e instanceof Error ? e.message : String(e)
              );
            }
          } else if (item.msgtype === 'voice') {
            const voiceText = item.voice?.content || item.voice?.text;
            if (voiceText) textParts.push(voiceText);
          }
        }
        return textParts.join('\n');
      }
      case 'image': {
        if (body.image?.url) {
          try {
            const filePath = await downloadWecomMedia(
              body.image.url,
              body.image.aeskey,
              '.jpg'
            );
            return `[图片: ${filePath}]`;
          } catch (e: unknown) {
            console.warn(
              '[WecomService] Failed to download image:',
              e instanceof Error ? e.message : String(e)
            );
            return '[图片下载失败]';
          }
        }
        return '';
      }
      case 'file': {
        if (body.file?.url) {
          try {
            const ext = body.file.filename
              ? path.extname(body.file.filename)
              : '.bin';
            const filePath = await downloadWecomMedia(
              body.file.url,
              body.file.aeskey,
              ext
            );
            return `[文件 ${body.file.filename || ''}: ${filePath}]`;
          } catch (e: unknown) {
            console.warn(
              '[WecomService] Failed to download file:',
              e instanceof Error ? e.message : String(e)
            );
            return `[文件 ${body.file.filename || ''} 下载失败]`;
          }
        }
        return '';
      }
      case 'voice':
        return body.voice?.content || body.voice?.text || '';
      default:
        return body.text?.content || '';
    }
  }

  private async handleLocalCommand(
    command: string,
    chatId: string,
    chattype: 'single' | 'group'
  ): Promise<boolean> {
    const trimmed = command.trim();
    const lower = trimmed.toLowerCase();

    if (lower === '/clear' || lower === '/reset' || lower === '/new') {
      if (this.ctx) {
        await assistantSessionManager.createAssistantSession(this.ctx);
      }
      await wecomClient.sendAsyncReply(
        chatId,
        chattype,
        '✅ 会话已重置，已为你开启全新的对话上下文。'
      );
      return true;
    }

    if (lower === '/help') {
      const helpMsg = `🤖 **企业微信 AI 助手**

• 发送任意文本、图片或文件即可与助手对话
• \`/clear\` 或 \`/reset\` 或 \`/new\` - 重置上下文，开启全新会话
• \`/status\` - 查看当前连接状态与会话信息
• \`/help\` - 查看本帮助指南`;
      await wecomClient.sendAsyncReply(chatId, chattype, helpMsg);
      return true;
    }

    if (lower === '/status') {
      const state = wecomClient.getStatus();
      const uptimeSec = state.connectedAt
        ? Math.floor((Date.now() - state.connectedAt) / 1000)
        : 0;
      const uptimeStr =
        uptimeSec > 3600
          ? `${Math.floor(uptimeSec / 3600)}小时${Math.floor((uptimeSec % 3600) / 60)}分`
          : `${Math.floor(uptimeSec / 60)}分${uptimeSec % 60}秒`;
      const currentSessionId =
        assistantSessionManager.getSavedSessionId() || '未初始化';
      const statusMsg = `🤖 **企业微信运行状态**

• **连接状态**: ${state.status === 'connected' ? '🟢 已连接 (Connected)' : '🔴 ' + state.status}
• **机器人 ID**: \`${state.botId || '未知'}\`
• **会话 ID**: \`${currentSessionId}\`
• **在线时长**: ${uptimeStr}`;
      await wecomClient.sendAsyncReply(chatId, chattype, statusMsg);
      return true;
    }

    return false;
  }

  private handleEventCallback(frame: WecomWsFrame): void {
    const body = frame.body;
    const event = body?.event;
    console.info(`[WecomService] Received event callback: ${event}`);

    if (event === 'enter_chat') {
      const reqId = frame.headers?.req_id;
      const isGroup = body?.chattype === 'group';
      const welcomeText = isGroup
        ? '大家好！我是 AI 助手。在群里 @我 即可提问。'
        : '你好！我是 AI 助手，有什么可以帮你的？';
      if (reqId) {
        wecomClient.sendWelcomeMsg(reqId, welcomeText);
      }
    }
  }

  private async handleMsgCallback(frame: WecomWsFrame): Promise<void> {
    const body = frame.body;
    if (!body) return;

    const msgid = body.msgid ? String(body.msgid) : '';
    if (msgid && this.isDuplicate(msgid)) {
      console.info(`[WecomService] Duplicate message ignored: ${msgid}`);
      return;
    }

    const chattype: 'single' | 'group' =
      body.chattype === 'group' ? 'group' : 'single';
    const chatId =
      chattype === 'group'
        ? String(body.chatid || '')
        : String(body.from?.userid || body.chatid || '');

    if (!chatId) {
      console.warn('[WecomService] Missing valid chatId from message frame');
      return;
    }

    const prompt = await this.extractContent(body);
    if (!prompt || !prompt.trim()) {
      console.warn(
        `[WecomService] No prompt content extracted from msg ${msgid}, msgtype: ${body.msgtype}`
      );
      return;
    }

    console.info(
      `[WecomService] Received message from ${body.from?.userid || 'unknown'}: ${prompt.slice(0, 60)}...`
    );

    if (await this.handleLocalCommand(prompt, chatId, chattype)) {
      return;
    }

    if (!this.ctx) {
      console.warn(
        '[WecomService] Cordis context not available to dispatch message'
      );
      await wecomClient.sendAsyncReply(
        chatId,
        chattype,
        '⚠️ 助手服务未就绪，请在客户端中初始化服务。'
      );
      return;
    }

    try {
      const sessionId = await assistantSessionManager.ensureAssistantSession(
        this.ctx
      );

      this.pendingReplies.set(sessionId, {
        reqId: frame.headers?.req_id,
        chatId,
        chattype,
        msgid,
        aibotid: body.aibotid,
        streamId: crypto.randomUUID(),
        timestamp: Date.now(),
      });

      const cordisCtx = this.ctx as unknown as {
        sessionController?: {
          prompt: (req: unknown, signal: AbortSignal) => Promise<unknown>;
        };
      };
      const controller = cordisCtx.sessionController;
      if (!controller || typeof controller.prompt !== 'function') {
        throw new Error('DSH sessionController is not available');
      }

      const promptPayload = {
        sessionId,
        requestId: `wecom_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        mode: 'queue',
        content: [{ type: 'text', text: prompt }],
      };

      await controller.prompt(promptPayload, new AbortController().signal);
    } catch (err: unknown) {
      console.error(
        '[WecomService] Error dispatching message to session:',
        err
      );
      await wecomClient.sendAsyncReply(
        chatId,
        chattype,
        `❌ 处理消息失败: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

export const wecomService = new WecomService();
