/**
 * 飞书远程通道类型定义 (Feishu Remote Channel Types)
 */

export type FeishuStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  encryptKey?: string;
  verificationToken?: string;
  domain?: 'feishu' | 'lark';
  customHost?: string;
  requireMention?: boolean;
  lastChatId?: string;
  lastChatType?: 'p2p' | 'group';
}

export interface FeishuBotInfo {
  app_name?: string;
  open_id?: string;
  avatar_url?: string;
}

export interface FeishuState {
  status: FeishuStatus;
  botId?: string;
  botName?: string;
  botOpenId?: string;
  botAvatar?: string;
  domain?: 'feishu' | 'lark';
  connectedAt?: number;
  lastError?: string;
  hasConfig?: boolean;
  appId?: string;
  customHost?: string;
  requireMention?: boolean;
  lastChatId?: string;
  lastChatType?: 'p2p' | 'group';
}

export interface FeishuReplyContext {
  chatId: string;
  messageId: string;
  threadId?: string;
  chatType: 'p2p' | 'group';
  reactionId?: string | null;
  cardId?: string | null;
  timestamp: number;
}

export interface FeishuInboundSender {
  sender_id?: {
    open_id?: string;
    user_id?: string;
    union_id?: string;
  };
  sender_type?: string;
}

export interface FeishuInboundMention {
  key: string;
  id?: {
    open_id?: string;
    user_id?: string;
  };
  name?: string;
  tenant_key?: string;
}

export interface FeishuInboundMessage {
  message_id: string;
  root_id?: string;
  parent_id?: string;
  create_time: string;
  chat_id: string;
  chat_type: 'p2p' | 'group';
  message_type: string;
  content: string;
  mentions?: FeishuInboundMention[];
}

export interface FeishuInboundData {
  sender: FeishuInboundSender;
  message: FeishuInboundMessage;
}

export interface FeishuResourceSegment {
  type: 'image' | 'file';
  fileKey: string;
  fileName?: string;
  mimeType?: string;
}

export type FeishuSegment =
  | { type: 'text'; text: string }
  | { type: 'resource'; resource: FeishuResourceSegment };

export interface FeishuConvertedContent {
  segments: FeishuSegment[];
}

export const RECOMMENDED_FEISHU_SCOPES = {
  scopes: {
    tenant: [
      'contact:contact.base:readonly',
      'docx:document:readonly',
      'im:chat:read',
      'im:chat:update',
      'im:message.group_at_msg:readonly',
      'im:message.p2p_msg:readonly',
      'im:message.pins:read',
      'im:message.pins:write_only',
      'im:message.reactions:read',
      'im:message.reactions:write_only',
      'im:message:readonly',
      'im:message:recall',
      'im:message:send_as_bot',
      'im:message:send_multi_users',
      'im:message:send_sys_msg',
      'im:message:update',
      'im:resource',
      'application:application:self_manage',
      'cardkit:card:write',
      'cardkit:card:read',
    ],
    user: [
      'contact:user.employee_id:readonly',
      'offline_access',
      'base:app:copy',
      'base:field:create',
      'base:field:delete',
      'base:field:read',
      'base:field:update',
      'base:record:create',
      'base:record:delete',
      'base:record:retrieve',
      'base:record:update',
      'base:table:create',
      'base:table:delete',
      'base:table:read',
      'base:table:update',
      'base:view:read',
      'base:view:write_only',
      'base:app:create',
      'base:app:update',
      'base:app:read',
      'board:whiteboard:node:create',
      'board:whiteboard:node:read',
      'calendar:calendar:read',
      'calendar:calendar.event:create',
      'calendar:calendar.event:delete',
      'calendar:calendar.event:read',
      'calendar:calendar.event:reply',
      'calendar:calendar.event:update',
      'calendar:calendar.free_busy:read',
      'contact:contact.base:readonly',
      'contact:user.base:readonly',
      'contact:user:search',
      'docs:document.comment:create',
      'docs:document.comment:read',
      'docs:document.comment:update',
      'docs:document.media:download',
      'docs:document:copy',
      'docx:document:create',
      'docx:document:readonly',
      'docx:document:write_only',
      'drive:drive.metadata:readonly',
      'drive:file:download',
      'drive:file:upload',
      'im:chat.members:read',
      'im:chat:read',
      'im:message',
      'im:message.group_msg:get_as_user',
      'im:message.p2p_msg:get_as_user',
      'im:message:readonly',
      'search:docs:read',
      'search:message',
      'space:document:delete',
      'space:document:move',
      'space:document:retrieve',
      'task:comment:read',
      'task:comment:write',
      'task:task:read',
      'task:task:write',
      'task:task:writeonly',
      'task:tasklist:read',
      'task:tasklist:write',
      'wiki:node:copy',
      'wiki:node:create',
      'wiki:node:move',
      'wiki:node:read',
      'wiki:node:retrieve',
      'wiki:space:read',
      'wiki:space:retrieve',
      'wiki:space:write_only',
    ],
  },
};

export const RECOMMENDED_FEISHU_SCOPES_JSON = JSON.stringify(
  RECOMMENDED_FEISHU_SCOPES,
  null,
  2
);
