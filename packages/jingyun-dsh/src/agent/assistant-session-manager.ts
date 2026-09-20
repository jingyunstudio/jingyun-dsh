import * as fs from 'fs';
import * as path from 'path';

import type { Context } from '@deepseek-ai/cordis';

import { getAssistantDataDir } from '../common/paths';
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

    const registry = (
      ctx as unknown as {
        workspaceRegistry?: {
          create: (
            p: string,
            t?: string
          ) => Promise<{ id: string; path?: string }>;
        };
      }
    ).workspaceRegistry;

    if (registry && typeof registry.create === 'function') {
      try {
        const entity = await registry.create(wsDir, '智能助理');
        if (entity?.id) {
          return { workspaceId: entity.id, path: entity.path || wsDir };
        }
      } catch (err) {
        console.warn(
          '[AssistantSessionManager] Failed to create workspace in registry:',
          err
        );
      }
    }

    return { workspaceId: '', path: wsDir };
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
    const resRecord = res as Record<string, unknown>;
    const newSessionId = String(resRecord.sessionId || resRecord.id || '');
    if (!newSessionId) {
      throw new Error('Failed to obtain new sessionId from sessionController');
    }

    try {
      await controller.rename({
        sessionId: newSessionId,
        title: '智能助理',
      });
    } catch (err) {
      console.warn('[AssistantSessionManager] Failed to rename session:', err);
    }

    if (workspaceId) {
      try {
        const registryHolder = ctx as unknown as {
          workspaceRegistry?: {
            get: (
              id: string
            ) => { attachSession: (sid: string) => Promise<void> } | undefined;
          };
        };
        const registry = registryHolder.workspaceRegistry;
        if (registry && typeof registry.get === 'function') {
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
