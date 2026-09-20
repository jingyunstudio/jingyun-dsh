import type { IncomingMessage, ServerResponse } from 'http';

import type { Context } from '@deepseek-ai/cordis';

import { parseJsonBody, sendError, sendJson } from '../common/http';
import {
  cliManager,
  dingtalkConnector,
  imaConnector,
  larkConnector,
  wecomService,
  weixinConnector,
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

  // 企微路由（单一标准路径 /api/jingyun/connectors/wecom/*）
  const wecomPrefix = '/api/jingyun/connectors/wecom';

  // 扫码授权发起
  ctx.webServer.register({
    kind: 'exact',
    path: `${wecomPrefix}/qr-start`,
    handler: async (_req, res) => {
      try {
        const data = await wecomService.getQrCode();
        sendJson(res, { success: true, data });
      } catch (err: unknown) {
        sendError(
          res,
          err instanceof Error ? err.message : 'QR start failed',
          500
        );
      }
    },
  });

  // 扫码授权结果轮询
  ctx.webServer.register({
    kind: 'exact',
    path: `${wecomPrefix}/qr-poll`,
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const parsedUrl = new URL(req.url || '', 'http://127.0.0.1');
        const scode = parsedUrl.searchParams.get('scode') || '';
        if (!scode) {
          sendError(res, '缺少 scode 参数', 400);
          return;
        }
        const result = await wecomService.queryQrResult(scode);
        sendJson(res, result);
      } catch (err: unknown) {
        sendJson(res, {
          success: false,
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  });

  // 企微连接器状态
  ctx.webServer.register({
    kind: 'exact',
    path: `${wecomPrefix}/status`,
    handler: async (_req, res) => {
      try {
        const state = wecomService.getStatus();
        sendJson(res, { success: true, data: state });
      } catch (err: unknown) {
        sendError(
          res,
          err instanceof Error ? err.message : 'Get status failed',
          500
        );
      }
    },
  });

  // 保存配置
  ctx.webServer.register({
    kind: 'exact',
    path: `${wecomPrefix}/config`,
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const body = (await parseJsonBody(req)) as Record<string, unknown>;
        await wecomService.saveConfig(body as any);
        sendJson(res, {
          success: true,
          data: { message: 'Configuration saved' },
        });
      } catch (err: unknown) {
        sendError(
          res,
          err instanceof Error ? err.message : 'Save config failed',
          500
        );
      }
    },
  });

  // 清除配置（解绑）
  ctx.webServer.register({
    kind: 'exact',
    path: `${wecomPrefix}/clear`,
    handler: async (_req, res) => {
      try {
        await wecomService.clearConfig();
        sendJson(res, {
          success: true,
          data: { message: 'Configuration cleared' },
        });
      } catch (err: unknown) {
        sendError(
          res,
          err instanceof Error ? err.message : 'Clear failed',
          500
        );
      }
    },
  });

  // 手动连接 / 重连
  ctx.webServer.register({
    kind: 'exact',
    path: `${wecomPrefix}/connect`,
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const body = (await parseJsonBody(req).catch(() => ({}))) as Record<
          string,
          unknown
        >;
        const botId = typeof body?.botId === 'string' ? body.botId : undefined;
        const botSecret =
          typeof body?.botSecret === 'string' ? body.botSecret : undefined;
        if (botId && botSecret) {
          await wecomService.connect({ botId, botSecret });
        } else {
          await wecomService.connect();
        }
        sendJson(res, {
          success: true,
          data: { message: 'Connection initiated' },
        });
      } catch (err: unknown) {
        sendError(
          res,
          err instanceof Error ? err.message : 'Connect failed',
          500
        );
      }
    },
  });

  // 发送消息
  ctx.webServer.register({
    kind: 'exact',
    path: `${wecomPrefix}/send`,
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const body = (await parseJsonBody(req)) as Record<string, unknown>;
        const content = typeof body?.content === 'string' ? body.content : '';
        if (!content || !content.trim()) {
          sendError(res, 'Message content is required', 400);
          return;
        }
        const chatId =
          typeof body?.chatId === 'string' && body.chatId.trim()
            ? body.chatId.trim()
            : undefined;
        const chatType = body?.chatType === 'group' ? 'group' : 'single';
        const result = await wecomService.sendMessage({
          chatId,
          chatType,
          content,
        });
        sendJson(res, { success: true, data: result });
      } catch (err: unknown) {
        sendError(
          res,
          err instanceof Error ? err.message : 'Failed to send message',
          500
        );
      }
    },
  });

  // 通用 CLI 指令代理执行（带 853004 Token 自愈）
  ctx.webServer.register({
    kind: 'exact',
    path: `${wecomPrefix}/cli`,
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const body = (await parseJsonBody(req)) as Record<string, unknown>;
        const args = Array.isArray(body?.args)
          ? (body.args as unknown[]).map(String)
          : [];
        if (args.length === 0) {
          sendError(res, 'args array is required', 400);
          return;
        }
        const output = await wecomService.executeCli(args);
        sendJson(res, { success: true, data: output });
      } catch (err: unknown) {
        sendError(
          res,
          err instanceof Error ? err.message : 'CLI execution failed',
          500
        );
      }
    },
  });

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

  // ===================== ima 知识库连接器 =====================
  // 获取 ima 连接状态
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/ima/status',
    handler: async (_req, res) => {
      try {
        const result = await imaConnector.getStatus();
        sendJson(res, { success: true, data: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendError(res, message, 500);
      }
    },
  });

  // 连接 / 绑定 ima
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/ima/connect',
    handler: async (req, res) => {
      try {
        const body = await parseJsonBody<{
          apiKey: string;
          clientId?: string;
          apiBase?: string;
          defaultKbId?: string;
          nickname?: string;
        }>(req);
        const result = await imaConnector.connect(body || { apiKey: '' });
        sendJson(res, { success: true, data: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendError(res, message, 400);
      }
    },
  });

  // 解绑 ima
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/ima/disconnect',
    handler: async (_req, res) => {
      try {
        await imaConnector.disconnect();
        sendJson(res, { success: true, data: { status: 'disconnected' } });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendError(res, message, 500);
      }
    },
  });

  // 获取 ima 配置详情
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/ima/config',
    handler: async (_req, res) => {
      try {
        const cfg = await imaConnector.loadConfig();
        sendJson(res, { success: true, data: cfg });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendError(res, message, 500);
      }
    },
  });

  // 获取微信助理连接状态
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/weixin/status',
    handler: async (_req, res) => {
      try {
        const status = weixinConnector.getStatus();
        sendJson(res, { success: true, data: status });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendError(res, message, 500);
      }
    },
  });

  // 获取微信助理登录二维码
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/weixin/qr-start',
    handler: async (_req, res) => {
      try {
        const result = await weixinConnector.getQrCode();
        sendJson(res, { success: true, data: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendError(res, message, 500);
      }
    },
  });

  // 轮询微信助理登录二维码状态
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/weixin/qr-poll',
    handler: async (req, res) => {
      try {
        const url = new URL(req.url || '', 'http://localhost');
        const qrcode = url.searchParams.get('qrcode') || '';
        if (!qrcode) {
          sendError(res, '缺少 qrcode 参数', 400);
          return;
        }
        const result = await weixinConnector.pollQrStatus(qrcode);
        sendJson(res, { success: true, data: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendError(res, message, 500);
      }
    },
  });

  // 断开微信助理连接
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/weixin/disconnect',
    handler: async (req, res) => {
      try {
        let clearCredentials = false;
        if (req.method === 'POST') {
          const body = await parseJsonBody<{ clearCredentials?: boolean }>(req);
          clearCredentials = !!body?.clearCredentials;
        }
        await weixinConnector.disconnect(clearCredentials);
        sendJson(res, {
          success: true,
          data: { status: 'disconnected', clearCredentials },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendError(res, message, 500);
      }
    },
  });

  // 保存微信助理配置
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/weixin/config/save',
    handler: async (req, res) => {
      try {
        const body = await parseJsonBody<{
          baseUrl?: string;
          autoReconnect?: boolean;
        }>(req);
        const saved = await weixinConnector.saveConfig(body || {});
        sendJson(res, { success: true, data: saved });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendError(res, message, 400);
      }
    },
  });

  // 发送微信测试消息
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/weixin/send-test',
    handler: async (req, res) => {
      try {
        const body = await parseJsonBody<{
          content?: string;
          toUserId?: string;
        }>(req);
        const content = body?.content || '助理测试消息发送成功！';
        const result = await weixinConnector.sendMessage({
          content,
          toUserId: body?.toUserId,
        });
        sendJson(res, { success: true, data: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendError(res, message, 400);
      }
    },
  });
}
