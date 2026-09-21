import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { getDshHome } from '../common/paths';
import type {
  FeishuBotInfo,
  FeishuConfig,
  FeishuConvertedContent,
  FeishuSegment,
} from './feishu-types';

export const DEFAULT_FEISHU_BASE_URL = 'https://open.feishu.cn/open-apis';
export const DEFAULT_LARK_BASE_URL = 'https://open.larksuite.com/open-apis';

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * 计算飞书 OpenAPI base URL
 */
export function getBaseUrl(
  domain?: 'feishu' | 'lark',
  customHost?: string
): string {
  const trimmed = typeof customHost === 'string' ? customHost.trim() : '';
  if (trimmed) return trimmed.replace(/\/+$/, '');
  if (domain === 'lark') return DEFAULT_LARK_BASE_URL;
  return DEFAULT_FEISHU_BASE_URL;
}

/**
 * 计算飞书长连接（WebSocket）使用的 origin
 * 去除末尾的 /open-apis，避免 SDK 拼接后出现 /open-apis/callback/ws/endpoint 404
 */
export function getWsOrigin(
  domain?: 'feishu' | 'lark',
  customHost?: string
): string {
  return getBaseUrl(domain, customHost).replace(/\/+open-apis\/*$/i, '');
}

/**
 * 获取租户访问凭证 (tenant_access_token)
 */
export async function getTenantAccessToken(
  config: FeishuConfig
): Promise<string> {
  const baseUrl = getBaseUrl(config.domain, config.customHost);
  const cacheKey = `${config.appId}|${baseUrl}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt - 60000) {
    return cached.token;
  }

  const url = `${baseUrl}/auth/v3/tenant_access_token/internal`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      app_id: config.appId,
      app_secret: config.appSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `获取飞书凭据失败: HTTP ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    code: number;
    msg?: string;
    tenant_access_token?: string;
    expire?: number;
  };

  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(
      `飞书凭据认证错误: code=${data.code}, msg=${data.msg || '未知错误'}`
    );
  }

  tokenCache.set(cacheKey, {
    token: data.tenant_access_token,
    expiresAt: Date.now() + (data.expire || 7200) * 1000,
  });

  return data.tenant_access_token;
}

/**
 * 校验并获取飞书机器人基础信息
 */
export async function getBotInfo(config: FeishuConfig): Promise<FeishuBotInfo> {
  const token = await getTenantAccessToken(config);
  const baseUrl = getBaseUrl(config.domain, config.customHost);
  const response = await fetch(`${baseUrl}/bot/v3/info`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`飞书机器人自检探活失败: HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    code: number;
    msg?: string;
    bot?: FeishuBotInfo;
  };

  if (data.code !== 0 || !data.bot) {
    throw new Error(
      `获取飞书机器人信息失败: code=${data.code}, msg=${data.msg || '未知'}`
    );
  }

  return data.bot;
}

/**
 * 下载消息关联资源（图片或附件）
 */
export async function downloadMessageResource(
  baseUrl: string,
  token: string,
  messageId: string,
  fileKey: string,
  resourceType: 'image' | 'file'
): Promise<{
  localPath: string;
  contentType?: string;
  fileName?: string;
  size: number;
} | null> {
  try {
    const url = `${baseUrl}/im/v1/messages/${messageId}/resources/${fileKey}?type=${resourceType}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
      console.warn(
        `[FeishuSupport] Resource download failed: HTTP ${resp.status}, fileKey: ${fileKey}`
      );
      return null;
    }

    const buffer = Buffer.from(await resp.arrayBuffer());
    const contentType = resp.headers.get('content-type') || undefined;
    const disposition = resp.headers.get('content-disposition') || '';
    const fileNameMatch =
      disposition.match(/filename\*=UTF-8''([^;\n]+)/i) ||
      disposition.match(/filename=["']?([^"';\n]+)/i);
    const fileName = fileNameMatch
      ? decodeURIComponent(fileNameMatch[1].replace(/^"|"$/g, ''))
      : undefined;

    const ext =
      path.extname(fileName || '') ||
      (resourceType === 'image' ? '.png' : '.bin');
    const mediaDir = path.join(getDshHome(), 'data', 'feishu-media');
    await fs.mkdir(mediaDir, { recursive: true });

    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const localPath = path.join(mediaDir, `${hash}${ext}`);
    await fs.writeFile(localPath, buffer);

    return {
      localPath,
      contentType,
      fileName,
      size: buffer.length,
    };
  } catch (err) {
    console.warn(
      '[FeishuSupport] Error downloading message resource:',
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

/**
 * 点亮飞书消息的 "Typing" 状态 Reaction
 */
export async function addTypingReaction(
  baseUrl: string,
  token: string,
  messageId: string
): Promise<string | null> {
  try {
    const url = `${baseUrl}/im/v1/messages/${messageId}/reactions`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reaction_type: { emoji_type: 'Typing' } }),
    });

    if (!resp.ok) {
      console.warn(
        `[FeishuSupport] Failed to add typing reaction: HTTP ${resp.status}`
      );
      return null;
    }
    const json = (await resp.json()) as {
      code: number;
      data?: { reaction_id?: string };
    };
    if (json.code === 0 && json.data?.reaction_id) {
      return json.data.reaction_id;
    }
    return null;
  } catch (err) {
    console.warn('[FeishuSupport] Error adding typing reaction:', err);
    return null;
  }
}

/**
 * 移除飞书消息的 Reaction
 */
export async function removeTypingReaction(
  baseUrl: string,
  token: string,
  messageId: string,
  reactionId: string
): Promise<void> {
  try {
    const url = `${baseUrl}/im/v1/messages/${messageId}/reactions/${reactionId}`;
    await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.warn('[FeishuSupport] Error removing typing reaction:', err);
  }
}

/**
 * 优化飞书 Markdown 样式排版
 */
export function optimizeMarkdownStyle(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // 飞书标题大小适度下调，保证在移动端与桌面端舒适易读
    line = line.replace(/^(#{1,6})\s/, (_match, hashes) =>
      hashes.length === 1 ? '#### ' : '##### '
    );
    if (i > 0) {
      const prev = result[result.length - 1];
      const isTableOrFence = /^\s*(\|.*\||```)/.test(line);
      const prevIsBlank = prev?.trim() === '';
      if (isTableOrFence && !prevIsBlank) result.push('');
    }
    result.push(line);
    if (
      /^```\s*$/.test(line) &&
      i < lines.length - 1 &&
      lines[i + 1]?.trim() !== ''
    ) {
      result.push('');
    }
  }
  return result.join('\n');
}

/**
 * 下发标准飞书 Markdown 2.0 交互卡片
 */
export async function sendMarkdownCard(
  baseUrl: string,
  token: string,
  chatId: string,
  markdown: string,
  replyToMessageId?: string
): Promise<{ messageId: string }> {
  const card = {
    schema: '2.0',
    config: { wide_screen_mode: true },
    body: {
      elements: [
        {
          tag: 'markdown',
          content: optimizeMarkdownStyle(markdown),
        },
      ],
    },
  };

  const url = replyToMessageId
    ? `${baseUrl}/im/v1/messages/${replyToMessageId}/reply`
    : `${baseUrl}/im/v1/messages?receive_id_type=chat_id`;

  const body = replyToMessageId
    ? {
        msg_type: 'interactive',
        content: JSON.stringify(card),
      }
    : {
        receive_id: chatId,
        msg_type: 'interactive',
        content: JSON.stringify(card),
      };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`飞书发送卡片失败 HTTP ${response.status}: ${errorText}`);
  }

  const result = (await response.json()) as {
    code: number;
    msg?: string;
    data?: { message_id?: string };
  };

  if (result.code !== 0) {
    throw new Error(
      `飞书发送卡片业务错误: code=${result.code}, msg=${result.msg || '未知'}`
    );
  }

  return { messageId: result.data?.message_id || '' };
}

/**
 * 获取被引用父消息文本内容
 */
export async function getQuotedMessageContent(
  baseUrl: string,
  token: string,
  parentId: string
): Promise<string | null> {
  try {
    const resp = await fetch(`${baseUrl}/im/v1/messages/${parentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
      console.warn(
        `[FeishuSupport] Failed to fetch quoted message ${parentId}: HTTP ${resp.status}`
      );
      return null;
    }
    const result = (await resp.json()) as {
      code: number;
      data?: {
        items?: Array<{
          msg_type: string;
          body?: { content?: string };
        }>;
      };
    };
    if (result.code === 0 && result.data?.items?.[0]) {
      const quoted = result.data.items[0];
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(quoted.body?.content || '{}');
      } catch (parseErr) {
        console.warn(
          `[FeishuSupport] Failed to parse quoted message body JSON:`,
          parseErr
        );
      }
      const converted = convertFeishuMessageContent(
        quoted.msg_type,
        parsed,
        quoted.body?.content
      );
      const textParts = converted.segments
        .filter((s) => s.type === 'text')
        .map((s) => (s as { text: string }).text);
      return textParts.join('\n').trim();
    }
  } catch (err) {
    console.warn(
      `[FeishuSupport] Error fetching quoted message ${parentId}:`,
      err
    );
  }
  return null;
}

/**
 * 飞书入站消息内容转换器
 */
export function convertFeishuMessageContent(
  messageType: string,
  content: Record<string, unknown>,
  rawContent?: string
): FeishuConvertedContent {
  switch (messageType) {
    case 'text': {
      const text = typeof content.text === 'string' ? content.text.trim() : '';
      return { segments: text ? [{ type: 'text', text }] : [] };
    }
    case 'image': {
      const fileKey = content.image_key as string | undefined;
      if (!fileKey) return { segments: [] };
      return {
        segments: [
          {
            type: 'resource',
            resource: {
              type: 'image',
              fileKey,
              fileName: (content.file_name as string) || 'image.png',
            },
          },
        ],
      };
    }
    case 'file': {
      const fileKey = content.file_key as string | undefined;
      if (!fileKey) return { segments: [] };
      return {
        segments: [
          {
            type: 'resource',
            resource: {
              type: 'file',
              fileKey,
              fileName: (content.file_name as string) || 'file.bin',
              mimeType: content.mime_type as string | undefined,
            },
          },
        ],
      };
    }
    case 'post': {
      return convertPostContent(content);
    }
    default: {
      return {
        segments: [
          {
            type: 'text',
            text: `[${messageType}] ${rawContent || JSON.stringify(content)}`,
          },
        ],
      };
    }
  }
}

function convertPostContent(
  content: Record<string, unknown>
): FeishuConvertedContent {
  const post = unwrapPostBody(content);
  if (!post) return { segments: [] };

  const segments: FeishuSegment[] = [];
  if (typeof post.title === 'string' && post.title.trim()) {
    segments.push({ type: 'text', text: `### ${post.title.trim()}` });
  }

  const paragraphs = Array.isArray(post.content) ? post.content : [];
  for (const paragraph of paragraphs) {
    if (!Array.isArray(paragraph)) continue;
    let paragraphText = '';

    for (const rawElement of paragraph) {
      if (!rawElement || typeof rawElement !== 'object') continue;
      const element = rawElement as Record<string, unknown>;
      const tag = String(element.tag || '');

      switch (tag) {
        case 'text':
        case 'md': {
          let text = String(element.text || '');
          const style = Array.isArray(element.style) ? element.style : [];
          if (style.includes('bold')) text = `**${text}**`;
          if (style.includes('italic')) text = `*${text}*`;
          if (style.includes('lineThrough')) text = `~~${text}~~`;
          if (style.includes('codeInline')) text = `\`${text}\``;
          paragraphText += text;
          break;
        }
        case 'a': {
          const label = String(element.text || element.href || '');
          const href = String(element.href || '');
          paragraphText += href ? `[${label}](${href})` : label;
          break;
        }
        case 'at': {
          paragraphText += String(element.user_name || element.text || '');
          break;
        }
        case 'img':
        case 'image': {
          const imageKey = element.image_key as string | undefined;
          if (imageKey) {
            if (paragraphText.trim()) {
              segments.push({ type: 'text', text: paragraphText.trim() });
              paragraphText = '';
            }
            segments.push({
              type: 'resource',
              resource: {
                type: 'image',
                fileKey: imageKey,
                fileName: (element.file_name as string) || 'image.png',
              },
            });
          }
          break;
        }
        case 'media':
        case 'file': {
          const fileKey = element.file_key as string | undefined;
          if (fileKey) {
            if (paragraphText.trim()) {
              segments.push({ type: 'text', text: paragraphText.trim() });
              paragraphText = '';
            }
            segments.push({
              type: 'resource',
              resource: {
                type: 'file',
                fileKey,
                fileName: (element.file_name as string) || 'file.bin',
                mimeType: element.mime_type as string | undefined,
              },
            });
          }
          break;
        }
        case 'code_block': {
          const lang = String(element.language || '');
          paragraphText += `\n\`\`\`${lang}\n${element.text || ''}\n\`\`\`\n`;
          break;
        }
        case 'hr': {
          paragraphText += '\n---\n';
          break;
        }
        default: {
          paragraphText += String(element.text || '');
          break;
        }
      }
    }

    if (paragraphText.trim()) {
      segments.push({ type: 'text', text: paragraphText.trim() });
    }
  }

  return { segments };
}

function unwrapPostBody(
  content: Record<string, unknown>
): { title?: string; content?: unknown[] } | null {
  if (
    content &&
    typeof content === 'object' &&
    ('title' in content || 'content' in content)
  ) {
    return content as { title?: string; content?: unknown[] };
  }
  const post = content.post as Record<string, unknown> | undefined;
  if (post && typeof post === 'object') {
    return unwrapPostBody(post);
  }
  const locales = ['zh_cn', 'en_us', 'ja_jp'];
  for (const loc of locales) {
    const locObj = content[loc];
    if (locObj && typeof locObj === 'object') {
      return locObj as { title?: string; content?: unknown[] };
    }
  }
  return null;
}
