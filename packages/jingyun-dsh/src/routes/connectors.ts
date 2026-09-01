import { exec, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

import type { Context } from '@deepseek-ai/cordis';

import { sendJson, sendError } from '../common/http';
import { wecomConnector, type WecomConfig } from './wecom-service';

const execAsync = promisify(exec);

let currentInitProcess: any = null;
let currentPollProcess: any = null;

const runConfigInitAndGetUrl = (): Promise<{ url: string; mode: string }> => {
  return new Promise((resolve, reject) => {
    const tempLogPath = path.join(os.tmpdir(), `lark_init_${Date.now()}.log`);
    console.log(`[UIBranding] Temp log path: ${tempLogPath}`);

    if (currentInitProcess) {
      console.log('[UIBranding] Killing previous active config init process.');
      try {
        currentInitProcess.kill();
      } catch (e) {}
    }

    const cmd = `lark-cli config init --new > "${tempLogPath}" 2>&1`;
    console.log(`[UIBranding] Executing command: ${cmd}`);

    const child = exec(cmd);
    currentInitProcess = child;

    let urlFound = false;
    let checkInterval: any = null;

    const cleanup = () => {
      if (checkInterval) clearInterval(checkInterval);
      try {
        if (fs.existsSync(tempLogPath)) {
          fs.unlinkSync(tempLogPath);
        }
      } catch (e) {}
    };

    checkInterval = setInterval(() => {
      try {
        if (fs.existsSync(tempLogPath)) {
          const content = fs.readFileSync(tempLogPath, 'utf8');
          const match = content.match(
            /https:\/\/open\.feishu\.cn\/page\/cli\?user_code=[A-Za-z0-9\-_&=%.]+/i
          );
          if (match && !urlFound) {
            urlFound = true;
            cleanup();
            console.log(
              '[UIBranding] Successfully captured config init URL from file:',
              match[0]
            );
            resolve({ url: match[0], mode: 'init' });
          }
        }
      } catch (err) {
        console.error('[UIBranding] Read temp init log error:', err);
      }
    }, 300);

    child.on('error', (err) => {
      console.error('[UIBranding] Command redirect execution error:', err);
      if (!urlFound) {
        cleanup();
        reject(err);
      }
    });

    setTimeout(() => {
      if (!urlFound) {
        console.warn(
          '[UIBranding] Timeout waiting for redirect config-init URL. Killing process.'
        );
        cleanup();
        try {
          child.kill();
        } catch (e) {}
        reject(new Error('等待获取初始化连接超时(120s)'));
      }
    }, 120000);
  });
};

const connectorHandlers: Record<
  string,
  {
    status: () => Promise<any>;
    authStart: () => Promise<any>;
    logout: () => Promise<any>;
  }
> = {
  lark: {
    status: async () => {
      try {
        const { stdout } = await execAsync('lark-cli auth status --json');
        return JSON.parse(stdout);
      } catch (err: any) {
        if (err.stdout) {
          try {
            return JSON.parse(err.stdout);
          } catch (e) {}
        }
        return { status: 'needs_login', error: err.message };
      }
    },
    authStart: async () => {
      let isConfigured = false;
      try {
        const { stdout } = await execAsync('lark-cli auth status --json');
        const data = JSON.parse(stdout);
        if (data && data.appId) {
          isConfigured = true;
        }
      } catch (err: any) {
        if (err.stdout && err.stdout.includes('not_configured')) {
          isConfigured = false;
        } else if (err.message && err.message.includes('not configured')) {
          isConfigured = false;
        } else {
          isConfigured = true;
        }
      }

      if (!isConfigured) {
        const res = await runConfigInitAndGetUrl();
        const urlObj = new URL(res.url);
        const userCode = urlObj.searchParams.get('user_code') || 'init_code';
        return {
          mode: 'init',
          verification_url: res.url,
          device_code: userCode,
        };
      } else {
        const { stdout } = await execAsync(
          'lark-cli auth login --no-wait --json --domain all'
        );
        const data = JSON.parse(stdout);
        return {
          mode: 'login',
          verification_url: data.verification_url,
          device_code: data.device_code,
        };
      }
    },
    logout: async () => {
      try {
        await execAsync('lark-cli auth logout');
      } catch (e) {}
      return { success: true };
    },
  },
};

const handleConnectorAction = async (
  channel: string,
  action: string,
  req: any,
  res: any
) => {
  try {
    const handler = connectorHandlers[channel];
    if (!handler) {
      sendError(res, `暂不支持该渠道: ${channel}`, 404);
      return;
    }

    let result: any = null;
    if (action === 'status') {
      result = await handler.status();
    } else if (action === 'auth-start') {
      result = await handler.authStart();
    } else if (action === 'auth-logout') {
      result = await handler.logout();
    } else {
      sendError(res, `未知操作: ${action}`, 404);
      return;
    }

    sendJson(res, { success: true, data: result });
  } catch (err: any) {
    console.error(
      `[UIBranding] Connector ${channel} ${action} error:`,
      err.message
    );
    sendError(res, err.message);
  }
};

export function registerConnectorsRoutes(ctx: Context) {
  // 1. 获取飞书连接状态
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/lark/status',
    handler: async (req, res) =>
      handleConnectorAction('lark', 'status', req, res),
  });

  // 2. 启动飞书认证连接
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/lark/auth-start',
    handler: async (req, res) =>
      handleConnectorAction('lark', 'auth-start', req, res),
  });

  // 3. 断开飞书连接
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/lark/auth-logout',
    handler: async (req, res) =>
      handleConnectorAction('lark', 'auth-logout', req, res),
  });

  // 4. 轮询飞书认证结果
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/lark/auth-poll',
    handler: async (req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', async () => {
        let payload: any = {};
        try {
          payload = JSON.parse(body || '{}');
        } catch (e: any) {
          sendError(res, `JSON 解析失败: ${e.message}`, 400);
          return;
        }

        const { device_code } = payload;
        if (!device_code) {
          sendError(res, '缺少 device_code 参数', 400);
          return;
        }

        let childProcessForLogin: any = null;
        let timeoutId: any = null;

        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (childProcessForLogin) {
            console.log(
              '[UIBranding] Cleaning up and killing auth login poll process...'
            );
            try {
              childProcessForLogin.kill();
            } catch (e) {}
          }
        };

        try {
          if (currentInitProcess && !currentInitProcess.killed) {
            console.log(
              '[UIBranding] Poll: Waiting for active Phase 1 config init process to exit...'
            );
            const waitProcessExit = () => {
              return new Promise<void>((resolve, reject) => {
                const handleExit = (code: number | null) => {
                  currentInitProcess = null;
                  if (code === 0) {
                    resolve();
                  } else {
                    reject(new Error(`配置初始化失败，退出码: ${code}`));
                  }
                };
                currentInitProcess.once('close', handleExit);
                currentInitProcess.once('error', (err: any) => {
                  currentInitProcess = null;
                  reject(err);
                });
              });
            };
            await waitProcessExit();
            console.log(
              '[UIBranding] Poll: Phase 1 config init exited successfully. Capturing phase 2 url...'
            );

            sendJson(res, {
              success: true,
              mode: 'init_done',
            });
            return;
          }

          if (currentPollProcess) {
            console.log(
              '[UIBranding] Killing previous active auth login poll process.'
            );
            try {
              currentPollProcess.kill();
            } catch (e) {}
          }

          console.log(
            `[UIBranding] Spawning Phase 2: lark-cli auth login --device-code ${device_code}`
          );
          const child = spawn(
            'lark-cli',
            ['auth', 'login', '--device-code', device_code, '--json'],
            { shell: true }
          );
          currentPollProcess = child;
          childProcessForLogin = child;

          timeoutId = setTimeout(() => {
            console.warn(
              '[UIBranding] Auth login poll timeout (120s). Killing process.'
            );
            cleanup();
          }, 120000);

          const waitLoginResult = () => {
            return new Promise<string>((resolve, reject) => {
              let stdout = '';
              child.stdout.on('data', (data) => {
                stdout += data.toString();
              });
              child.on('close', (code) => {
                currentPollProcess = null;
                if (code === 0) {
                  resolve(stdout);
                } else {
                  reject(
                    new Error(`授权登录失败，退出码: ${code}. 输出: ${stdout}`)
                  );
                }
              });
              child.on('error', (err) => {
                currentPollProcess = null;
                reject(err);
              });
            });
          };

          const stdout = await waitLoginResult();
          if (timeoutId) clearTimeout(timeoutId);

          console.log('[UIBranding] Phase 2 auth login finished successfully!');
          sendJson(res, {
            success: true,
            mode: 'login',
            data: JSON.parse(stdout),
          });
        } catch (err: any) {
          if (timeoutId) clearTimeout(timeoutId);
          console.error('[UIBranding] Auth poll error:', err.message);
          sendJson(res, {
            success: false,
            status: 'error',
            error: err.message,
          });
        }
      });
    },
  });

  // 初始化企业微信连接器服务
  wecomConnector.init().catch((err: unknown) => {
    console.warn('[WecomConnector] Failed to initialize:', err);
  });

  // 获取企业微信扫码授权信息 (生成官方授权链接与 scode)
  const handleWecomQrStart = async (_req: any, res: any) => {
    try {
      const https = await import('https');
      const url = `https://work.weixin.qq.com/ai/qc/gen?source=codebuddy&state=state_${Date.now()}&timestamp=${Date.now()}`;
      https
        .get(url, (remoteRes) => {
          let data = '';
          remoteRes.on('data', (c) => {
            data += c;
          });
          remoteRes.on('end', () => {
            const match = data.match(/window\.settings\s*=\s*(\{.*?\})/);
            if (match) {
              try {
                const settings = JSON.parse(match[1]);
                sendJson(res, {
                  success: true,
                  data: {
                    scode: settings.scode,
                    authUrl: settings.auth_url,
                  },
                });
              } catch (err: any) {
                sendError(res, 500, `解析官方配置失败: ${err.message}`);
              }
            } else {
              sendError(res, 500, '未能从企微获取到授权信息');
            }
          });
        })
        .on('error', (err) => {
          sendError(res, 500, `请求企微网关失败: ${err.message}`);
        });
    } catch (err: any) {
      sendError(res, 500, err.message);
    }
  };

  // 轮询企业微信扫码授权结果
  const handleWecomQueryResult = async (req: any, res: any) => {
    try {
      const parsedUrl = new URL(req.url, 'http://127.0.0.1');
      const scode = parsedUrl.searchParams.get('scode') || '';
      if (!scode) {
        sendError(res, 400, '缺少 scode 参数');
        return;
      }

      const https = await import('https');
      const queryUrl = `https://work.weixin.qq.com/ai/qc/query_result?scode=${encodeURIComponent(scode)}`;
      https
        .get(queryUrl, (remoteRes) => {
          let data = '';
          remoteRes.on('data', (c) => {
            data += c;
          });
          remoteRes.on('end', async () => {
            try {
              const result = JSON.parse(data);
              const status = result?.data?.status;
              const botInfo = result?.data?.bot_info;

              if (status === 'success' && botInfo) {
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
            } catch (err: any) {
              sendJson(res, {
                success: false,
                status: 'error',
                error: err.message,
              });
            }
          });
        })
        .on('error', (err) => {
          sendJson(res, {
            success: false,
            status: 'error',
            error: err.message,
          });
        });
    } catch (err: any) {
      sendError(res, 500, err.message);
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

  // 5. 获取企业微信连接状态与配置信息
  const handleWecomStatus = async (_req: any, res: any) => {
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

  // 6. 保存企业微信配置并建立连接
  const handleWecomConnect = async (req: any, res: any) => {
    let body = '';
    req.on('data', (chunk: any) => {
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

  // 7. 断开企业微信长连接
  const handleWecomDisconnect = async (_req: any, res: any) => {
    try {
      wecomConnector.disconnect(true);
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

  // 8. 清除企业微信配置并解绑
  const handleWecomClear = async (_req: any, res: any) => {
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

  // 9. 测试发送企微消息 (可选调试路由)
  const handleWecomTestSend = async (req: any, res: any) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
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
