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
