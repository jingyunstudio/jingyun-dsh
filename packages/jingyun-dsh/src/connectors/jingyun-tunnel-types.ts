export type JingyunTunnelStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface JingyunTunnelConfig {
  deviceId?: string;
  deviceName?: string;
  deviceToken?: string;
  cloudUrl?: string;
  deviceFingerprint?: string;
  enabled?: boolean;
}

export interface JingyunTunnelState {
  status: JingyunTunnelStatus;
  deviceId?: string;
  deviceName?: string;
  cloudUrl?: string;
  lastConnectedAt?: number;
  lastHeartbeatAt?: number;
  error?: string;
  proxyUrl?: string;
}

export type TunnelMessageType =
  | 'http_req'
  | 'http_res'
  | 'ws_open'
  | 'ws_msg'
  | 'ws_close'
  | 'ping'
  | 'pong';

export interface TunnelMessage {
  type: TunnelMessageType;
  id: string;
  method?: string;
  path?: string;
  status?: number;
  headers?: Record<string, string[]>;
  body?: string; // base64
  done?: boolean;
  payload_type?: number; // 1: Text, 2: Binary
}
