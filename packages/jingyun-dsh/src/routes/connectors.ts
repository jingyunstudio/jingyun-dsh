import type { IncomingMessage, ServerResponse } from 'http';

import type { Context } from '@deepseek-ai/cordis';

import { parseJsonBody, sendError, sendJson } from '../common/http';
import {
  cliManager,
  dingtalkConnector,
  larkConnector,
  type WecomConfig,
  wecomConnector,
} from '../connectors';

export function registerConnectorsRoutes(ctx: Context) {
  // 0.1 获取所有 CLI 工具状态
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/cli/status',
    handler: async (_req, res) => {
      try {
        const result = await cliManager.getAllStatus();
        sendJson(res, { success: true, data: result });
      } catch (err: any) {
        sendError(res, err.message, 500);
      }
    },
  });

  // 0.2 一键安装 CLI 工具
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/cli/install',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const body = await parseJsonBody<{
          name?: 'wecom' | 'lark' | 'dingtalk';
        }>(req);
        if (
          !body?.name ||
          (body.name !== 'wecom' &&
            body.name !== 'lark' &&
            body.name !== 'dingtalk')
        ) {
          return sendError(res, 'name 参数必须为 wecom, lark 或 dingtalk', 400);
        }
        const result = await cliManager.installCli(body.name);
        sendJson(res, result);
      } catch (err: any) {
        sendError(res, err.message, 500);
      }
    },
  });
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

    // 断开连接（解绑，清除全部配置）
    ctx.webServer.register({
      kind: 'exact',
      path: `${prefix}/disconnect`,
      handler: async (_req, res) => {
        try {
          await wecomConnector.clearConfig();
          sendJson(res, {
            success: true,
            data: { message: 'Disconnected and cleared' },
          });
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
  }

  // 初始化钉钉连接器服务
  dingtalkConnector.init().catch((err: any) => {
    console.warn('[DingtalkConnector] Failed to initialize:', err);
  });

  // 钉钉路由（标准路径 /api/jingyun/connectors/dingtalk/*）
  const prefix = '/api/jingyun/connectors/dingtalk';

  // 钉钉连接器状态
  ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}/status`,
    handler: async (_req, res) => {
      try {
        const status = await dingtalkConnector.getCombinedStatus();
        sendJson(res, { success: true, data: status });
      } catch (err: any) {
        sendError(res, err.message, 500);
      }
    },
  });

  // 启动钉钉 CLI OAuth2 网页/扫码授权流程
  ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}/auth-start`,
    handler: async (_req, res) => {
      try {
        const data = await dingtalkConnector.startCliAuth();
        sendJson(res, { success: true, data });
      } catch (err: any) {
        sendError(res, err.message, 500);
      }
    },
  });

  // 轮询钉钉 CLI 授权状态
  ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}/auth-poll`,
    handler: async (_req, res) => {
      try {
        const cliAuth = await dingtalkConnector.getCliAuthStatus();
        sendJson(res, {
          success: Boolean(cliAuth.authenticated),
          data: cliAuth,
          authenticated: Boolean(cliAuth.authenticated),
        });
      } catch (err: any) {
        sendError(res, err.message, 500);
      }
    },
  });

  // 取消钉钉 CLI 登录流程
  ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}/auth-cancel`,
    handler: async (_req, res) => {
      try {
        dingtalkConnector.cancelCliAuth();
        sendJson(res, { success: true, data: { message: 'Cancelled' } });
      } catch (err: any) {
        sendError(res, err.message, 500);
      }
    },
  });

  // 退出钉钉 CLI 登录
  ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}/auth-logout`,
    handler: async (_req, res) => {
      try {
        await dingtalkConnector.logoutCli();
        sendJson(res, { success: true, data: { message: 'Logged out' } });
      } catch (err: any) {
        sendError(res, err.message, 500);
      }
    },
  });

  // 断开连接 / 清除配置
  ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}/disconnect`,
    handler: async (_req, res) => {
      try {
        await dingtalkConnector.clearConfig();
        sendJson(res, {
          success: true,
          data: { message: 'Disconnected and cleared' },
        });
      } catch (err: any) {
        sendError(res, err.message, 500);
      }
    },
  });

  ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}/clear`,
    handler: async (_req, res) => {
      try {
        await dingtalkConnector.clearConfig();
        sendJson(res, {
          success: true,
          data: { message: 'Configuration cleared' },
        });
      } catch (err: any) {
        sendError(res, err.message, 500);
      }
    },
  });

  // 获取钉钉配置
  ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}/config`,
    handler: async (_req, res) => {
      try {
        const cfg = await dingtalkConnector.loadConfig();
        sendJson(res, { success: true, data: cfg });
      } catch (err: any) {
        sendError(res, err.message, 500);
      }
    },
  });

  // 保存钉钉配置
  ctx.webServer.register({
    kind: 'exact',
    path: `${prefix}/config/save`,
    handler: async (req, res) => {
      try {
        const body = (req as any).body || {};
        await dingtalkConnector.saveConfig(body);
        sendJson(res, {
          success: true,
          data: { message: 'Config saved' },
        });
      } catch (err: any) {
        sendError(res, err.message, 500);
      }
    },
  });
}
