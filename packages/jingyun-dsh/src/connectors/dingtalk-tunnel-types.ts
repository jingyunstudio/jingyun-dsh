export type DingtalkTunnelStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface DingtalkTunnelConfig {
  appKey: string;
  appSecret: string;
  robotCode?: string;
  requireMention?: boolean;
  lastChatId?: string;
  lastChatType?: 'p2p' | 'group';
  lastSenderId?: string;
  lastSessionWebhook?: string;
  lastSessionWebhookExpiredTime?: number;
  updatedAt?: number;
}

export interface DingtalkTunnelState {
  status: DingtalkTunnelStatus;
  appKey?: string;
  robotCode?: string;
  connectedAt?: number;
  lastError?: string;
  hasConfig: boolean;
  requireMention: boolean;
  hasSessionWebhook: boolean;
  hasChat: boolean;
}

export interface DingtalkMediaFile {
  type: 'image' | 'file' | 'audio' | 'video';
  localPath: string;
  fileName: string;
}

export interface DingtalkInboundMessage {
  messageId: string;
  conversationId: string;
  conversationType: '1' | '2'; // '1': p2p, '2': group
  senderId: string;
  senderNick: string;
  sessionWebhook: string;
  sessionWebhookExpiredTime?: number;
  isInAtList?: boolean;
  text: string;
  mediaFiles: DingtalkMediaFile[];
  raw: Record<string, unknown>;
}

export interface DingtalkReplyContext {
  messageId: string;
  sessionWebhook: string;
  timestamp: number;
}
