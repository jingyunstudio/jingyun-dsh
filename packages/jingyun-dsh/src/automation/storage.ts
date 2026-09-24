import fs from 'fs';
import path from 'path';

import {
  getAutomationDir,
  getAutomationWorkspaceDir,
  getDshHome,
} from '../common/paths';
import type {
  AutomationHistoryRecord,
  AutomationSettings,
  AutoTask,
  TaskStatus,
  WorkspaceOption,
} from './types';

const MAX_HISTORY_ITEMS = 200;

const DEFAULT_SETTINGS: AutomationSettings = {
  keepAwake: false,
};

export class AutomationStorage {
  private baseDir: string;
  private tasksFile: string;
  private historyFile: string;
  private settingsFile: string;

  constructor() {
    this.baseDir = getAutomationDir();
    this.tasksFile = path.join(this.baseDir, 'tasks.json');
    this.historyFile = path.join(this.baseDir, 'history.json');
    this.settingsFile = path.join(this.baseDir, 'settings.json');
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private writeJsonAtomic(filePath: string, data: unknown): void {
    this.ensureDir();
    const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, jsonStr, 'utf-8');
    fs.renameSync(tempPath, filePath);
  }

  public getTasks(): AutoTask[] {
    this.ensureDir();
    if (!fs.existsSync(this.tasksFile)) {
      this.writeJsonAtomic(this.tasksFile, []);
      return [];
    }
    const content = fs.readFileSync(this.tasksFile, 'utf-8');
    const tasks = JSON.parse(content);
    if (!Array.isArray(tasks)) {
      throw new Error(
        `[AutomationStorage] Invalid tasks format in ${this.tasksFile}: expected array`
      );
    }
    return tasks as AutoTask[];
  }

  public getTask(id: string): AutoTask | undefined {
    const tasks = this.getTasks();
    return tasks.find((t) => t.id === id);
  }

  public saveTask(task: AutoTask): AutoTask {
    const tasks = this.getTasks();
    const index = tasks.findIndex((t) => t.id === task.id);
    const now = Date.now();

    const normalizedTask: AutoTask = {
      ...task,
      updatedAt: now,
      createdAt: task.createdAt || now,
    };

    if (index >= 0) {
      tasks[index] = normalizedTask;
    } else {
      tasks.unshift(normalizedTask);
    }

    this.writeJsonAtomic(this.tasksFile, tasks);
    return normalizedTask;
  }

  public deleteTask(id: string): boolean {
    const tasks = this.getTasks();
    const filtered = tasks.filter((t) => t.id !== id);
    if (filtered.length === tasks.length) {
      return false;
    }
    this.writeJsonAtomic(this.tasksFile, filtered);
    return true;
  }

  public toggleTask(id: string, enabled?: boolean): AutoTask {
    const tasks = this.getTasks();
    const target = tasks.find((t) => t.id === id);
    if (!target) {
      throw new Error(`Automation task not found: ${id}`);
    }
    target.enabled = typeof enabled === 'boolean' ? enabled : !target.enabled;
    target.updatedAt = Date.now();
    this.writeJsonAtomic(this.tasksFile, tasks);
    return target;
  }

  public updateTaskRunStatus(
    id: string,
    status: TaskStatus,
    lastRunAt: number
  ): void {
    const tasks = this.getTasks();
    const target = tasks.find((t) => t.id === id);
    if (target) {
      target.lastStatus = status;
      target.lastRunAt = lastRunAt;
      target.updatedAt = Date.now();
      this.writeJsonAtomic(this.tasksFile, tasks);
    }
  }

  public getHistory(): AutomationHistoryRecord[] {
    this.ensureDir();
    if (!fs.existsSync(this.historyFile)) {
      return [];
    }
    const content = fs.readFileSync(this.historyFile, 'utf-8');
    return JSON.parse(content) as AutomationHistoryRecord[];
  }

  public addHistory(record: AutomationHistoryRecord): void {
    const history = this.getHistory();
    history.unshift(record);
    if (history.length > MAX_HISTORY_ITEMS) {
      history.length = MAX_HISTORY_ITEMS;
    }
    this.writeJsonAtomic(this.historyFile, history);
  }

  public updateHistory(
    id: string,
    updates: Partial<AutomationHistoryRecord>
  ): void {
    const history = this.getHistory();
    const item = history.find((h) => h.id === id);
    if (item) {
      Object.assign(item, updates);
      this.writeJsonAtomic(this.historyFile, history);
    }
  }

  public clearHistory(): void {
    this.writeJsonAtomic(this.historyFile, []);
  }

  public getSettings(): AutomationSettings {
    this.ensureDir();
    if (!fs.existsSync(this.settingsFile)) {
      this.writeJsonAtomic(this.settingsFile, DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    }
    const content = fs.readFileSync(this.settingsFile, 'utf-8');
    return JSON.parse(content) as AutomationSettings;
  }

  public saveSettings(
    settings: Partial<AutomationSettings>
  ): AutomationSettings {
    const current = this.getSettings();
    const updated: AutomationSettings = {
      ...current,
      ...settings,
    };
    this.writeJsonAtomic(this.settingsFile, updated);
    return updated;
  }
}

export const automationStorage = new AutomationStorage();

export function listAvailableWorkspaces(): WorkspaceOption[] {
  const autoPath = path.resolve(getAutomationWorkspaceDir());
  const list: WorkspaceOption[] = [
    { id: 'automation', name: '自动化工作区 (默认)', path: autoPath },
  ];
  const wsFile = path.join(getDshHome(), 'storages', 'workspace.json');
  if (!fs.existsSync(wsFile)) {
    return list;
  }

  const content = fs.readFileSync(wsFile, 'utf8');
  const data = JSON.parse(content);
  const rows = data?.tables?.workspaces;
  if (!rows || typeof rows !== 'object') {
    return list;
  }

  for (const [id, entry] of Object.entries<Record<string, unknown>>(rows)) {
    if (typeof entry?.path === 'string') {
      const p = path.resolve(entry.path);
      if (p !== autoPath) {
        const name = String(entry.name || entry.title || id);
        list.push({ id, name, path: p });
      }
    }
  }
  return list;
}
