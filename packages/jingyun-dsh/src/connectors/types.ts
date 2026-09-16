export interface WecomConfig {
  botId: string;
  botSecret: string;
  gatewayUrl?: string;
  autoReconnect?: boolean;
}

export type WecomStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WecomState {
  status: WecomStatus;
  botId?: string;
  connectedAt?: number;
  lastError?: string;
}

export interface DingtalkConfig {
  appKey?: string;
  appSecret?: string;
  robotCode?: string;
  corpId?: string;
  userId?: string;
  userName?: string;
  updatedAt?: number;
}

export type DingtalkStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface DingtalkState {
  status: DingtalkStatus;
  hasConfig?: boolean;
  appKey?: string;
  robotCode?: string;
  corpId?: string;
  userId?: string;
  userName?: string;
  connectedAt?: number;
  lastError?: string;
}

export interface LarkAuthStatus {
  status?: string;
  appId?: string;
  error?: string;
  [key: string]: unknown;
}

export interface LarkAuthStartResult {
  mode: 'init' | 'login';
  verification_url: string;
  device_code: string;
}

export interface CliToolStatus {
  installed: boolean;
  installing?: boolean;
  version?: string;
  command?: string;
  error?: string;
}

export interface DingtalkAuthStatus {
  authenticated: boolean;
  userId?: string;
  userName?: string;
  corpId?: string;
  corpName?: string;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export interface AllCliStatus {
  wecom: CliToolStatus;
  lark: CliToolStatus;
  dingtalk?: CliToolStatus;
  npmAvailable: boolean;
  npmPath?: string;
}

export interface ImaConfig {
  apiKey?: string;
  clientId?: string;
  apiBase?: string;
  defaultKbId?: string;
  nickname?: string;
  avatar?: string;
  validTime?: number;
  boundAt?: number;
}

export type ImaStatus = 'disconnected' | 'connected';

export interface ImaState {
  status: ImaStatus;
  apiKeyMasked?: string;
  clientId?: string;
  nickname?: string;
  avatar?: string;
  defaultKbId?: string;
  validTime?: number;
  boundAt?: number;
  hasConfig?: boolean;
  lastError?: string;
}
