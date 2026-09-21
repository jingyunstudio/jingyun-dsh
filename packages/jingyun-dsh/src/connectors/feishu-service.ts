import crypto from 'node:crypto';

import type { Context } from '@deepseek-ai/cordis';

import { assistantSessionManager } from '../agent/assistant-session-manager';
import { feishuClient } from './feishu-client';
import {
  addTypingReaction,
  convertFeishuMessageContent,
  downloadMessageResource,
  getBaseUrl,
  getQuotedMessageContent,
  getTenantAccessToken,
  removeTypingReaction,
  sendMarkdownCard,
} from './feishu-support';
import type {
  FeishuConfig,
  FeishuInboundData,
  FeishuReplyContext,
  FeishuState,
} from './feishu-types';

/**
 * 飞书远程通道服务 (Feishu Remote Channel Service)
 * 1. 管理与飞书开放平台 WebSocket 长连接网关
 * 2. 消息接收、群聊 @ 机器人过滤与去重
 * 3. 附件与图片下载缓存、引用消息前缀组装
 * 4. 点亮 Typing Reaction 表情
 * 5. 本地快捷指令拦截 (/new, /help)
 * 6. DSH Agent 任务会话队列派发 (sessionController.prompt)
 * 7. 监听 assistant/message 并通过标准飞书交互式 Markdown 卡片回传
 */
export class FeishuService {
  private ctx: Context | null = null;
  private pendingReplies = new Map<string, FeishuReplyContext>();

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
                `[FeishuService] assistant/message received but extracted empty text for session ${session.id}`
              );
              return;
            }

            this.pendingReplies.delete(session.id);

            const config = feishuClient.getConfig();
            if (!config) {
              console.warn(
                '[FeishuService] Feishu config missing when delivering reply'
              );
              return;
            }

            const token = await getTenantAccessToken(config);
            const baseUrl = getBaseUrl(config.domain, config.customHost);

            // 清理 Typing reaction
            if (pending.reactionId) {
              removeTypingReaction(
                baseUrl,
                token,
                pending.messageId,
                pending.reactionId
              ).catch((reactionErr) => {
                console.warn(
                  '[FeishuService] Failed to clean up typing reaction:',
                  reactionErr
                );
              });
            }

            console.info(
              `[FeishuService] Forwarding assistant reply to Feishu (chatId: ${pending.chatId}, msgId: ${pending.messageId}, len: ${text.length})`
            );

            // 标准下发 Markdown 交互卡片
            await sendMarkdownCard(
              baseUrl,
              token,
              pending.chatId,
              text,
              pending.messageId
            );
          }
        } catch (err: unknown) {
          console.error(
            '[FeishuService] Failed to deliver assistant reply to Feishu:',
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
    feishuClient.onMessage((data) => this.handleInboundMessage(data));
    await feishuClient.init();
  }

  public getStatus(): FeishuState {
    return feishuClient.getStatus();
  }

  public async connect(overrideConfig?: FeishuConfig): Promise<void> {
    await feishuClient.connect(overrideConfig);
  }

  public disconnect(): void {
    feishuClient.disconnect();
  }

  public async saveConfig(config: FeishuConfig): Promise<void> {
    await feishuClient.saveConfig(config);
  }

  public async clearConfig(): Promise<void> {
    await feishuClient.clearConfig();
  }

  public async sendMessage(params: {
    chatId?: string;
    chatType?: 'p2p' | 'group';
    content: string;
    replyToMessageId?: string;
  }): Promise<{ success: boolean; messageId?: string }> {
    const config = feishuClient.getConfig();
    if (!config) {
      throw new Error('未配置飞书凭据');
    }
    const token = await getTenantAccessToken(config);
    const baseUrl = getBaseUrl(config.domain, config.customHost);

    const targetChatId = params.chatId || config.lastChatId;
    if (!targetChatId && !params.replyToMessageId) {
      throw new Error(
        '未获取到目标会话 ID，请先在飞书中向该机器人发送一条消息或在群聊中@机器人。'
      );
    }

    const res = await sendMarkdownCard(
      baseUrl,
      token,
      targetChatId || '',
      params.content,
      params.replyToMessageId
    );
    return {
      success: true,
      messageId: res.messageId,
    };
  }

  private async handleLocalCommand(
    command: string,
    chatId: string,
    messageId: string
  ): Promise<boolean> {
    const trimmed = command.trim();
    const lower = trimmed.toLowerCase();

    if (lower === '/new') {
      if (this.ctx) {
        await assistantSessionManager.createAssistantSession(this.ctx);
      }
      const config = feishuClient.getConfig();
      if (config) {
        const token = await getTenantAccessToken(config);
        const baseUrl = getBaseUrl(config.domain, config.customHost);
        await sendMarkdownCard(
          baseUrl,
          token,
          chatId,
          '✅ 会话已重置，已为你开启全新的对话上下文。',
          messageId
        ).catch((err) => {
          console.warn('[FeishuService] Failed to send reset response:', err);
        });
      }
      return true;
    }

    if (lower === '/help') {
      const helpMsg = `🤖 **飞书 AI 智能助理**

• 发送任意文本、图片或文件即可与智能助理对话
• \`/new\` - 重置上下文，开启全新会话
• \`/help\` - 查看本使用指南`;
      const config = feishuClient.getConfig();
      if (config) {
        const token = await getTenantAccessToken(config);
        const baseUrl = getBaseUrl(config.domain, config.customHost);
        await sendMarkdownCard(
          baseUrl,
          token,
          chatId,
          helpMsg,
          messageId
        ).catch((err) => {
          console.warn('[FeishuService] Failed to send help response:', err);
        });
      }
      return true;
    }

    return false;
  }

  private async handleInboundMessage(data: FeishuInboundData): Promise<void> {
    const msg = data.message;
    if (!msg || !msg.message_id) return;

    const chatType: 'p2p' | 'group' = msg.chat_type === 'p2p' ? 'p2p' : 'group';
    const chatId = msg.chat_id;
    if (chatId) {
      feishuClient.recordLastChat(chatId, chatType).catch((err) => {
        console.warn('[FeishuService] Failed to record last chat:', err);
      });
    }
    const config = feishuClient.getConfig();
    if (!config) return;

    // 1. 群聊场景校验是否 @机器人
    const botOpenId = feishuClient.getBotOpenId();
    const requireMention = config.requireMention ?? true;

    if (chatType === 'group' && requireMention) {
      const mentions = msg.mentions || [];
      const isMentioned = botOpenId
        ? mentions.some((m) => m.id?.open_id === botOpenId)
        : mentions.length > 0;

      if (!isMentioned) {
        // 未 @ 机器人，群聊中静默忽略
        return;
      }
    }

    // 2. 解析消息内容
    let parsedContent: Record<string, unknown> = {};
    try {
      parsedContent = JSON.parse(msg.content);
    } catch {
      console.warn(
        `[FeishuService] Failed to parse message content JSON for ${msg.message_id}`
      );
    }

    const converted = convertFeishuMessageContent(
      msg.message_type,
      parsedContent,
      msg.content
    );

    // 3. 多模态附件/图片下载解析
    const token = await getTenantAccessToken(config);
    const baseUrl = getBaseUrl(config.domain, config.customHost);
    const textSegments: string[] = [];

    for (const seg of converted.segments) {
      if (seg.type === 'text') {
        textSegments.push(seg.text);
      } else if (seg.type === 'resource') {
        const res = seg.resource;
        const downloaded = await downloadMessageResource(
          baseUrl,
          token,
          msg.message_id,
          res.fileKey,
          res.type
        );
        if (downloaded) {
          const label = res.type === 'image' ? '图片' : '文件';
          textSegments.push(
            `[${label} ${downloaded.fileName || res.fileName || ''}: ${downloaded.localPath}]`
          );
        } else {
          textSegments.push(
            `[${res.type === 'image' ? '图片' : '文件'}下载失败]`
          );
        }
      }
    }

    let prompt = textSegments.join('\n').trim();

    // 4. 清理群聊 @ 机器人占位符 (例如 "@_user_1 " 或 "@机器人名")
    if (msg.mentions && msg.mentions.length > 0) {
      for (const m of msg.mentions) {
        if (m.key) {
          const escaped = m.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          prompt = prompt.replace(new RegExp(`${escaped}\\s*`, 'g'), '');
        }
      }
      prompt = prompt.trim();
    }

    // 5. 解析被引用消息
    if (msg.parent_id) {
      const quoted = await getQuotedMessageContent(
        baseUrl,
        token,
        msg.parent_id
      );
      if (quoted) {
        const shortQuoted =
          quoted.length > 200 ? `${quoted.slice(0, 200)}...` : quoted;
        prompt = `> ${shortQuoted}\n\n${prompt}`;
      }
    }

    if (!prompt) {
      console.info(
        `[FeishuService] Empty text prompt after filtering for message ${msg.message_id}`
      );
      return;
    }

    console.info(
      `[FeishuService] Received Feishu message from ${data.sender?.sender_id?.open_id || 'unknown'} in ${chatType} (${chatId}): ${prompt.slice(0, 60)}...`
    );

    // 6. 拦截本地指令
    if (await this.handleLocalCommand(prompt, chatId, msg.message_id)) {
      return;
    }

    if (!this.ctx) {
      console.warn(
        '[FeishuService] Cordis context not available to dispatch message'
      );
      await sendMarkdownCard(
        baseUrl,
        token,
        chatId,
        '⚠️ 助手服务未就绪，请在客户端中初始化服务。',
        msg.message_id
      ).catch((err) => {
        console.warn(
          '[FeishuService] Failed to send service unready notice:',
          err
        );
      });
      return;
    }

    try {
      const sessionId = await assistantSessionManager.ensureAssistantSession(
        this.ctx
      );

      // 点亮 Typing reaction
      const reactionId = await addTypingReaction(
        baseUrl,
        token,
        msg.message_id
      );

      this.pendingReplies.set(sessionId, {
        chatId,
        messageId: msg.message_id,
        threadId: msg.root_id,
        chatType,
        reactionId,
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
        requestId: `feishu_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        mode: 'queue',
        content: [{ type: 'text', text: prompt }],
      };

      await controller.prompt(promptPayload, new AbortController().signal);
    } catch (err: unknown) {
      console.error(
        '[FeishuService] Error dispatching message to session:',
        err
      );
      await sendMarkdownCard(
        baseUrl,
        token,
        chatId,
        `❌ 处理消息失败: ${err instanceof Error ? err.message : String(err)}`,
        msg.message_id
      ).catch((sendErr) => {
        console.warn(
          '[FeishuService] Failed to send error notification to Feishu:',
          sendErr
        );
      });
    }
  }
}

export const feishuService = new FeishuService();
