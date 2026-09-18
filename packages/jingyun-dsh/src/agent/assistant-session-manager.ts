import * as fs from 'fs';
import * as path from 'path';

import type { Context } from '@deepseek-ai/cordis';

import { getAssistantDataDir, getDshHome } from '../common/paths';
export interface AssistantSessionInfo {
  sessionId: string;
  workspaceId?: string;
  createdAt: number;
}

export class AssistantSessionManager {
  private get activeSessionFile(): string {
    return path.join(getAssistantDataDir(), 'active_session.json');
  }

  public getSavedSessionId(): string | undefined {
    if (!fs.existsSync(this.activeSessionFile)) {
      return undefined;
    }
    try {
      const raw = JSON.parse(fs.readFileSync(this.activeSessionFile, 'utf8'));
      if (raw?.sessionId) return String(raw.sessionId);
    } catch (err) {
      console.warn(
        '[AssistantSessionManager] Failed to parse active session file:',
        err
      );
    }
    return undefined;
  }

  public saveSessionId(sessionId: string, workspaceId?: string): void {
    try {
      const dir = getAssistantDataDir();
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const payload: AssistantSessionInfo = {
        sessionId,
        workspaceId,
        createdAt: Date.now(),
      };
      fs.writeFileSync(
        this.activeSessionFile,
        JSON.stringify(payload, null, 2),
        'utf8'
      );
    } catch (err) {
      console.warn(
        '[AssistantSessionManager] Failed to save active session:',
        err
      );
    }
  }

  public async getOrCreateAssistantWorkspace(
    ctx: Context
  ): Promise<{ workspaceId: string; path: string }> {
    const wsDir = path.join(getAssistantDataDir(), 'workspace');
    if (!fs.existsSync(wsDir)) {
      fs.mkdirSync(wsDir, { recursive: true });
    }
    const DEDICATED_ID = 'assistant-dedicated-workspace';

    try {
      const registry = (
        ctx as unknown as {
          workspaceRegistry?: {
            list: () => Array<{ id?: string; path?: string; title?: string }>;
            create: (
              p: string,
              t?: string
            ) => Promise<{ id?: string; path?: string }>;
            get: (id: string) => unknown;
          };
        }
      ).workspaceRegistry;

      if (registry) {
        const existing =
          typeof registry.get === 'function'
            ? registry.get(DEDICATED_ID)
            : null;
        if (!existing && typeof registry.create === 'function') {
          await registry.create(wsDir, '智能助理');
        }
      }
    } catch (err) {
      console.warn(
        '[AssistantSessionManager] Failed to ensure workspace in registry:',
        err
      );
    }

    // 强约束铁律：必须且只能返回专属工作区 ID，绝不返回 undefined 避免 DSH 回退到 111
    return { workspaceId: DEDICATED_ID, path: wsDir };
  }

  public async createAssistantSession(ctx: Context): Promise<string> {
    const { workspaceId, path: wsPath } =
      await this.getOrCreateAssistantWorkspace(ctx);
    const controller = (
      ctx as unknown as {
        sessionController?: {
          create: (req: unknown) => Promise<{ sessionId: string }>;
          rename: (req: { sessionId: string; title: string }) => Promise<void>;
          prompt: (req: unknown, signal: AbortSignal) => Promise<unknown>;
          resolveAgent: (sessionId: string) => Promise<{
            session?: {
              append: (type: string, data: unknown, ...opts: unknown[]) => void;
            };
          }>;
        };
      }
    ).sessionController;

    if (!controller) {
      throw new Error(
        'sessionController service is not available on Cordis context'
      );
    }

    // DSH sessionController.create 契约：只接受 workspaceId 或 cwd 其一，不可同时传入
    const createReq = workspaceId ? { workspaceId } : { cwd: wsPath };
    const res = await controller.create(createReq);
    const newSessionId = res.sessionId;

    try {
      await controller.rename({
        sessionId: newSessionId,
        title: '智能助理',
      });
    } catch (err) {
      console.warn('[AssistantSessionManager] Failed to rename session:', err);
    }
    // 1. 将新会话挂载到专属智能助理工作区，确保前端识别归属
    try {
      const registry = (
        ctx as unknown as {
          workspaceRegistry?: {
            get: (
              id: string
            ) => { attachSession: (sid: string) => Promise<void> } | undefined;
          };
        }
      ).workspaceRegistry;
      if (registry && workspaceId) {
        const wsEntity = registry.get(workspaceId);
        if (wsEntity && typeof wsEntity.attachSession === 'function') {
          await wsEntity.attachSession(newSessionId);
        }
      }
    } catch (err) {
      console.warn(
        '[AssistantSessionManager] Failed to attach session to workspace via registry:',
        err
      );
    }
    // 1.1 直接保障磁盘 workspace.json 持久化契约，杜绝 ID 丢失脱节
    try {
      const p = path.join(getDshHome(), 'storages', 'workspace.json');
      if (fs.existsSync(p)) {
        const d = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (
          d?.tables?.workspaces &&
          workspaceId &&
          d.tables.workspaces[workspaceId]
        ) {
          const wsObj = d.tables.workspaces[workspaceId];
          const curList: string[] = Array.isArray(wsObj.sessionIds)
            ? wsObj.sessionIds
            : [];
          if (!curList.includes(newSessionId)) {
            wsObj.sessionIds = [newSessionId, ...curList];
            fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf8');
          }
        }
      }
    } catch (err) {
      console.warn(
        '[AssistantSessionManager] Failed to directly sync workspace.json:',
        err
      );
    }

    this.saveSessionId(newSessionId, workspaceId);
    return newSessionId;
  }

  public async ensureAssistantSession(ctx: Context): Promise<string> {
    const existing = this.getSavedSessionId();
    if (existing) {
      return existing;
    }
    return this.createAssistantSession(ctx);
  }
}

export const assistantSessionManager = new AssistantSessionManager();
