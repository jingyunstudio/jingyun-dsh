import * as fs from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';
import * as path from 'path';

import type { Context } from '@deepseek-ai/cordis';

import { assistantSessionManager } from '../agent/assistant-session-manager';
import { parseJsonBody, sendError, sendJson } from '../common/http';
import { getAssistantDataDir } from '../common/paths';

export function registerAssistantRoutes(ctx: Context) {
  // 获取当前活动的助理 Session ID
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/assistant/session',
    handler: async (_req, res) => {
      try {
        const dir = getAssistantDataDir();
        const file = path.join(dir, 'active_session.json');
        if (fs.existsSync(file)) {
          const content = JSON.parse(fs.readFileSync(file, 'utf8'));
          sendJson(res, { success: true, data: content });
          return;
        }
        sendJson(res, { success: true, data: { sessionId: '' } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        sendError(res, message, 500);
      }
    },
  });

  // 更新/绑定当前活动的助理 Session ID
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/assistant/session/bind',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const body = await parseJsonBody<{ sessionId?: string }>(req);
        const sessionId = body.sessionId?.trim();
        if (!sessionId) {
          sendError(res, '缺少有效 sessionId', 400);
          return;
        }
        const dir = getAssistantDataDir();
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const file = path.join(dir, 'active_session.json');
        fs.writeFileSync(
          file,
          JSON.stringify({ sessionId, updatedAt: Date.now() }),
          'utf8'
        );
        sendJson(res, { success: true, data: { sessionId } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        sendError(res, message, 500);
      }
    },
  });
  // 一键重置并创建全新的智能助理会话
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/assistant/session/reset',
    handler: async (_req, res) => {
      try {
        const sessionId =
          await assistantSessionManager.createAssistantSession(ctx);
        sendJson(res, { success: true, data: { sessionId } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[AssistantRoute] Reset failed:', err);
        sendError(res, message, 500);
      }
    },
  });

  // 获取智能助理专属工作区信息
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/assistant/workspace',
    handler: async (_req, res) => {
      try {
        const ws =
          await assistantSessionManager.getOrCreateAssistantWorkspace(ctx);
        sendJson(res, {
          success: true,
          data: {
            workspaceId: ws.workspaceId,
            path: ws.path,
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        sendError(res, message, 500);
      }
    },
  });

  // 确保就绪的助理原生会话
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/assistant/session/ensure',
    handler: async (req, res) => {
      try {
        const url = new URL(req.url || '', 'http://localhost');
        const forceNew = url.searchParams.get('forceNew') === 'true';
        const sessionId = forceNew
          ? await assistantSessionManager.createAssistantSession(ctx)
          : await assistantSessionManager.ensureAssistantSession(ctx);
        sendJson(res, {
          success: true,
          data: { sessionId },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        sendError(res, message, 500);
      }
    },
  });
}
