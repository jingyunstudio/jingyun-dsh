import type { Context } from '@deepseek-ai/cordis';

import {
  defineRoute,
  HttpError,
  parseJsonBody,
  sendJson,
} from '../common/http';
import {
  cliManager,
  dingtalkConnector,
  dingtalkTunnelService,
  feishuService,
  imaConnector,
  jingyunTunnelService,
  larkConnector,
  mobileService,
  wecomService,
  weixinConnector,
} from '../connectors';

function parseFeishuConfigBody(body: Record<string, unknown> | null) {
  const appId = typeof body?.appId === 'string' ? body.appId.trim() : '';
  const appSecret =
    typeof body?.appSecret === 'string' ? body.appSecret.trim() : '';
  if (!appId || !appSecret) return null;
  return {
    appId,
    appSecret,
    encryptKey:
      typeof body?.encryptKey === 'string' ? body.encryptKey.trim() : undefined,
    verificationToken:
      typeof body?.verificationToken === 'string'
        ? body.verificationToken.trim()
        : undefined,
    domain: (body?.domain === 'lark' ? 'lark' : 'feishu') as 'lark' | 'feishu',
    customHost:
      typeof body?.customHost === 'string' ? body.customHost.trim() : undefined,
    requireMention: body?.requireMention !== false,
  };
}

export function registerConnectorsRoutes(ctx: Context) {
  // ================= CLI 工具管理 =================
  defineRoute(ctx, '/api/jingyun/connectors/cli/status', () =>
    cliManager.getAllStatus()
  );

  defineRoute(
    ctx,
    '/api/jingyun/connectors/cli/install',
    async (req) => {
      const body = await parseJsonBody<{
        name?: 'wecom' | 'lark' | 'dingtalk';
      }>(req);
      if (
        !body?.name ||
        (body.name !== 'wecom' &&
          body.name !== 'lark' &&
          body.name !== 'dingtalk')
      ) {
        throw new HttpError('name 参数必须为 wecom, lark 或 dingtalk', 400);
      }
      return cliManager.installCli(body.name);
    },
    { rawResult: true }
  );

  // ================= 飞书 CLI 连接器 (Lark CLI) =================
  const larkPrefix = '/api/jingyun/connectors/lark';
  defineRoute(ctx, `${larkPrefix}/status`, () => larkConnector.getStatus());
  defineRoute(ctx, `${larkPrefix}/auth-start`, () => larkConnector.startAuth());
  defineRoute(ctx, `${larkPrefix}/auth-logout`, () => larkConnector.logout());
  defineRoute(
    ctx,
    `${larkPrefix}/auth-poll`,
    async (req) => {
      const { device_code: deviceCode } = await parseJsonBody<{
        device_code?: string;
      }>(req);
      if (!deviceCode) {
        throw new HttpError('缺少 device_code 参数', 400);
      }
      return larkConnector.pollAuth(deviceCode);
    },
    { rawResult: true, errorStatus: 400 }
  );

  // ================= 企微连接器 (WeCom) =================
  const wecomPrefix = '/api/jingyun/connectors/wecom';
  defineRoute(ctx, `${wecomPrefix}/qr-start`, () => wecomService.getQrCode());
  defineRoute(
    ctx,
    `${wecomPrefix}/qr-poll`,
    async (req, res) => {
      const parsedUrl = new URL(req.url || '', 'http://127.0.0.1');
      const scode = parsedUrl.searchParams.get('scode') || '';
      if (!scode) {
        throw new HttpError('缺少 scode 参数', 400);
      }
      try {
        return await wecomService.queryQrResult(scode);
      } catch (err: unknown) {
        sendJson(res, {
          success: false,
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        });
        return undefined;
      }
    },
    { rawResult: true }
  );

  defineRoute(ctx, `${wecomPrefix}/status`, () => wecomService.getStatus());
  defineRoute(ctx, `${wecomPrefix}/config`, async (req) => {
    const body = (await parseJsonBody(req)) as Record<string, unknown>;
    await wecomService.saveConfig(body as any);
    return { message: 'Configuration saved' };
  });
  defineRoute(ctx, `${wecomPrefix}/clear`, async () => {
    await wecomService.clearConfig();
    return { message: 'Configuration cleared' };
  });
  defineRoute(ctx, `${wecomPrefix}/connect`, async (req) => {
    const body = (await parseJsonBody(req).catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const botId = typeof body?.botId === 'string' ? body.botId : undefined;
    const botSecret =
      typeof body?.botSecret === 'string' ? body.botSecret : undefined;
    await wecomService.connect(
      botId && botSecret ? { botId, botSecret } : undefined
    );
    return { message: 'Connection initiated' };
  });
  defineRoute(ctx, `${wecomPrefix}/send`, async (req) => {
    const body = (await parseJsonBody(req)) as Record<string, unknown>;
    const content = typeof body?.content === 'string' ? body.content : '';
    if (!content.trim()) {
      throw new HttpError('Message content is required', 400);
    }
    const chatId =
      typeof body?.chatId === 'string' && body.chatId.trim()
        ? body.chatId.trim()
        : undefined;
    const chatType = body?.chatType === 'group' ? 'group' : 'single';
    return wecomService.sendMessage({ chatId, chatType, content });
  });
  defineRoute(ctx, `${wecomPrefix}/cli`, async (req) => {
    const body = (await parseJsonBody(req)) as Record<string, unknown>;
    const args = Array.isArray(body?.args)
      ? (body.args as unknown[]).map(String)
      : [];
    if (args.length === 0) {
      throw new HttpError('args array is required', 400);
    }
    return wecomService.executeCli(args);
  });

  // ================= 飞书远程通道 (Feishu Remote Channel) =================
  const feishuPrefix = '/api/jingyun/connectors/feishu';
  defineRoute(ctx, `${feishuPrefix}/status`, () => feishuService.getStatus());
  defineRoute(ctx, `${feishuPrefix}/config`, async (req) => {
    const body = (await parseJsonBody(req)) as Record<string, unknown>;
    const cfg = parseFeishuConfigBody(body);
    if (!cfg) {
      throw new HttpError('appId and appSecret are required', 400);
    }
    await feishuService.saveConfig(cfg);
    return { message: 'Feishu configuration saved' };
  });
  defineRoute(ctx, `${feishuPrefix}/clear`, async () => {
    await feishuService.clearConfig();
    return { message: 'Feishu configuration cleared' };
  });
  defineRoute(ctx, `${feishuPrefix}/connect`, async (req) => {
    const body = (await parseJsonBody(req).catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const cfg = parseFeishuConfigBody(body);
    await feishuService.connect(cfg ?? undefined);
    return { message: 'Feishu connection established' };
  });
  defineRoute(ctx, `${feishuPrefix}/disconnect`, () => {
    feishuService.disconnect();
    return { message: 'Feishu connection disconnected' };
  });
  defineRoute(ctx, `${feishuPrefix}/send`, async (req) => {
    const body = (await parseJsonBody(req)) as Record<string, unknown>;
    const content = typeof body?.content === 'string' ? body.content : '';
    if (!content.trim()) {
      throw new HttpError('content is required', 400);
    }
    const chatId =
      typeof body?.chatId === 'string' && body.chatId.trim()
        ? body.chatId.trim()
        : undefined;
    return feishuService.sendMessage({
      chatId,
      content,
      replyToMessageId:
        typeof body?.replyToMessageId === 'string'
          ? body.replyToMessageId.trim()
          : undefined,
    });
  });

  // ================= 钉钉 CLI 连接器 (DingTalk CLI) =================
  dingtalkConnector.init().catch((err: unknown) => {
    console.warn('[DingtalkConnector] Failed to initialize:', err);
  });

  const dingtalkPrefix = '/api/jingyun/connectors/dingtalk';
  defineRoute(ctx, `${dingtalkPrefix}/status`, () =>
    dingtalkConnector.getCombinedStatus()
  );
  defineRoute(ctx, `${dingtalkPrefix}/auth-start`, () =>
    dingtalkConnector.startCliAuth()
  );
  defineRoute(
    ctx,
    `${dingtalkPrefix}/auth-poll`,
    async () => {
      const cliAuth = await dingtalkConnector.getCliAuthStatus();
      return {
        success: Boolean(cliAuth.authenticated),
        data: cliAuth,
        authenticated: Boolean(cliAuth.authenticated),
      };
    },
    { rawResult: true }
  );
  defineRoute(ctx, `${dingtalkPrefix}/auth-cancel`, () => {
    dingtalkConnector.cancelCliAuth();
    return { message: 'Cancelled' };
  });
  defineRoute(ctx, `${dingtalkPrefix}/auth-logout`, async () => {
    await dingtalkConnector.logoutCli();
    return { message: 'Logged out' };
  });
  defineRoute(ctx, `${dingtalkPrefix}/disconnect`, async () => {
    await dingtalkConnector.clearConfig();
    return { message: 'Disconnected and cleared' };
  });
  defineRoute(ctx, `${dingtalkPrefix}/clear`, async () => {
    await dingtalkConnector.clearConfig();
    return { message: 'Configuration cleared' };
  });
  defineRoute(ctx, `${dingtalkPrefix}/config`, () =>
    dingtalkConnector.loadConfig()
  );
  defineRoute(ctx, `${dingtalkPrefix}/config/save`, async (req) => {
    const body = (req as any).body || {};
    await dingtalkConnector.saveConfig(body);
    return { message: 'Config saved' };
  });

  // ================= 钉钉远程通道 (DingTalk Stream Tunnel) =================
  const dingtalkTunnelPrefix = '/api/jingyun/connectors/dingtalk-tunnel';
  defineRoute(ctx, `${dingtalkTunnelPrefix}/status`, () =>
    dingtalkTunnelService.getStatus()
  );
  defineRoute(ctx, `${dingtalkTunnelPrefix}/connect`, async (req) => {
    const body = (await parseJsonBody(req)) as Record<string, unknown>;
    const appKey =
      typeof body?.appKey === 'string' ? body.appKey.trim() : undefined;
    const appSecret =
      typeof body?.appSecret === 'string' ? body.appSecret.trim() : undefined;

    if (appKey && appSecret) {
      await dingtalkTunnelService.connect({
        appKey,
        appSecret,
        robotCode:
          typeof body?.robotCode === 'string' && body.robotCode.trim()
            ? body.robotCode.trim()
            : appKey,
        requireMention: body?.requireMention !== false,
      });
    } else {
      await dingtalkTunnelService.connect();
    }
    return { message: 'Dingtalk stream connection established' };
  });
  defineRoute(ctx, `${dingtalkTunnelPrefix}/disconnect`, () => {
    dingtalkTunnelService.disconnect();
    return { message: 'Dingtalk stream connection disconnected' };
  });
  defineRoute(ctx, `${dingtalkTunnelPrefix}/clear`, async () => {
    await dingtalkTunnelService.clearConfig();
    return { message: 'Dingtalk tunnel configuration cleared' };
  });
  defineRoute(ctx, `${dingtalkTunnelPrefix}/send`, async (req) => {
    const body = (await parseJsonBody(req)) as Record<string, unknown>;
    const content =
      typeof body?.content === 'string' ? body.content.trim() : '';
    if (!content) {
      throw new HttpError('content is required', 400);
    }
    const title =
      typeof body?.title === 'string' ? body.title.trim() : undefined;
    return dingtalkTunnelService.sendMessage({ content, title });
  });

  // ================= ima 知识库连接器 =================
  const imaPrefix = '/api/jingyun/connectors/ima';
  defineRoute(ctx, `${imaPrefix}/status`, () => imaConnector.getStatus());
  defineRoute(
    ctx,
    `${imaPrefix}/connect`,
    async (req) => {
      const body = await parseJsonBody<{
        apiKey: string;
        clientId?: string;
        apiBase?: string;
        defaultKbId?: string;
        nickname?: string;
      }>(req);
      return imaConnector.connect(body || { apiKey: '' });
    },
    { errorStatus: 400 }
  );
  defineRoute(ctx, `${imaPrefix}/disconnect`, async () => {
    await imaConnector.disconnect();
    return { status: 'disconnected' };
  });
  defineRoute(ctx, `${imaPrefix}/config`, () => imaConnector.loadConfig());

  // ================= 微信助理连接器 (Weixin) =================
  const weixinPrefix = '/api/jingyun/connectors/weixin';
  defineRoute(ctx, `${weixinPrefix}/status`, () => weixinConnector.getStatus());
  defineRoute(ctx, `${weixinPrefix}/qr-start`, () =>
    weixinConnector.getQrCode()
  );
  defineRoute(ctx, `${weixinPrefix}/qr-poll`, async (req) => {
    const url = new URL(req.url || '', 'http://localhost');
    const qrcode = url.searchParams.get('qrcode') || '';
    if (!qrcode) {
      throw new HttpError('缺少 qrcode 参数', 400);
    }
    return weixinConnector.pollQrStatus(qrcode);
  });
  defineRoute(ctx, `${weixinPrefix}/disconnect`, async (req) => {
    let clearCredentials = false;
    if (req.method === 'POST') {
      const body = await parseJsonBody<{ clearCredentials?: boolean }>(req);
      clearCredentials = !!body?.clearCredentials;
    }
    await weixinConnector.disconnect(clearCredentials);
    return { status: 'disconnected', clearCredentials };
  });
  defineRoute(
    ctx,
    `${weixinPrefix}/config/save`,
    async (req) => {
      const body = await parseJsonBody<{
        baseUrl?: string;
        autoReconnect?: boolean;
      }>(req);
      return weixinConnector.saveConfig(body || {});
    },
    { errorStatus: 400 }
  );
  defineRoute(
    ctx,
    `${weixinPrefix}/send-test`,
    async (req) => {
      const body = await parseJsonBody<{
        content?: string;
        toUserId?: string;
      }>(req);
      const content = body?.content || '助理测试消息发送成功！';
      return weixinConnector.sendMessage({
        content,
        toUserId: body?.toUserId,
      });
    },
    { errorStatus: 400 }
  );

  // ================= 移动端 (Android/ADB) 控制器 =================
  const mobilePrefix = '/api/jingyun/connectors/mobile';
  defineRoute(ctx, `${mobilePrefix}/status`, () => mobileService.getStatus());
  defineRoute(
    ctx,
    `${mobilePrefix}/connect`,
    async (req) => {
      const body = await parseJsonBody<{ host: string; port?: number }>(req);
      if (!body.host || typeof body.host !== 'string') {
        throw new HttpError('参数 host 不能为空', 400);
      }
      const port = body.port !== undefined ? Number(body.port) : 5555;
      const result = await mobileService.connectWifi(body.host, port);
      return { success: true, ...result };
    },
    { rawResult: true, errorStatus: 400 }
  );
  defineRoute(
    ctx,
    `${mobilePrefix}/pair`,
    async (req) => {
      const body = await parseJsonBody<{
        host: string;
        port: number;
        code: string;
      }>(req);
      if (!body.host || !body.port || !body.code) {
        throw new HttpError('参数 host、port 和 code 均为必填项', 400);
      }
      const result = await mobileService.pairWifi(
        body.host,
        Number(body.port),
        body.code
      );
      return { success: true, ...result };
    },
    { rawResult: true, errorStatus: 400 }
  );
  defineRoute(
    ctx,
    `${mobilePrefix}/tcpip`,
    async (req) => {
      const body = await parseJsonBody<{
        deviceId?: string;
        port?: number;
      }>(req);
      const port = body.port !== undefined ? Number(body.port) : 5555;
      const result = await mobileService.enableTcpIp(body.deviceId, port);
      return { success: true, ...result };
    },
    { rawResult: true, errorStatus: 400 }
  );
  defineRoute(
    ctx,
    `${mobilePrefix}/disconnect`,
    async (req) => {
      const body = await parseJsonBody<{ target: string }>(req);
      if (!body.target) {
        throw new HttpError('参数 target 不能为空', 400);
      }
      const result = await mobileService.disconnect(body.target);
      return { success: true, ...result };
    },
    { rawResult: true, errorStatus: 400 }
  );
  defineRoute(
    ctx,
    `${mobilePrefix}/screenshot`,
    async (req, res) => {
      const url = new URL(req.url!, 'http://localhost');
      const deviceId = url.searchParams.get('deviceId') || undefined;
      const buf = await mobileService.screenshot(deviceId);
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': buf.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
      res.end(buf);
    },
    { kind: 'prefix' }
  );

  // ================= Jingyun 云端工作台反向隧道 =================
  const jyTunnelPrefix = '/api/jingyun/connectors/jingyun-tunnel';
  defineRoute(
    ctx,
    `${jyTunnelPrefix}/status`,
    () => jingyunTunnelService.getStatus(),
    { rawResult: true }
  );
  defineRoute(
    ctx,
    `${jyTunnelPrefix}/connect`,
    async (req) => {
      const body = await parseJsonBody<{
        userToken?: string;
        cloudUrl?: string;
        deviceName?: string;
      }>(req);
      const res = await jingyunTunnelService.connect({
        userToken: body?.userToken,
        cloudUrl: body?.cloudUrl,
        deviceName: body?.deviceName,
      });
      return { success: true, ...res };
    },
    { rawResult: true, errorStatus: 400 }
  );
  defineRoute(
    ctx,
    `${jyTunnelPrefix}/disconnect`,
    () => {
      const res = jingyunTunnelService.disconnect();
      return { success: true, ...res };
    },
    { rawResult: true }
  );
}
