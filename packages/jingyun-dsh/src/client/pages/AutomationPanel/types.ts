export type FrequencyType = 'cycle' | 'interval' | 'once';

export interface FrequencyConfig {
  cycleType?: 'everyday' | 'everyweek' | 'everymonth';
  cycleDay?: number;
  cycleTime?: string;
  intervalValue?: number;
  intervalUnit?: 'minute' | 'hour';
  onceTime?: string;
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
  frequencyDetail: string;
  frequencyConfig?: FrequencyConfig;
  startDate?: string;
  endDate?: string;
  enabled: boolean;
  createdAt?: number;
  updatedAt?: number;
  lastRunAt?: number;
  lastStatus?: 'success' | 'failed' | 'running';
}

export interface HistoryRecord {
  id: string;
  taskId: string;
  taskName: string;
  time: string;
  timestamp?: number;
  status: 'success' | 'failed' | 'running';
  duration: string;
  durationMs?: number;
  message: string;
  output?: string;
}
