export type FrequencyType = 'cycle' | 'interval' | 'once';

export type TaskStatus = 'success' | 'failed' | 'running';

export interface WorkspaceOption {
  id: string;
  name: string;
  path: string;
}

export interface FrequencyConfig {
  cycleType?: 'everyday' | 'everyweek' | 'everymonth';
  cycleDay?: number;
  cycleTime?: string; // '07:45'
  intervalValue?: number;
  intervalUnit?: 'minute' | 'hour';
  onceTime?: string; // '2026-08-26 10:00'
}

export interface AutoTask {
  id: string;
  name: string;
  workspace: string;
  prompt: string;
  connectors: string[];
  modelMode?: 'auto' | 'deepthink' | 'fast';
  skills?: string[];
  agentId?: string;
  permissionLevel?: 'full' | 'standard' | 'readonly';
  frequencyType: FrequencyType;
  frequencyDetail: string; // 例如 "每天 07:45"
  frequencyConfig?: FrequencyConfig;
  startDate?: string;
  endDate?: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  lastRunAt?: number;
  lastStatus?: TaskStatus;
}

export interface AutomationHistoryRecord {
  id: string;
  taskId: string;
  taskName: string;
  time: string; // 格式化时间字符串
  timestamp: number;
  status: TaskStatus;
  duration: string; // 例如 "4.2s"
  durationMs: number;
  message: string;
  output?: string;
}

export interface AutomationSettings {
  keepAwake: boolean;
}
