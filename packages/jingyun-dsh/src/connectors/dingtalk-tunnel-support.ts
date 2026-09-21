import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { getDshHome } from '../common/paths';
import type { DingtalkMediaFile } from './dingtalk-tunnel-types';

const DINGTALK_API = 'https://api.dingtalk.com';

interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

const tokenCacheMap = new Map<string, TokenCacheEntry>();
const inflightTokenMap = new Map<string, Promise<string>>();

export function getMediaCacheDir(): string {
  return path.join(getDshHome(), 'connectors', 'dingtalk-tunnel', 'media');
}

/**
 * 获取钉钉开放平台新版 AccessToken（v1.0/oauth2/accessToken）
 */
export async function getAccessToken(
  appKey: string,
  appSecret: string
): Promise<string> {
  const cached = tokenCacheMap.get(appKey);
  if (cached && Date.now() < cached.expiresAt - 60 * 1000) {
    return cached.token;
  }

  const inflight = inflightTokenMap.get(appKey);
  if (inflight) {
    return inflight;
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetch(`${DINGTALK_API}/v1.0/oauth2/accessToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appKey, appSecret }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(
          `获取钉钉 AccessToken 失败 (${response.status}): ${errText || response.statusText}`
        );
      }

      const data = (await response.json()) as {
        accessToken?: string;
        expireIn?: number;
      };
      if (!data.accessToken) {
        throw new Error('获取钉钉 AccessToken 失败: 返回数据中无 accessToken');
      }

      const expiresIn = data.expireIn ?? 7200;
      tokenCacheMap.set(appKey, {
        token: data.accessToken,
        expiresAt: Date.now() + expiresIn * 1000,
      });

      return data.accessToken;
    } finally {
      inflightTokenMap.delete(appKey);
    }
  })();

  inflightTokenMap.set(appKey, fetchPromise);
  return fetchPromise;
}

export function clearTokenCache(appKey?: string): void {
  if (appKey) {
    tokenCacheMap.delete(appKey);
    inflightTokenMap.delete(appKey);
  } else {
    tokenCacheMap.clear();
    inflightTokenMap.clear();
  }
}

/**
 * 凭 downloadCode 下载钉钉机器人收到的图片或附件并缓存在本地
 */
export async function downloadMediaByCode(
  downloadCode: string,
  robotCode: string,
  appKey: string,
  appSecret: string,
  suggestedType: 'image' | 'file' | 'audio' | 'video' = 'image'
): Promise<DingtalkMediaFile> {
  const token = await getAccessToken(appKey, appSecret);
  const resp = await fetch(`${DINGTALK_API}/v1.0/robot/messageFiles/download`, {
    method: 'POST',
    headers: {
      'x-acs-dingtalk-access-token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      downloadCode,
      robotCode,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(
      `downloadCode 换取下载地址失败 (HTTP ${resp.status}): ${errText || resp.statusText}`
    );
  }

  const result = (await resp.json()) as { downloadUrl?: string };
  if (!result.downloadUrl) {
    throw new Error('钉钉媒体下载接口响应中缺少 downloadUrl 字段');
  }

  const fileResp = await fetch(result.downloadUrl, {
    signal: AbortSignal.timeout(30000),
  });
  if (!fileResp.ok) {
    throw new Error(
      `媒体文件下载失败: HTTP ${fileResp.status} ${fileResp.statusText}`
    );
  }

  const buffer = Buffer.from(await fileResp.arrayBuffer());
  const mediaDir = getMediaCacheDir();
  await fs.mkdir(mediaDir, { recursive: true });

  const contentType = fileResp.headers.get('content-type') || '';
  const extMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'audio/amr': '.amr',
    'audio/mpeg': '.mp3',
  };
  const ext =
    extMap[contentType] || (suggestedType === 'image' ? '.jpg' : '.bin');
  const hashName = crypto.createHash('md5').update(buffer).digest('hex');
  const fileName = `${hashName}${ext}`;
  const localPath = path.join(mediaDir, fileName);

  await fs.writeFile(localPath, buffer);
  return {
    type: suggestedType,
    localPath,
    fileName,
  };
}

/**
 * 通过 sessionWebhook 发送 Markdown 格式回复
 */
export async function sendDingtalkMarkdown(
  sessionWebhook: string,
  title: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(sessionWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          title: title || '智能助理回复',
          text,
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        error: `Session webhook 回复失败 (${response.status}): ${errText || response.statusText}`,
      };
    }

    const data = (await response.json()) as {
      errcode?: number;
      errmsg?: string;
    };
    if (typeof data.errcode === 'number' && data.errcode !== 0) {
      return {
        success: false,
        error: `Session webhook 返回错误 (${data.errcode}): ${data.errmsg || '未知错误'}`,
      };
    }

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * 通过 OpenAPI 向持久会话推送 Markdown 消息（用于服务重启后或 sessionWebhook 超时后直接触达目标会话）
 */
export async function sendDingtalkOpenApiMessage(params: {
  appKey: string;
  appSecret: string;
  robotCode?: string;
  targetChatId: string;
  targetChatType: 'p2p' | 'group';
  targetSenderId?: string;
  title: string;
  text: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const {
      appKey,
      appSecret,
      robotCode = appKey,
      targetChatId,
      targetChatType,
      targetSenderId,
      title,
      text,
    } = params;
    const token = await getAccessToken(appKey, appSecret);

    if (targetChatType === 'group') {
      const resp = await fetch(
        `${DINGTALK_API}/v1.0/robot/groupMessages/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-acs-dingtalk-access-token': token,
          },
          body: JSON.stringify({
            robotCode,
            openConversationId: targetChatId,
            msgKey: 'sampleMarkdown',
            msgParam: JSON.stringify({
              title: title || '智能助理通知',
              text,
            }),
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!resp.ok) {
        const errText = await resp.text();
        return {
          success: false,
          error: `钉钉 OpenAPI 群消息推送失败 (HTTP ${resp.status}): ${errText || resp.statusText}`,
        };
      }

      const data = (await resp.json()) as { processQueryKey?: string };
      return { success: true, messageId: data.processQueryKey };
    }

    // 单聊（P2P）：钉钉企业内部机器人单聊官方标准接口为 /v1.0/robot/oToMessages/batchSend
    const userId = targetSenderId || targetChatId;
    const resp = await fetch(
      `${DINGTALK_API}/v1.0/robot/oToMessages/batchSend`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-acs-dingtalk-access-token': token,
        },
        body: JSON.stringify({
          robotCode,
          userIds: [userId],
          msgKey: 'sampleMarkdown',
          msgParam: JSON.stringify({
            title: title || '智能助理通知',
            text,
          }),
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      return {
        success: false,
        error: `钉钉 OpenAPI 单聊消息推送失败 (HTTP ${resp.status}): ${errText || resp.statusText}`,
      };
    }

    const data = (await resp.json()) as { processQueryKey?: string };
    return { success: true, messageId: data.processQueryKey };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
