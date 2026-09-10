import type { IncomingMessage, ServerResponse } from 'http';

import type { Context } from '@deepseek-ai/cordis';

import { parseJsonBody, sendError, sendJson } from '../common/http';
import {
  getCommunityPlugins,
  getInstalledPlugins,
  installCommunityPlugin,
  uninstallCommunityPlugin,
} from '../plugins';

export function registerPluginsRoutes(ctx: Context) {
  // 1. 获取底座与已安装插件列表
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/plugins',
    handler: async (_req: IncomingMessage, res: ServerResponse) => {
      try {
        const result = await getInstalledPlugins(ctx);
        sendJson(res, result);
      } catch (err: any) {
        sendError(res, err.message);
      }
    },
  });

  // 2. 获取开源社区插件列表
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/plugins/community',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const urlObj = new URL(
          req.url || '',
          `http://${req.headers.host || '127.0.0.1'}`
        );
        const keyword = urlObj.searchParams.get('keyword') || '';
        const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
        const limit = parseInt(urlObj.searchParams.get('limit') || '30', 10);

        const result = await getCommunityPlugins({ keyword, page, limit });
        sendJson(res, result);
      } catch (err: any) {
        sendError(res, err.message);
      }
    },
  });

  // 3. 安装开源社区插件 API
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/plugins/install-community',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const payload = await parseJsonBody(req);
        const result = await installCommunityPlugin(payload);
        sendJson(res, result);
      } catch (err: any) {
        sendError(res, err.message, err.statusCode || 500);
      }
    },
  });

  // 4. 卸载开源社区插件 API
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/plugins/uninstall-community',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const payload = await parseJsonBody(req);
        const result = await uninstallCommunityPlugin(ctx, payload);
        sendJson(res, result);
      } catch (err: any) {
        sendError(res, err.message);
      }
    },
  });
}
