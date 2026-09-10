import type { IncomingMessage, ServerResponse } from 'http';

import type { Context } from '@deepseek-ai/cordis';

import { parseJsonBody, sendError, sendJson } from '../common/http';
import { larkConnector, type WecomConfig, wecomConnector } from '../connectors';

export function registerConnectorsRoutes(ctx: Context) {
  // 1. 飞书认证状态
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/lark/status',
    handler: async (_req, res) => {
      try {
        const result = await larkConnector.getStatus();
        sendJson(res, { success: true, data: result });
      } catch (err: any) {
        sendError(res, err.message, 500);
      }
    },
  });

  // 2. 飞书发起认证
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/lark/auth-start',
    handler: async (_req, res) => {
      try {
        const result = await larkConnector.startAuth();
        sendJson(res, { success: true, data: result });
      } catch (err: any) {
        sendError(res, err.message, 500);
      }
    },
  });

  // 3. 飞书退出登录
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/lark/auth-logout',
    handler: async (_req, res) => {
      try {
        const result = await larkConnector.logout();
        sendJson(res, { success: true, data: result });
      } catch (err: any) {
        sendError(res, err.message, 500);
      }
    },
  });

  // 4. 轮询飞书认证结果
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/lark/auth-poll',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const { device_code: deviceCode } = await parseJsonBody<{
          device_code?: string;
        }>(req);
        if (!deviceCode) {
          return sendError(res, '缺少 device_code 参数', 400);
        }
        const result = await larkConnector.pollAuth(deviceCode);
        sendJson(res, result);
      } catch (err: any) {
        sendError(res, err.message, 400);
      }
    },
  });

  // 初始化企业微信连接器服务
  wecomConnector.init().catch((err: any) => {
    console.warn('[WecomConnector] Failed to initialize:', err);
  });

  // 企微路由（支持 /api/jingyun/connectors/wecom/* 与兼容路径 /api/connectors/wecom/*）
  const wecomPrefixes = [
    '/api/jingyun/connectors/wecom',
    '/api/connectors/wecom',
  ];

  for (const prefix of wecomPrefixes) {
    // 扫码授权发起
    ctx.webServer.register({
      kind: 'exact',
      path: `${prefix}/qr-start`,
      handler: async (_req, res) => {
        try {
          const data = await wecomConnector.getQrCode();
          sendJson(res, { success: true, data });
        } catch (err: any) {
          sendError(res, err.message, 500);
        }
      },
    });

    // 扫码授权结果轮询
    ctx.webServer.register({
      kind: 'exact',
      path: `${prefix}/query-result`,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        try {
          const parsedUrl = new URL(req.url || '', 'http://127.0.0.1');
          const scode = parsedUrl.searchParams.get('scode') || '';
          if (!scode) {
            return sendError(res, '缺少 scode 参数', 400);
          }
          const result = await wecomConnector.queryQrResult(scode);
          sendJson(res, result);
        } catch (err: any) {
          sendJson(res, {
            success: false,
            status: 'error',
            error: err.message,
          });
        }
      },
    });

    // 连接器状态
    ctx.webServer.register({
      kind: 'exact',
      path: `${prefix}/status`,
      handler: async (_req, res) => {
        try {
          const status = wecomConnector.getStatus();
          sendJson(res, { success: true, data: status });
        } catch (err: any) {
          sendError(res, err.message, 500);
        }
      },
    });

    // 主动连接
    ctx.webServer.register({
      kind: 'exact',
      path: `${prefix}/connect`,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        try {
          const config = await parseJsonBody<WecomConfig>(req);
          if (!config?.botId || !config?.botSecret) {
            return sendError(res, 'Bot ID and Secret are required', 400);
          }
          await wecomConnector.connect(config);
          sendJson(res, {
            success: true,
            data: { message: 'Connected successfully', status: 'connected' },
          });
        } catch (err: any) {
          sendError(res, err.message, 500);
        }
      },
    });

    // 断开连接
    ctx.webServer.register({
      kind: 'exact',
      path: `${prefix}/disconnect`,
      handler: async (_req, res) => {
        try {
          wecomConnector.disconnect();
          sendJson(res, { success: true, data: { message: 'Disconnected' } });
        } catch (err: any) {
          sendError(res, err.message, 500);
        }
      },
    });

    // 清除配置
    ctx.webServer.register({
      kind: 'exact',
      path: `${prefix}/clear`,
      handler: async (_req, res) => {
        try {
          await wecomConnector.clearConfig();
          sendJson(res, {
            success: true,
            data: { message: 'Configuration cleared' },
          });
        } catch (err: any) {
          sendError(res, err.message, 500);
        }
      },
    });

    // 测试发送
    ctx.webServer.register({
      kind: 'exact',
      path: `${prefix}/test-send`,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        try {
          const body = await parseJsonBody<{
            chatId?: string;
            content?: string;
          }>(req);
          if (!body.chatId || !body.content) {
            return sendError(res, 'chatId 和 content 为必填项', 400);
          }
          await wecomConnector.sendTextMessage(body.chatId, body.content);
          sendJson(res, {
            success: true,
            data: { message: 'Test message sent' },
          });
        } catch (err: any) {
          sendError(res, err.message, 500);
        }
      },
    });
  }
}
