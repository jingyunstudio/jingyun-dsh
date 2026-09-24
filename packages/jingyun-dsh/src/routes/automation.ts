import type { IncomingMessage, ServerResponse } from 'http';

import type { Context } from '@deepseek-ai/cordis';

import {
  automationSchedulerService,
  automationStorage,
  listAvailableWorkspaces,
  type AutoTask,
  type WorkspaceOption,
} from '../automation';
import {
  parseJsonBody,
  sendError,
  sendJson,
  setCorsHeaders,
} from '../common/http';

export type { WorkspaceOption };
export function registerAutomationRoutes(ctx: Context) {
  ctx.webServer.register({
    kind: 'prefix',
    path: '/api/jingyun/automation',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      setCorsHeaders(res);
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const reqUrl = new URL(req.url || '', 'http://localhost');
      const pathname = reqUrl.pathname;
      const method = (req.method || 'GET').toUpperCase();

      try {
        // 1. GET /api/jingyun/automation/workspaces (查询可用工作区列表)
        if (
          pathname === '/api/jingyun/automation/workspaces' &&
          method === 'GET'
        ) {
          const workspaces = listAvailableWorkspaces();
          sendJson(res, { success: true, data: workspaces });
          return;
        }

        // 2. GET /api/jingyun/automation/tasks (任务列表)
        if (pathname === '/api/jingyun/automation/tasks' && method === 'GET') {
          const tasks = automationStorage.getTasks();
          sendJson(res, { success: true, data: tasks });
          return;
        }

        // 3. POST /api/jingyun/automation/tasks (新建任务)
        if (pathname === '/api/jingyun/automation/tasks' && method === 'POST') {
          const body = await parseJsonBody<Partial<AutoTask>>(req);
          if (!body.name || !body.prompt) {
            sendError(res, '任务名称与提示词内容不能为空', 400);
            return;
          }

          const newTask: AutoTask = {
            id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: body.name.trim(),
            workspace: body.workspace?.trim() || '自动化工作区 (默认)',
            prompt: body.prompt.trim(),
            connectors: Array.isArray(body.connectors) ? body.connectors : [],
            modelMode: body.modelMode || 'auto',
            skills: Array.isArray(body.skills) ? body.skills : [],
            agentId: body.agentId || 'none',
            permissionLevel: body.permissionLevel || 'full',
            frequencyType: body.frequencyType || 'cycle',
            frequencyDetail: body.frequencyDetail || '每天 08:30',
            frequencyConfig: body.frequencyConfig || {
              cycleType: 'everyday',
              cycleTime: '08:30',
            },
            startDate: body.startDate,
            endDate: body.endDate,
            enabled: body.enabled !== false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          const saved = automationStorage.saveTask(newTask);
          sendJson(res, { success: true, data: saved });
          return;
        }

        // 3. /api/jingyun/automation/tasks/:id/run
        const runMatch = pathname.match(
          /^\/api\/jingyun\/automation\/tasks\/([^/]+)\/run$/
        );
        if (runMatch && method === 'POST') {
          const taskId = decodeURIComponent(runMatch[1]);
          const task = automationStorage.getTask(taskId);
          if (!task) {
            sendError(res, `未找到 ID 为 ${taskId} 的自动化任务`, 404);
            return;
          }

          const record = await automationSchedulerService.executeTask(
            task,
            'manual'
          );
          sendJson(res, { success: true, data: record });
          return;
        }

        // 4. /api/jingyun/automation/tasks/:id/toggle
        const toggleMatch = pathname.match(
          /^\/api\/jingyun\/automation\/tasks\/([^/]+)\/toggle$/
        );
        if (toggleMatch && method === 'POST') {
          const taskId = decodeURIComponent(toggleMatch[1]);
          const body = await parseJsonBody<{ enabled?: boolean }>(req);
          const updated = automationStorage.toggleTask(taskId, body.enabled);
          sendJson(res, { success: true, data: updated });
          return;
        }

        // 5. PUT /api/jingyun/automation/tasks/:id (更新任务)
        const idMatch = pathname.match(
          /^\/api\/jingyun\/automation\/tasks\/([^/]+)$/
        );
        if (idMatch && method === 'PUT') {
          const taskId = decodeURIComponent(idMatch[1]);
          const existing = automationStorage.getTask(taskId);
          if (!existing) {
            sendError(res, `未找到 ID 为 ${taskId} 的自动化任务`, 404);
            return;
          }

          const body = await parseJsonBody<Partial<AutoTask>>(req);
          const updatedTask: AutoTask = {
            ...existing,
            ...body,
            id: taskId,
            updatedAt: Date.now(),
          };

          const saved = automationStorage.saveTask(updatedTask);
          sendJson(res, { success: true, data: saved });
          return;
        }

        // 6. DELETE /api/jingyun/automation/tasks/:id (删除任务)
        if (idMatch && method === 'DELETE') {
          const taskId = decodeURIComponent(idMatch[1]);
          const deleted = automationStorage.deleteTask(taskId);
          if (!deleted) {
            sendError(res, `未找到 ID 为 ${taskId} 的任务`, 404);
            return;
          }
          sendJson(res, { success: true, message: '任务已删除' });
          return;
        }

        // 7. GET /api/jingyun/automation/history
        if (
          pathname === '/api/jingyun/automation/history' &&
          method === 'GET'
        ) {
          const history = automationStorage.getHistory();
          sendJson(res, { success: true, data: history });
          return;
        }

        // 8. DELETE /api/jingyun/automation/history (清空历史记录)
        if (
          pathname === '/api/jingyun/automation/history' &&
          method === 'DELETE'
        ) {
          automationStorage.clearHistory();
          sendJson(res, { success: true, message: '执行历史已清空' });
          return;
        }

        // 9. GET /api/jingyun/automation/settings
        if (
          pathname === '/api/jingyun/automation/settings' &&
          method === 'GET'
        ) {
          const settings = automationStorage.getSettings();
          sendJson(res, { success: true, data: settings });
          return;
        }

        // 10. POST /api/jingyun/automation/settings
        if (
          pathname === '/api/jingyun/automation/settings' &&
          method === 'POST'
        ) {
          const body = await parseJsonBody<{ keepAwake?: boolean }>(req);
          const updated = automationStorage.saveSettings(body);
          automationSchedulerService.syncKeepAwake(updated.keepAwake);
          sendJson(res, { success: true, data: updated });
          return;
        }

        sendError(res, `不支持的请求路由: ${method} ${pathname}`, 404);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('[AutomationRoutes] Error handling request:', err);
        sendError(res, errorMsg, 500);
      }
    },
  });
}
