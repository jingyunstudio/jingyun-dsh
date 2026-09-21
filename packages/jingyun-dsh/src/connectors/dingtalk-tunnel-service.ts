import crypto from 'node:crypto';

import type { Context } from '@deepseek-ai/cordis';

import { assistantSessionManager } from '../agent/assistant-session-manager';
import { dingtalkTunnelClient } from './dingtalk-tunnel-client';
import {
  sendDingtalkMarkdown,
  sendDingtalkOpenApiMessage,
} from './dingtalk-tunnel-support';
import type {
  DingtalkInboundMessage,
  DingtalkReplyContext,
  DingtalkTunnelConfig,
  DingtalkTunnelState,
} from './dingtalk-tunnel-types';

/**
 * 钉钉远程通道服务 (DingTalk Remote Channel Service)
 * 1. 管理与钉钉开放平台 Stream 模式长连接客户端生命周期；
 * 2. 消息接收与去重过滤（群聊 @ 机器人过滤）；
 * 3. 多模态附件自动下载与文件路径组装；
 * 4. 本地指令拦截 (/new 快速重置上下文，/help 使用指南)；
 * 5. DSH Agent 任务会话队列派发 (sessionController.prompt)；
 * 6. 监听 assistant/message 结果，优先通过 sessionWebhook，重启/超时后通过 OpenAPI 回传。
 */
export class DingtalkTunnelService {
  private ctx: Context | null = null;
  private pendingReplies = new Map<string, DingtalkReplyContext[]>();

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
            const queue = this.pendingReplies.get(session.id);
            if (!queue || queue.length === 0) return;

            // 先行出队，防止空消息或异常导致队列卡死阻塞后续请求
            const pending = queue.shift()!;
            if (queue.length === 0) {
              this.pendingReplies.delete(session.id);
            }

            const text = this.extractReplyText(event.data);
            if (!text) {
              console.warn(
                `[DingtalkTunnelService] assistant/message received but extracted empty text for session ${session.id}`
              );
              return;
            }

            await this.deliverReply(pending, text);
          }
        } catch (err: unknown) {
          console.error(
            '[DingtalkTunnelService] Failed to deliver assistant reply to DingTalk:',
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
    const content = msgObj ? msgObj.content : dataObj.content;

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

    if (msgObj && typeof msgObj.text === 'string') {
      return msgObj.text.trim();
    }
    if (typeof dataObj.text === 'string') {
      return dataObj.text.trim();
    }

    return '';
  }

  private async deliverReply(
    pending: DingtalkReplyContext,
    text: string
  ): Promise<void> {
    console.info(
      `[DingtalkTunnelService] Delivering reply via sessionWebhook (len: ${text.length})`
    );

    const webhookRes = await sendDingtalkMarkdown(
      pending.sessionWebhook,
      '智能助理回复',
      text
    );
    if (webhookRes.success) {
      return;
    }

    // 临时 sessionWebhook 失效时，尝试使用持久记录的会话 ID 通过官方 OpenAPI 发送
    const cfg = dingtalkTunnelClient.getConfig();
    if (cfg?.appKey && cfg?.appSecret && cfg?.lastChatId && cfg?.lastChatType) {
      const openApiRes = await sendDingtalkOpenApiMessage({
        appKey: cfg.appKey,
        appSecret: cfg.appSecret,
        robotCode: cfg.robotCode || cfg.appKey,
        targetChatId: cfg.lastChatId,
        targetChatType: cfg.lastChatType,
        targetSenderId: cfg.lastSenderId,
        title: '智能助理回复',
        text,
      });
      if (openApiRes.success) {
        return;
      }
    }

    throw new Error(`sessionWebhook 回复失败: ${webhookRes.error}`);
  }

  public async init(): Promise<void> {
    dingtalkTunnelClient.onMessage((msg) => this.handleInboundMessage(msg));
    await dingtalkTunnelClient.init();
  }

  public getStatus(): DingtalkTunnelState {
    return dingtalkTunnelClient.getStatus();
  }

  public async connect(overrideConfig?: DingtalkTunnelConfig): Promise<void> {
    await dingtalkTunnelClient.connect(overrideConfig);
  }

  public disconnect(): void {
    dingtalkTunnelClient.disconnect();
  }

  public async saveConfig(config: DingtalkTunnelConfig): Promise<void> {
    await dingtalkTunnelClient.saveConfig(config);
  }

  public async clearConfig(): Promise<void> {
    await dingtalkTunnelClient.clearConfig();
  }

  /**
   * 主动发送测试消息
   */
  public async sendMessage(params: {
    content: string;
    title?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const title = params.title || '智能助理测试消息';
    const activeWebhook = dingtalkTunnelClient.getActiveSessionWebhook();

    // 1. 优先使用随会话活跃的 sessionWebhook（免权限直达会话）
    if (activeWebhook) {
      const res = await sendDingtalkMarkdown(
        activeWebhook,
        title,
        params.content
      );
      if (res.success) {
        return res;
      }
    }

    // 2. 服务重启后或 sessionWebhook 失效后，使用持久记录的 lastChatId 通过官方 OpenAPI 发送
    const config = dingtalkTunnelClient.getConfig();
    if (
      config?.appKey &&
      config?.appSecret &&
      config?.lastChatId &&
      config?.lastChatType
    ) {
      const openApiRes = await sendDingtalkOpenApiMessage({
        appKey: config.appKey,
        appSecret: config.appSecret,
        robotCode: config.robotCode || config.appKey,
        targetChatId: config.lastChatId,
        targetChatType: config.lastChatType,
        targetSenderId: config.lastSenderId,
        title,
        text: params.content,
      });
      if (!openApiRes.success) {
        throw new Error(openApiRes.error || 'OpenAPI 测试消息发送失败');
      }
      return { success: true };
    }

    // 3. 既无活跃 sessionWebhook 也无持久会话目标
    throw new Error(
      '尚未建立钉钉会话目标。首次使用请先在钉钉群中@机器人或在单聊中发送一条消息建立会话。'
    );
  }

  private async handleLocalCommand(
    command: string,
    msg: DingtalkInboundMessage
  ): Promise<boolean> {
    const trimmed = command.trim();
    const lower = trimmed.toLowerCase();

    if (lower === '/new') {
      if (this.ctx) {
        await assistantSessionManager.createAssistantSession(this.ctx);
      }
      const replyText = '✅ 会话已重置，已为你开启全新的对话上下文。';
      if (msg.sessionWebhook) {
        await sendDingtalkMarkdown(
          msg.sessionWebhook,
          '会话已重置',
          replyText
        ).catch((err: unknown) => {
          console.error(
            '[DingtalkTunnelService] Failed to send reset reply:',
            err
          );
        });
      }
      return true;
    }

    if (lower === '/help') {
      const helpMsg = `🤖 **钉钉 AI 智能助理 (Stream 模式)**

• 发送任意文本、图片或文件即可与工作台智能助理对话
• \`/new\` - 重置上下文，开启全新会话
• \`/help\` - 查看本使用指南`;
      if (msg.sessionWebhook) {
        await sendDingtalkMarkdown(
          msg.sessionWebhook,
          '使用指南',
          helpMsg
        ).catch((err: unknown) => {
          console.error(
            '[DingtalkTunnelService] Failed to send help reply:',
            err
          );
        });
      }
      return true;
    }

    return false;
  }

  private async handleInboundMessage(
    msg: DingtalkInboundMessage
  ): Promise<void> {
    const chatType: 'p2p' | 'group' =
      msg.conversationType === '2' ? 'group' : 'p2p';
    const chatId = msg.conversationId;

    if (chatId) {
      dingtalkTunnelClient
        .recordLastChat({
          chatId,
          chatType,
          senderId: msg.senderId,
          sessionWebhook: msg.sessionWebhook,
          sessionWebhookExpiredTime: msg.sessionWebhookExpiredTime,
        })
        .catch((err) => {
          console.warn(
            '[DingtalkTunnelService] Failed to record last chat:',
            err
          );
        });
    }

    const config = dingtalkTunnelClient.getConfig();
    if (!config) return;

    // 1. 群聊场景：若开启了 requireMention，严格校验是否 @ 机器人
    const requireMention = config.requireMention ?? true;
    if (chatType === 'group' && requireMention) {
      if (!msg.isInAtList) {
        // 群聊未 @ 机器人，静默忽略
        return;
      }
    }

    // 2. 组装输入文本与多模态附件路径
    const textSegments: string[] = [];
    if (msg.text) {
      textSegments.push(msg.text);
    }

    if (msg.mediaFiles && msg.mediaFiles.length > 0) {
      for (const m of msg.mediaFiles) {
        const typeLabel = m.type === 'image' ? '图片' : '文件';
        textSegments.push(`[${typeLabel} ${m.fileName}: ${m.localPath}]`);
      }
    }

    let prompt = textSegments.join('\n').trim();

    // 过滤掉群聊中开头的 @机器人 文本（如 "@智能助理 "）
    if (chatType === 'group') {
      prompt = prompt.replace(/^@\S+\s*/, '').trim();
    }

    if (!prompt) {
      console.info(
        `[DingtalkTunnelService] Empty prompt after filtering for message ${msg.messageId}`
      );
      return;
    }

    console.info(
      `[DingtalkTunnelService] Received DingTalk message from ${msg.senderNick || msg.senderId} in ${chatType} (${chatId}): ${prompt.slice(0, 60)}...`
    );

    // 3. 拦截本地指令
    if (await this.handleLocalCommand(prompt, msg)) {
      return;
    }

    if (!this.ctx) {
      console.warn(
        '[DingtalkTunnelService] Cordis context not available to dispatch message'
      );
      await sendDingtalkMarkdown(
        msg.sessionWebhook,
        '服务未就绪',
        '⚠️ 助手服务未就绪，请在工作台客户端中确认服务运行状态。'
      );
      return;
    }

    // 4. 提交给 DSH Agent 任务队列
    try {
      const sessionId = await assistantSessionManager.ensureAssistantSession(
        this.ctx
      );

      const queue = this.pendingReplies.get(sessionId) || [];
      queue.push({
        messageId: msg.messageId,
        sessionWebhook: msg.sessionWebhook,
        timestamp: Date.now(),
      });
      this.pendingReplies.set(sessionId, queue);

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
        requestId: `dingtalk_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        mode: 'queue',
        content: [{ type: 'text', text: prompt }],
      };

      const dingtalkSentTime = (msg.raw as Record<string, any>)?.createAt;
      const inboundTransitMs = dingtalkSentTime
        ? Date.now() - Number(dingtalkSentTime)
        : undefined;
      console.info(
        `[DingtalkTunnelService] Dispatching prompt to DSH session ${sessionId}${
          inboundTransitMs !== undefined
            ? ` (DingTalk transit: ${inboundTransitMs}ms)`
            : ''
        }`
      );

      const promptStartTime = Date.now();
      await controller.prompt(promptPayload, new AbortController().signal);
      console.info(
        `[DingtalkTunnelService] Prompt admitted to session queue in ${Date.now() - promptStartTime}ms`
      );
    } catch (err: unknown) {
      console.error(
        '[DingtalkTunnelService] Error dispatching message to session:',
        err
      );
      await sendDingtalkMarkdown(
        msg.sessionWebhook,
        '处理失败',
        `❌ 处理消息失败: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

export const dingtalkTunnelService = new DingtalkTunnelService();
