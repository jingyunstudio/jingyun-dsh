import { type ChildProcess, spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';

import type { Context } from '@deepseek-ai/cordis';

import { onSessionTurnEnd } from '../agent/assistant-session-manager';
import {
  getSessionAgentsConfig,
  saveSessionAgentsConfig,
} from '../agent/manager';
import { getAutomationWorkspaceDir } from '../common/paths';
import {
  dingtalkTunnelService,
  feishuService,
  wecomService,
  weixinConnector,
} from '../connectors';
import { automationStorage, listAvailableWorkspaces } from './storage';
import type { AutomationHistoryRecord, AutoTask, TaskStatus } from './types';

function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatDateOnly(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

export class AutomationSchedulerService {
  private ctx: Context | null = null;
  private timer: NodeJS.Timeout | null = null;
  private lastTriggeredMinute = new Set<string>();
  private runningTaskIds = new Set<string>();
  private keepAwakeProc: ChildProcess | null = null;

  public setContext(ctx: Context): void {
    this.ctx = ctx;
  }

  public start(ctx?: Context): void {
    if (ctx) {
      this.setContext(ctx);
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // 启动 15 秒 Tick 巡检循环
    this.timer = setInterval(() => {
      this.tick().catch((err) => {
        console.error('[AutomationScheduler] Tick error:', err);
      });
    }, 15000);
    this.syncKeepAwake(automationStorage.getSettings().keepAwake);
    console.log('[AutomationScheduler] Automation scheduler started.');
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.syncKeepAwake(false);
  }

  public syncKeepAwake(enabled: boolean): void {
    if (this.keepAwakeProc) {
      this.keepAwakeProc.kill();
      this.keepAwakeProc = null;
    }
    if (!enabled) return;
    try {
      if (process.platform === 'win32') {
        this.keepAwakeProc = spawn(
          'powershell',
          [
            '-NoProfile',
            '-WindowStyle',
            'Hidden',
            '-Command',
            "$w = Add-Type -MemberDefinition '[DllImport(\"kernel32.dll\")] public static extern uint SetThreadExecutionState(uint esFlags);' -Name 'Win32' -Namespace 'Power' -PassThru; $w::SetThreadExecutionState(2147483651); while($true){Start-Sleep 60}",
          ],
          { stdio: 'ignore', windowsHide: true }
        );
      } else if (process.platform === 'darwin') {
        this.keepAwakeProc = spawn('caffeinate', ['-di'], { stdio: 'ignore' });
      }
      this.keepAwakeProc?.unref();
    } catch {}
    console.log('[AutomationScheduler] Automation scheduler stopped.');
  }

  private isDateInRange(
    now: Date,
    startDate?: string,
    endDate?: string
  ): boolean {
    const today = formatDateOnly(now);
    if (startDate && today < startDate) {
      return false;
    }
    if (endDate && today > endDate) {
      return false;
    }
    return true;
  }

  private shouldTrigger(task: AutoTask, now: Date): boolean {
    if (!task.enabled || this.runningTaskIds.has(task.id)) {
      return false;
    }

    if (!this.isDateInRange(now, task.startDate, task.endDate)) {
      return false;
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const nowHHmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const todayStr = formatDateOnly(now);
    const minuteKey = `${task.id}:${todayStr}-${nowHHmm}`;

    if (task.lastRunAt) {
      const lastDate = new Date(task.lastRunAt);
      const lastHHmm = `${pad(lastDate.getHours())}:${pad(lastDate.getMinutes())}`;
      if (formatDateOnly(lastDate) === todayStr && lastHHmm === nowHHmm) {
        return false;
      }
    }

    if (task.frequencyType === 'cycle') {
      const cycleTime =
        task.frequencyConfig?.cycleTime ||
        task.frequencyDetail.match(/\d{2}:\d{2}/)?.[0];
      if (!cycleTime || nowHHmm !== cycleTime) {
        return false;
      }

      const cycleType = task.frequencyConfig?.cycleType || 'everyday';
      if (
        cycleType === 'everyweek' &&
        now.getDay() !== (task.frequencyConfig?.cycleDay ?? 0)
      ) {
        return false;
      }
      if (
        cycleType === 'everymonth' &&
        now.getDate() !== (task.frequencyConfig?.cycleDay ?? 1)
      ) {
        return false;
      }

      if (this.lastTriggeredMinute.has(minuteKey)) {
        return false;
      }
      this.lastTriggeredMinute.add(minuteKey);
      if (this.lastTriggeredMinute.size > 200) {
        this.lastTriggeredMinute.clear();
      }
      return true;
    }

    if (task.frequencyType === 'interval') {
      const val = task.frequencyConfig?.intervalValue || 1;
      const unit = task.frequencyConfig?.intervalUnit || 'hour';
      const intervalMs = unit === 'hour' ? val * 3600000 : val * 60000;
      const lastRun = task.lastRunAt || task.createdAt;
      return now.getTime() - lastRun >= intervalMs;
    }

    if (task.frequencyType === 'once') {
      const onceTime =
        task.frequencyConfig?.onceTime ||
        task.frequencyDetail.match(/\d{2}:\d{2}/)?.[0];
      if (!onceTime) {
        return !task.lastRunAt;
      }
      if (/^\d{2}:\d{2}$/.test(onceTime)) {
        return nowHHmm === onceTime;
      }
      const targetTime = new Date(onceTime).getTime();
      return !isNaN(targetTime) && now.getTime() >= targetTime;
    }

    return false;
  }

  public async tick(): Promise<void> {
    const tasks = automationStorage.getTasks();
    const now = new Date();

    for (const task of tasks) {
      if (this.shouldTrigger(task, now)) {
        console.log(
          `[AutomationScheduler] Triggering task: ${task.name} (${task.id})`
        );
        this.executeTask(task, 'scheduled').catch((err) => {
          console.error(
            `[AutomationScheduler] Error executing task ${task.id}:`,
            err
          );
        });
      }
    }
  }

  private async createTaskSession(
    cwd: string,
    wsTitle: string,
    taskName: string,
    controller: {
      create: (req: unknown) => Promise<{ sessionId: string }>;
      rename?: (req: { sessionId: string; title: string }) => Promise<void>;
    }
  ): Promise<string> {
    fs.mkdirSync(cwd, { recursive: true });
    const holder = this.ctx as unknown as {
      workspaceRegistry?: {
        create?: (p: string, t?: string) => Promise<{ id?: string }>;
        get?: (
          id: string
        ) => { attachSession?: (s: string) => Promise<void> } | undefined;
      };
    };
    const ws = await holder.workspaceRegistry?.create?.(cwd, wsTitle);
    const res = await controller.create(
      ws?.id ? { workspaceId: ws.id } : { cwd }
    );
    const sid = res.sessionId;
    if (!sid) {
      throw new Error(
        'DSH sessionController 创建会话失败：未返回有效的 sessionId'
      );
    }
    if (controller.rename) {
      await controller.rename({ sessionId: sid, title: taskName });
    }
    if (ws?.id) {
      await holder.workspaceRegistry?.get?.(ws.id)?.attachSession?.(sid);
    }
    return sid;
  }

  public async executeTask(
    task: AutoTask,
    triggerType: 'scheduled' | 'manual' = 'manual'
  ): Promise<AutomationHistoryRecord> {
    this.runningTaskIds.add(task.id);
    const startTime = Date.now();
    const recordId = `hist_${startTime}_${Math.random().toString(36).slice(2, 6)}`;
    const startDate = new Date(startTime);

    const initialRecord: AutomationHistoryRecord = {
      id: recordId,
      taskId: task.id,
      taskName: task.name,
      time: formatDateTime(startDate),
      timestamp: startTime,
      status: 'running',
      duration: '0s',
      durationMs: 0,
      message: `任务已触发 (${triggerType === 'manual' ? '手动执行' : '定时调度'})，等待 Agent 回复...`,
    };

    automationStorage.addHistory(initialRecord);
    automationStorage.updateTaskRunStatus(task.id, 'running', startTime);

    let output = '';
    let finalStatus: TaskStatus = 'success';
    let resultMessage = '';

    try {
      if (!this.ctx) {
        throw new Error('DSH Cordis 上下文未挂载，无法执行 Agent 会话');
      }

      const cordisCtx = this.ctx as unknown as {
        sessionController?: {
          create: (req: unknown) => Promise<{ sessionId: string }>;
          rename?: (req: { sessionId: string; title: string }) => Promise<void>;
          prompt: (req: unknown, signal: AbortSignal) => Promise<unknown>;
          resolveAgent?: (sid: string) => Promise<{
            session?: { append?: (type: string, data: unknown) => void };
          }>;
        };
      };
      const controller = cordisCtx.sessionController;
      if (!controller || typeof controller.prompt !== 'function') {
        throw new Error('DSH sessionController 服务不可用');
      }

      const matchedWs = listAvailableWorkspaces().find(
        (w) =>
          w.name === task.workspace ||
          w.id === task.workspace ||
          w.path === task.workspace
      );
      const targetCwd = matchedWs
        ? matchedWs.path
        : getAutomationWorkspaceDir();
      const targetTitle =
        matchedWs && matchedWs.id !== 'automation' ? matchedWs.name : '自动化';
      const sessionId = await this.createTaskSession(
        targetCwd,
        targetTitle,
        task.name,
        controller
      );
      const sandboxMode =
        task.permissionLevel === 'readonly'
          ? 'read-only'
          : task.permissionLevel === 'standard'
            ? 'workspace-write'
            : 'danger-full-access';
      if (controller.resolveAgent) {
        const ag = await controller.resolveAgent(sessionId);
        ag?.session?.append?.('sandbox/mode', { mode: sandboxMode });
      }

      if (task.agentId && task.agentId !== 'none') {
        const agentCfg = getSessionAgentsConfig();
        agentCfg.sessions[sessionId] = task.agentId;
        saveSessionAgentsConfig(agentCfg);
      }

      const directives: string[] = [];
      if (task.skills && task.skills.length > 0) {
        directives.push(`[优先使用技能: ${task.skills.join(', ')}]`);
      }
      if (task.modelMode === 'deepthink') {
        directives.push(
          '[模式要求: 深度思考模式，请进行详尽的多维推理与结构化总结]'
        );
      } else if (task.modelMode === 'fast') {
        directives.push(
          '[模式要求: 极速精简模式，请直接输出核心结论与关键要点]'
        );
      }
      const finalPrompt =
        directives.length > 0
          ? `${directives.join('\n')}\n\n${task.prompt}`
          : task.prompt;

      // 设置 3 分钟回复监听与超时
      output = await new Promise<string>((resolve, reject) => {
        let settled = false;
        const abortCtrl = new AbortController();

        const dispose = onSessionTurnEnd(this.ctx!, (sid, finalText) => {
          if (sid === sessionId && !settled) {
            settled = true;
            clearTimeout(timeoutTimer);
            dispose();
            resolve(finalText);
          }
        });

        const timeoutTimer = setTimeout(() => {
          if (!settled) {
            settled = true;
            abortCtrl.abort();
            dispose();
            reject(new Error('Agent 执行回复超时 (超过 3 分钟)'));
          }
        }, 180000);

        const promptPayload = {
          sessionId,
          requestId: `auto_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          mode: 'queue',
          content: [{ type: 'text', text: finalPrompt }],
        };

        controller
          .prompt(promptPayload, abortCtrl.signal)
          .catch((promptErr: unknown) => {
            if (!settled) {
              settled = true;
              clearTimeout(timeoutTimer);
              dispose();
              reject(promptErr);
            }
          });
      });

      // 多渠道分发与推送
      const pushResults: string[] = [];
      const connectors = task.connectors || [];

      // 1. 飞书
      if (connectors.includes('lark')) {
        try {
          const res = await feishuService.sendMessage({ content: output });
          pushResults.push(res.success ? '飞书 (成功)' : '飞书 (发送失败)');
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e);
          pushResults.push(`飞书 (异常: ${errMsg})`);
        }
      }

      // 2. 企业微信
      if (connectors.includes('wecom')) {
        try {
          const res = await wecomService.sendMessage({ content: output });
          pushResults.push(res.success ? '企微 (成功)' : '企微 (发送失败)');
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e);
          pushResults.push(`企微 (异常: ${errMsg})`);
        }
      }

      // 3. 微信助理 / 微信小程序
      if (connectors.includes('weixin')) {
        try {
          const res = await weixinConnector.sendMessage({ content: output });
          pushResults.push(res.success ? '微信 (成功)' : '微信 (发送失败)');
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e);
          pushResults.push(`微信 (异常: ${errMsg})`);
        }
      }

      // 4. 钉钉
      if (connectors.includes('dingtalk')) {
        try {
          const res = await dingtalkTunnelService.sendMessage({
            content: output,
            title: task.name,
          });
          pushResults.push(res.success ? '钉钉 (成功)' : '钉钉 (发送失败)');
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e);
          pushResults.push(`钉钉 (异常: ${errMsg})`);
        }
      }

      finalStatus = 'success';
      resultMessage =
        pushResults.length > 0
          ? `执行成功，已推送至: ${pushResults.join('; ')}`
          : '执行成功，未选择外部推送渠道';
    } catch (err: unknown) {
      finalStatus = 'failed';
      resultMessage = `执行失败: ${err instanceof Error ? err.message : String(err)}`;
    }
    this.runningTaskIds.delete(task.id);

    const durationMs = Date.now() - startTime;
    const duration = formatDuration(durationMs);

    automationStorage.updateHistory(recordId, {
      status: finalStatus,
      duration,
      durationMs,
      message: resultMessage,
      output: output || undefined,
    });

    automationStorage.updateTaskRunStatus(task.id, finalStatus, startTime);

    if (task.frequencyType === 'once') {
      try {
        automationStorage.toggleTask(task.id, false);
      } catch (err) {
        console.error(
          `[AutomationScheduler] 单次任务关闭失败 (${task.id}):`,
          err
        );
      }
    }

    return {
      ...initialRecord,
      status: finalStatus,
      duration,
      durationMs,
      message: resultMessage,
      output: output || undefined,
    };
  }
}

export const automationSchedulerService = new AutomationSchedulerService();
