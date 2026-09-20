export interface WecomConfig {
  botId: string;
  botSecret: string;
  gatewayUrl?: string;
  autoReconnect?: boolean;
  authorizedUserId?: string;
  updatedAt?: number;
}

export type WecomStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WecomState {
  status: WecomStatus;
  botId?: string;
  connectedAt?: number;
  lastError?: string;
}

export interface WecomWsFrame {
  headers?: {
    req_id?: string;
  };
  errcode?: number;
  errmsg?: string;
  cmd?: string;
  body?: {
    msgid?: string;
    aibotid?: string;
    from?: {
      userid?: string;
      name?: string;
    };
    chatid?: string;
    chattype?: 'single' | 'group';
    msgtype?: 'text' | 'image' | 'voice' | 'file' | 'mixed';
    text?: { content?: string };
    image?: { url?: string; aeskey?: string };
    voice?: {
      content?: string;
      text?: string;
      recognition?: string;
      url?: string;
      aeskey?: string;
    };
    file?: { url?: string; aeskey?: string; filename?: string };
    mixed?: {
      msg_item?: Array<{
        msgtype: string;
        text?: { content?: string };
        image?: { url?: string; aeskey?: string };
        voice?: {
          content?: string;
          text?: string;
          recognition?: string;
          url?: string;
          aeskey?: string;
        };
        file?: { url?: string; aeskey?: string; filename?: string };
      }>;
    };
    event?: string;
    [key: string]: unknown;
  };
}

export interface WecomReplyContext {
  reqId?: string;
  chatId: string;
  chattype: 'single' | 'group';
  msgid: string;
  aibotid?: string;
  streamId?: string;
  timestamp: number;
}

export interface WecomQrResult {
  success: boolean;
  status: string;
  message?: string;
  botId?: string;
  botName?: string;
  bot_info?: Record<string, unknown>;
  data?: unknown;
  errcode?: number;
  errmsg?: string;
  error?: string;
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

export type WeixinBotType = 'weixin';

export type WeixinStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface WeixinBotConfig {
  enabled: boolean;
  botType: WeixinBotType;
  baseUrl: string;
  botToken?: string;
  accountId?: string;
  userId?: string;
  nickName?: string;
  autoReconnect: boolean;
  lastConnectedAt?: number;
}

export interface WeixinBotStatus {
  connected: boolean;
  status: WeixinStatus;
  accountId?: string;
  userId?: string;
  nickName?: string;
  botType: WeixinBotType;
  baseUrl?: string;
  lastSyncTime?: number;
  lastError?: string;
}

export interface WeixinQrCodeResult {
  qrcode: string;
  qrUrl: string;
  qrcodeImg?: string;
  botType: WeixinBotType;
  expiredAt?: number;
}

export interface WeixinQrPollResult {
  status: 'wait' | 'scaned' | 'confirmed' | 'expired';
  botToken?: string;
  accountId?: string;
  userId?: string;
  nickName?: string;
  baseUrl?: string;
  connected?: boolean;
  message?: string;
}
