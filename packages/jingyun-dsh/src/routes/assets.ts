import type { IncomingMessage, ServerResponse } from 'http';

import type { Context } from '@deepseek-ai/cordis';

import {
  deleteAsset,
  getInstalledAssets,
  importAssetZip,
  installAsset,
  openAssetFolder,
  uninstallAsset,
} from '../assets';
import { parseJsonBody, sendError, sendJson } from '../common/http';

export function registerAssetsRoutes(ctx: Context) {
  // 1. 扫描物理资产列表 (skills, agents, plugins, rules)
  const installedAssetsHandler = async (
    _req: IncomingMessage,
    res: ServerResponse
  ) => {
    try {
      const data = await getInstalledAssets();
      sendJson(res, { success: true, data });
    } catch (err: any) {
      sendError(res, err.message);
    }
  };

  ctx.webServer.register({
    kind: 'exact',
    path: '/jy-api/installed-assets',
    handler: installedAssetsHandler,
  });

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/installed-assets',
    handler: installedAssetsHandler,
  });

  // 2. 打开物理资产所在的物理目录
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/assets/open-folder',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const body = await parseJsonBody<{
          type?: string;
          slug?: string;
          category?: string;
        }>(req);
        const result = await openAssetFolder(body);
        sendJson(res, result);
      } catch (err: any) {
        sendError(res, err.message);
      }
    },
  });

  // 3. 安全删除物理资产
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/assets/delete',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const body = await parseJsonBody<{ type?: string; slug?: string }>(req);
        const result = await deleteAsset(body);
        sendJson(res, result);
      } catch (err: any) {
        sendError(res, err.message);
      }
    },
  });

  // 4. 通用本地资产安装与落盘接口
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/assets/install',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const payload = await parseJsonBody<any>(req);
        const result = await installAsset(payload);
        sendJson(res, result);
      } catch (err: any) {
        sendError(res, err.message);
      }
    },
  });

  // 5. 卸载物理资产
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/assets/uninstall',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const payload = await parseJsonBody<{
          slug?: string;
          category?: string;
        }>(req);
        const result = await uninstallAsset(payload);
        sendJson(res, result);
      } catch (err: any) {
        sendError(res, err.message);
      }
    },
  });

  // 6. 物理导入本地 ZIP 智能体包与技能包
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/assets/import-zip',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const payload = await parseJsonBody<{
          filename?: string;
          dataBase64?: string;
          targetType?: string;
        }>(req);
        const result = await importAssetZip(payload);
        sendJson(res, result);
      } catch (err: any) {
        sendError(res, err.message);
      }
    },
  });
}
