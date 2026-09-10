import type { IncomingMessage, ServerResponse } from 'http';
import https from 'https';

import type { Context } from '@deepseek-ai/cordis';

import { sendError, sendJson } from '../common/http';
import { larkConnector, type WecomConfig, wecomConnector } from '../connectors';

export function registerConnectorsRoutes(ctx: Context) {
  // 1. 飞书认证状态
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/lark/status',
    handler: async (_req, res) => {
      try {
        const result = await larkConnector.getStatus();
        sendJson(res, result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        sendError(res, msg, 500);
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
        sendJson(res, result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        sendError(res, msg, 500);
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
        sendJson(res, result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        sendError(res, msg, 500);
      }
    },
  });

  // 4. 轮询飞书认证结果
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/lark/auth-poll',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      let body = '';
      req.on('data', (chunk: Buffer | string) => {
        body += chunk;
      });
      req.on('end', async () => {
        let payload: { device_code?: string } = {};
        try {
          payload = JSON.parse(body || '{}') as { device_code?: string };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          sendError(res, `JSON 解析失败: ${msg}`, 400);
          return;
        }

        const deviceCode = payload.device_code;
        if (!deviceCode) {
          sendError(res, '缺少 device_code 参数', 400);
          return;
        }

        const result = await larkConnector.pollAuth(deviceCode);
        sendJson(res, result);
      });
    },
  });

  // 初始化企业微信连接器服务
  wecomConnector.init().catch((err: unknown) => {
    console.warn('[WecomConnector] Failed to initialize:', err);
  });

  // 获取企业微信扫码授权信息 (生成官方授权链接与 scode)
  const handleWecomQrStart = async (
    _req: IncomingMessage,
    res: ServerResponse
  ) => {
    try {
      const url = `https://work.weixin.qq.com/ai/qc/gen?source=codebuddy&state=state_${Date.now()}&timestamp=${Date.now()}`;
      https
        .get(url, (remoteRes) => {
          let data = '';
          remoteRes.on('data', (c: Buffer | string) => {
            data += c;
          });
          remoteRes.on('end', () => {
            const match = data.match(/window\.settings\s*=\s*(\{.*?\})/);
            if (match) {
              try {
                const settings = JSON.parse(match[1]) as {
                  scode?: string;
                  auth_url?: string;
                };
                sendJson(res, {
                  success: true,
                  data: {
                    scode: settings.scode,
                    authUrl: settings.auth_url,
                  },
                });
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                sendError(res, `解析官方配置失败: ${msg}`, 500);
              }
            } else {
              sendError(res, '未能从企微获取到授权信息', 500);
            }
          });
        })
        .on('error', (err: Error) => {
          sendError(res, `请求企微网关失败: ${err.message}`, 500);
        });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, msg, 500);
    }
  };

  // 轮询企业微信扫码授权结果
  const handleWecomQueryResult = async (
    req: IncomingMessage,
    res: ServerResponse
  ) => {
    try {
      const parsedUrl = new URL(req.url || '', 'http://127.0.0.1');
      const scode = parsedUrl.searchParams.get('scode') || '';
      if (!scode) {
        sendError(res, '缺少 scode 参数', 400);
        return;
      }

      const queryUrl = `https://work.weixin.qq.com/ai/qc/query_result?scode=${encodeURIComponent(scode)}`;
      https
        .get(queryUrl, (remoteRes) => {
          let data = '';
          remoteRes.on('data', (c: Buffer | string) => {
            data += c;
          });
          remoteRes.on('end', async () => {
            try {
              const result = JSON.parse(data) as {
                data?: {
                  status?: string;
                  bot_info?: {
                    botid?: string;
                    secret?: string;
                    name?: string;
                    [k: string]: unknown;
                  };
                };
              };
              const status = result?.data?.status;
              const botInfo = result?.data?.bot_info;

              if (status === 'success' && botInfo?.botid && botInfo.secret) {
                const botId = botInfo.botid;
                const botSecret = botInfo.secret;
                await wecomConnector.connect({
                  botId,
                  botSecret,
                  gatewayUrl: 'wss://openws.work.weixin.qq.com',
                  autoReconnect: true,
                });
                sendJson(res, {
                  success: true,
                  status: 'success',
                  data: {
                    status: 'success',
                    botId,
                    botName: botInfo.name || '企业微信智能机器人',
                    bot_info: botInfo,
                  },
                });
              } else if (status === 'expired') {
                sendJson(res, {
                  success: true,
                  status: 'expired',
                  data: { status: 'expired' },
                });
              } else {
                sendJson(res, {
                  success: true,
                  status: 'waiting',
                  data: { status: 'waiting' },
                });
              }
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              sendJson(res, {
                success: false,
                status: 'error',
                error: msg,
              });
            }
          });
        })
        .on('error', (err: Error) => {
          sendJson(res, {
            success: false,
            status: 'error',
            error: err.message,
          });
        });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, msg, 500);
    }
  };

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/wecom/qr-start',
    handler: handleWecomQrStart,
  });
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/wecom/query-result',
    handler: handleWecomQueryResult,
  });

  // 获取企业微信连接状态与配置信息
  const handleWecomStatus = async (
    _req: IncomingMessage,
    res: ServerResponse
  ) => {
    const state = wecomConnector.getStatus();
    const config = await wecomConnector.loadConfig();
    sendJson(res, {
      success: true,
      data: {
        ...state,
        hasConfig: !!(config?.botId && config?.botSecret),
        config: config
          ? {
              botId: config.botId,
              gatewayUrl:
                config.gatewayUrl ||
                'wss://work.weixin.qq.com/wework_admin/aibot/ws',
              autoReconnect: config.autoReconnect !== false,
            }
          : null,
      },
    });
  };

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/wecom/status',
    handler: handleWecomStatus,
  });
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/connectors/wecom/status',
    handler: handleWecomStatus,
  });

  // 保存企业微信配置并建立连接
  const handleWecomConnect = async (
    req: IncomingMessage,
    res: ServerResponse
  ) => {
    let body = '';
    req.on('data', (chunk: Buffer | string) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}') as Partial<WecomConfig>;
        if (!parsed.botId || !parsed.botSecret) {
          sendJson(res, {
            success: false,
            error: 'BotId 和 BotSecret 为必填项',
          });
          return;
        }
        const config: WecomConfig = {
          botId: parsed.botId.trim(),
          botSecret: parsed.botSecret.trim(),
          gatewayUrl: parsed.gatewayUrl?.trim() || undefined,
          autoReconnect: parsed.autoReconnect !== false,
        };
        await wecomConnector.connect(config);
        sendJson(res, {
          success: true,
          data: wecomConnector.getStatus(),
        });
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        sendJson(res, { success: false, error: errorObj.message });
      }
    });
  };

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/wecom/connect',
    handler: handleWecomConnect,
  });
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/connectors/wecom/connect',
    handler: handleWecomConnect,
  });

  // 断开企业微信长连接
  const handleWecomDisconnect = async (
    _req: IncomingMessage,
    res: ServerResponse
  ) => {
    try {
      wecomConnector.disconnect();
      sendJson(res, {
        success: true,
        data: wecomConnector.getStatus(),
      });
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      sendJson(res, { success: false, error: errorObj.message });
    }
  };

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/wecom/disconnect',
    handler: handleWecomDisconnect,
  });
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/connectors/wecom/disconnect',
    handler: handleWecomDisconnect,
  });

  // 清除企业微信配置并解绑
  const handleWecomClear = async (
    _req: IncomingMessage,
    res: ServerResponse
  ) => {
    try {
      await wecomConnector.clearConfig();
      sendJson(res, {
        success: true,
        data: wecomConnector.getStatus(),
      });
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      sendJson(res, { success: false, error: errorObj.message });
    }
  };

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/wecom/clear',
    handler: handleWecomClear,
  });
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/connectors/wecom/clear',
    handler: handleWecomClear,
  });

  // 测试发送企微消息 (可选调试路由)
  const handleWecomTestSend = async (
    req: IncomingMessage,
    res: ServerResponse
  ) => {
    let body = '';
    req.on('data', (chunk: Buffer | string) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}') as {
          chatId?: string;
          content?: string;
        };
        if (!parsed.chatId || !parsed.content) {
          sendJson(res, {
            success: false,
            error: 'chatId 和 content 为必填项',
          });
          return;
        }
        await wecomConnector.sendTextMessage(parsed.chatId, parsed.content);
        sendJson(res, { success: true });
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        sendJson(res, { success: false, error: errorObj.message });
      }
    });
  };

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/wecom/test-send',
    handler: handleWecomTestSend,
  });
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/connectors/wecom/test-send',
    handler: handleWecomTestSend,
  });
}
