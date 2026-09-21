import { QRCodeSVG } from 'qrcode.react';
import React, { useState, useEffect, useRef } from 'react';

import type { WeixinBotStatus } from '../../../connectors/types';
import { showToast } from '../../components/BrandBranding';
import { sendPromptToComposer } from '../../dom-helper';
import {
  ConnectorDetailModal,
  DEFAULT_DINGTALK_SUGGESTIONS,
  DEFAULT_LARK_SUGGESTIONS,
  DEFAULT_WECOM_SUGGESTIONS,
  UnbindIcon,
} from './ConnectorDetailModal';
import { DingtalkTunnelModal } from './DingtalkTunnelModal';
import { FeishuModal } from './FeishuModal';
import { ImaCatLogo, ImaConnectorModal } from './ImaConnectorModal';
import { WecomModal } from './WecomModal';
import { WeixinModal } from './WeixinModal';
const openExternalUrl = (target: string) => {
  if (!target) return;
  try {
    const winWithTauri =
      typeof window !== 'undefined'
        ? (window as Window & {
            __TAURI__?: {
              opener?: { openUrl: (url: string) => Promise<void> };
              core?: {
                invoke: (
                  cmd: string,
                  args?: Record<string, unknown>
                ) => Promise<unknown>;
              };
            };
          })
        : undefined;
    const tauri = winWithTauri?.__TAURI__;
    if (tauri?.opener?.openUrl) {
      tauri.opener.openUrl(target).catch(() => {
        window.open(target, '_blank', 'noopener,noreferrer');
      });
      return;
    }
    if (tauri?.core?.invoke) {
      tauri.core
        .invoke('plugin:opener|open_url', {
          rule: { type: 'open', url: target },
        })
        .catch(() => {
          window.open(target, '_blank', 'noopener,noreferrer');
        });
      return;
    }
  } catch {}
  if (typeof window !== 'undefined') {
    window.open(target, '_blank', 'noopener,noreferrer');
  }
};
export type ConnectorChannel = 'lark' | 'dingtalk' | 'wecom';

export interface ConnectorInfo {
  name: string;
  cliName: string;
  pkg: string;
  primaryColor: string;
  authSuccessDesc: string;
}

export const CONNECTOR_MAP: Record<ConnectorChannel, ConnectorInfo> = {
  lark: {
    name: '飞书',
    cliName: '飞书 CLI',
    pkg: '@larksuite/cli',
    primaryColor: '#3370FF',
    authSuccessDesc: '已安全绑定至您的飞书账号。',
  },
  dingtalk: {
    name: '钉钉',
    cliName: '钉钉 CLI',
    pkg: 'dingtalk-workspace-cli',
    primaryColor: '#007FFF',
    authSuccessDesc: '已安全授权至您的钉钉账号。',
  },
  wecom: {
    name: '企业微信',
    cliName: '企业微信 CLI',
    pkg: '@wecom/cli',
    primaryColor: '#2563EB',
    authSuccessDesc: '已安全绑定至您的企业微信。',
  },
};

export const getConnectorInfo = (channel: string): ConnectorInfo => {
  if (channel === 'lark' || channel === 'dingtalk' || channel === 'wecom') {
    return CONNECTOR_MAP[channel];
  }
  return {
    name: channel || '连接器',
    cliName: `${channel || '连接器'} CLI`,
    pkg: channel || 'connector-cli',
    primaryColor: '#3b82f6',
    authSuccessDesc: '已完成授权。',
  };
};

// 飞书 SVG 图标
const FeishuLogo = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M24 4C12.95 4 4 12.95 4 24C4 35.05 12.95 44 24 44C35.05 44 44 35.05 44 24C44 12.95 35.05 4 24 4ZM28.59 29.83L24 34.42L19.41 29.83C15.82 26.24 15.82 20.41 19.41 16.82C23 13.23 28.83 13.23 32.42 16.82C36.01 20.41 36.01 26.24 32.42 29.83H28.59ZM24 24C25.1 24 26 23.1 26 22C26 20.9 25.1 20 24 20C22.9 20 22 20.9 22 22C22 23.1 22.9 24 24 24Z"
      fill="#3370FF"
    />
  </svg>
);

// 钉钉 SVG 图标
const DingtalkLogo = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M24 4C12.95 4 4 12.95 4 24C4 35.05 12.95 44 24 44C35.05 44 44 35.05 44 24C44 12.95 35.05 4 24 4ZM31.95 19.48C30.93 23.63 26.35 29.02 20.17 31.79C19.34 32.16 18.52 31.42 18.78 30.56C19.78 27.27 21.6 23.27 22.58 19.72C22.75 19.11 22.37 18.54 21.75 18.66C18.64 19.26 14.88 20.69 11.95 22.25C11.39 22.55 10.74 21.99 11.08 21.46C13.88 17.15 19.26 11.59 25.96 9.43C26.78 9.16 27.53 9.94 27.23 10.76C26.06 13.98 24.32 18.12 23.41 21.43C23.24 22.04 23.63 22.61 24.25 22.49C27.35 21.89 31.11 20.46 34.04 18.9C34.6 18.6 35.25 19.16 34.91 19.69C34.25 20.7 33.15 22.25 31.95 19.48Z"
      fill="#007FFF"
      fillOpacity="0.6"
    />
  </svg>
);

// 企业微信 SVG 图标
const WechatWorkLogo = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M24 4C12.95 4 4 12.95 4 24C4 35.05 12.95 44 24 44C35.05 44 44 35.05 44 24C44 12.95 35.05 4 24 4ZM28.5 28.5C28.5 29.33 27.83 30 27 30H21C20.17 30 19.5 29.33 19.5 28.5V25.5H16.5C15.67 25.5 15 24.83 15 24C15 23.17 15.67 22.5 16.5 22.5H19.5V19.5C19.5 18.67 20.17 18 21 18H27C27.83 18 28.5 18.67 28.5 19.5V22.5H31.5C32.33 22.5 33 23.17 33 24C33 24.83 32.33 25.5 31.5 25.5H28.5V28.5Z"
      fill="#1875F0"
      fillOpacity="0.6"
    />
  </svg>
);

// 微信官方绿色 SVG 图标
const WeixinLogo = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="24" height="24" rx="6" fill="#07C160" fillOpacity="0.12" />
    <path
      d="M9.5 4.5C5.91 4.5 3 7.02 3 10.13c0 1.74.91 3.32 2.34 4.36l-.59 1.77a.4.4 0 00.51.5l2.1-.7c.66.2 1.36.32 2.1.32.3 0 .59-.02.88-.05-.18-.53-.29-1.09-.29-1.68 0-3 2.82-5.44 6.31-5.44.3 0 .59.02.87.06C16.63 6.56 13.39 4.5 9.5 4.5z"
      fill="#07C160"
    />
    <path
      d="M15.5 10.13c-3.12 0-5.65 2.14-5.65 4.77 0 1.43.73 2.71 1.89 3.58l-.47 1.42a.35.35 0 00.44.43l1.69-.56c.63.22 1.33.34 2.1.34 3.12 0 5.65-2.14 5.65-4.77s-2.53-4.77-5.65-4.77z"
      fill="#07C160"
    />
    <circle cx="7.3" cy="8.4" r="0.85" fill="#FFFFFF" />
    <circle cx="11.2" cy="8.4" r="0.85" fill="#FFFFFF" />
    <circle cx="13.8" cy="14" r="0.75" fill="#FFFFFF" />
    <circle cx="17.2" cy="14" r="0.75" fill="#FFFFFF" />
  </svg>
);

type ConnectorCategory = 'channels' | 'remote_tunnel';

interface ConnectorCardProps {
  name: string;
  badgeText?: string;
  icon: React.ReactNode;
  description: string;
  titleTooltip?: string;
  isConnected: boolean;
  isLoading?: boolean;
  statusBadge?: React.ReactNode;
  onConnect: () => void;
  onManage: () => void;
}

const ConnectorCard: React.FC<ConnectorCardProps> = ({
  name,
  badgeText,
  icon,
  description,
  titleTooltip,
  isConnected,
  isLoading,
  statusBadge,
  onConnect,
  onManage,
}) => (
  <div
    className="jy-connector-card"
    onClick={() => {
      if (isLoading) return;
      if (isConnected) {
        onManage();
      } else {
        onConnect();
      }
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '14px 18px',
      borderRadius: '12px',
      border:
        '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
      background:
        'var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-card, #ffffff))',
      boxSizing: 'border-box',
      cursor: isLoading ? 'default' : 'pointer',
      height: '80px',
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    }}
  >
    {/* Logo 容器 */}
    <div
      className="jy-card-icon-box"
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        background:
          'var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-card-hover, #f8fafc))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border:
          '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
        flexShrink: 0,
      }}
    >
      {icon}
    </div>

    {/* 中间描述信息 (标题 & 单行描述) */}
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--dsw-alias-label-primary, #0f172a)',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </h3>

        {badgeText && (
          <span
            className="jy-badge-gray"
            style={{
              fontSize: '10px',
              color: 'var(--dsw-alias-label-tertiary, #64748b)',
              background:
                'var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-card-hover, #f1f5f9))',
              padding: '1px 6px',
              borderRadius: '4px',
            }}
          >
            {badgeText}
          </span>
        )}

        {isConnected && statusBadge}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: '11.5px',
          color: 'var(--dsw-alias-label-secondary, #64748b)',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
        title={titleTooltip || description}
      >
        {description}
      </p>
    </div>

    {/* 右侧 Action (胶囊按钮) */}
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ flexShrink: 0, marginLeft: '4px' }}
    >
      {isConnected ? (
        <button
          type="button"
          className="jy-btn-secondary"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onManage();
          }}
          style={{
            height: '28px',
            padding: '0 14px',
            borderRadius: '9999px',
            border:
              '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
            background:
              'var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-card, #ffffff))',
            color: 'var(--dsw-alias-label-primary, #0f172a)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          管理
        </button>
      ) : (
        <button
          type="button"
          className="jy-btn-primary"
          disabled={isLoading}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!isLoading) onConnect();
          }}
          style={{
            height: '28px',
            padding: '0 14px',
            borderRadius: '9999px',
            border: 'none',
            background: 'var(--dsw-alias-bg-button-primary, #0f172a)',
            color: 'var(--dsw-alias-label-inverse, #ffffff)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.45 : 1,
            pointerEvents: isLoading ? 'none' : 'auto',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.opacity = '0.9';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.opacity = '1';
            }
          }}
        >
          ＋ 连接
        </button>
      )}
    </div>
  </div>
);

export const ConnectorPanel = () => {
  const [activeCategory, setActiveCategory] =
    useState<ConnectorCategory>('channels');
  const [larkStatus, setLarkStatus] = useState<any>(null);
  const [wecomStatus, setWecomStatus] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showWecomModal, setShowWecomModal] = useState(false);
  const [showWecomDetailModal, setShowWecomDetailModal] = useState(false);
  const [showWecomAssistantModal, setShowWecomAssistantModal] = useState(false);
  const [dingtalkStatus, setDingtalkStatus] = useState<any>(null);
  const [larkLoading, setLarkLoading] = useState(true);
  const [wecomLoading, setWecomLoading] = useState(true);
  const [dingtalkLoading, setDingtalkLoading] = useState(true);
  const [cliStatus, setCliStatus] = useState<
    Record<string, { installed: boolean; installing?: boolean }>
  >({});

  const fetchCliStatus = async () => {
    try {
      const res = await fetch('/api/jingyun/connectors/cli/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCliStatus(json.data);
        }
      }
    } catch {}
  };
  const [showDingtalkModal, setShowDingtalkModal] = useState(false);
  const [showDingtalkDetailModal, setShowDingtalkDetailModal] = useState(false);
  const [imaStatus, setImaStatus] = useState<any>(null);
  const [imaLoading, setImaLoading] = useState(true);
  const [showImaModal, setShowImaModal] = useState(false);
  const [showImaDetailModal, setShowImaDetailModal] = useState(false);
  const [weixinStatus, setWeixinStatus] = useState<WeixinBotStatus | null>(
    null
  );
  const [weixinLoading, setWeixinLoading] = useState(true);
  const [showWeixinModal, setShowWeixinModal] = useState(false);
  const [feishuTunnelStatus, setFeishuTunnelStatus] = useState<{
    status: string;
    botName?: string;
    appId?: string;
  } | null>(null);
  const [feishuTunnelLoading, setFeishuTunnelLoading] = useState(true);
  const [showFeishuTunnelModal, setShowFeishuTunnelModal] = useState(false);
  const [dingtalkTunnelStatus, setDingtalkTunnelStatus] = useState<{
    status: string;
    appKey?: string;
  } | null>(null);
  const [dingtalkTunnelLoading, setDingtalkTunnelLoading] = useState(true);
  const [showDingtalkTunnelModal, setShowDingtalkTunnelModal] = useState(false);
  const [confirmInstallChannel, setConfirmInstallChannel] = useState<
    'lark' | 'dingtalk' | 'wecom' | null
  >(null);

  const handleConnect = async (channel: 'lark' | 'dingtalk' | 'wecom') => {
    let isInstalled = cliStatus?.[channel]?.installed;
    if (isInstalled === undefined) {
      try {
        const res = await fetch('/api/jingyun/connectors/cli/status');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setCliStatus(json.data);
            isInstalled = json.data?.[channel]?.installed;
          }
        }
      } catch {}
    }

    if (isInstalled) {
      if (channel === 'lark') setShowAuthModal(true);
      if (channel === 'dingtalk') setShowDingtalkModal(true);
      if (channel === 'wecom') setShowWecomModal(true);
    } else {
      setConfirmInstallChannel(channel);
    }
  };

  const handleConfirmInstall = () => {
    const channel = confirmInstallChannel;
    setConfirmInstallChannel(null);
    if (channel === 'lark') {
      setShowAuthModal(true);
    } else if (channel === 'dingtalk') {
      setShowDingtalkModal(true);
    } else if (channel === 'wecom') {
      setShowWecomModal(true);
    }
  };

  const handleNewChatWithPrompt = (promptText: string) => {
    try {
      sendPromptToComposer(promptText);
      setShowDetailModal(false);
    } catch (e) {
      console.error(
        '[ConnectorPanel] Failed to route new chat with prompt:',
        e
      );
    }
  };

  const handleSendPrompt = (text: string) => {
    handleNewChatWithPrompt(text);
  };

  const handleTryIt = (channel: string = 'lark') => {
    // 随机选择一个推荐提示词进行填充，带入新会话中
    const list =
      channel === 'ima'
        ? [
            { text: '从我的 ima 知识库里找出去年的竞品调研结论' },
            { text: '把这几个链接都存进我的知识库' },
            { text: '把我知识库里那篇产品方案的要点讲给我听' },
          ]
        : channel === 'wecom'
          ? DEFAULT_WECOM_SUGGESTIONS
          : channel === 'dingtalk'
            ? DEFAULT_DINGTALK_SUGGESTIONS
            : DEFAULT_LARK_SUGGESTIONS;
    const randomIndex = Math.floor(Math.random() * list.length);
    const randomPrompt = list[randomIndex]?.text || '';
    handleNewChatWithPrompt(randomPrompt);
  };

  // 获取飞书连接状态
  const fetchLarkStatus = async () => {
    setLarkLoading(true);
    try {
      const res = await fetch('/api/jingyun/connectors/lark/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setLarkStatus(json.data);
        }
      }
    } catch (err) {
      console.error('[ConnectorPanel] Failed to fetch lark status:', err);
    } finally {
      setLarkLoading(false);
    }
  };

  // 解绑飞书
  const handleDisconnect = async () => {
    if (
      !confirm(
        '确定要解绑飞书吗？解绑后将清除本地配置与凭据，相关的飞书智能体能力将无法使用。'
      )
    )
      return;
    try {
      const res = await fetch('/api/jingyun/connectors/lark/auth-logout', {
        method: 'POST',
      });
      if (res.ok) {
        setLarkStatus({ status: 'needs_login' });
        await fetchLarkStatus();
      }
    } catch (err) {
      console.error('[ConnectorPanel] Failed to disconnect lark:', err);
    }
  };

  // 获取企业微信连接状态
  const fetchWecomStatus = async () => {
    setWecomLoading(true);
    try {
      const res = await fetch('/api/jingyun/connectors/wecom/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setWecomStatus(json.data);
        }
      }
    } catch (err) {
      console.error('[ConnectorPanel] Failed to fetch wecom status:', err);
    } finally {
      setWecomLoading(false);
    }
  };

  // 获取钉钉连接状态
  const fetchDingtalkStatus = async () => {
    setDingtalkLoading(true);
    try {
      const res = await fetch('/api/jingyun/connectors/dingtalk/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setDingtalkStatus(json.data);
        }
      }
    } catch (err) {
      console.error('[ConnectorPanel] Failed to fetch dingtalk status:', err);
    } finally {
      setDingtalkLoading(false);
    }
  };

  // 解绑企业微信
  const handleWecomDisconnect = async () => {
    if (
      !confirm(
        '确定要解绑企业微信吗？解绑后将清除本地配置，相关的企业微信智能体能力将无法使用。'
      )
    )
      return;
    try {
      const res = await fetch('/api/jingyun/connectors/wecom/clear', {
        method: 'POST',
      });
      if (res.ok) {
        setWecomStatus({ status: 'disconnected' });
        await fetchWecomStatus();
      }
    } catch (err) {
      console.error('[ConnectorPanel] Failed to disconnect wecom:', err);
    }
  };

  // 解绑钉钉
  const handleDingtalkDisconnect = async () => {
    if (
      !confirm(
        '确定要解除钉钉账号授权吗？解除后将退出当前钉钉工作区登录，相关的钉钉智能体能力将无法使用。'
      )
    )
      return;
    try {
      const res = await fetch('/api/jingyun/connectors/dingtalk/clear', {
        method: 'POST',
      });
      if (res.ok) {
        setDingtalkStatus({ status: 'disconnected' });
        await fetchDingtalkStatus();
        fetchCliStatus();
      }
    } catch (err) {
      console.error('[ConnectorPanel] Failed to disconnect dingtalk:', err);
    }
  };
  // 获取 ima 连接状态
  const fetchImaStatus = async () => {
    setImaLoading(true);
    try {
      const res = await fetch('/api/jingyun/connectors/ima/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setImaStatus(json.data);
        }
      }
    } catch (err) {
      console.error('[ConnectorPanel] Failed to fetch ima status:', err);
    } finally {
      setImaLoading(false);
    }
  };
  const handleImaDisconnect = async () => {
    try {
      const res = await fetch('/api/jingyun/connectors/ima/disconnect', {
        method: 'POST',
      });
      if (res.ok) {
        showToast('已断开腾讯 ima 知识库连接');
        fetchImaStatus();
      }
    } catch {
      showToast('断开连接失败');
    }
  };
  // 获取微信助理连接状态
  const fetchWeixinStatus = async () => {
    setWeixinLoading(true);
    try {
      const res = await fetch('/api/jingyun/connectors/weixin/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setWeixinStatus(json.data);
        }
      }
    } catch (err) {
      console.error('[ConnectorPanel] Failed to fetch weixin status:', err);
    } finally {
      setWeixinLoading(false);
    }
  };

  // 获取飞书远程通道状态
  const fetchFeishuTunnelStatus = async () => {
    setFeishuTunnelLoading(true);
    try {
      const res = await fetch('/api/jingyun/connectors/feishu/status');
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setFeishuTunnelStatus(json.data);
        }
      }
    } catch (err) {
      console.warn(
        '[ConnectorPanel] Failed to fetch feishu tunnel status:',
        err
      );
    } finally {
      setFeishuTunnelLoading(false);
    }
  };

  // 获取钉钉远程通道状态
  const fetchDingtalkTunnelStatus = async () => {
    setDingtalkTunnelLoading(true);
    try {
      const res = await fetch('/api/jingyun/connectors/dingtalk-tunnel/status');
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setDingtalkTunnelStatus(json.data);
        }
      }
    } catch (err) {
      console.warn(
        '[ConnectorPanel] Failed to fetch dingtalk tunnel status:',
        err
      );
    } finally {
      setDingtalkTunnelLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchLarkStatus();
      fetchWecomStatus();
      fetchDingtalkStatus();
      fetchImaStatus();
      fetchWeixinStatus();
      fetchFeishuTunnelStatus();
      fetchDingtalkTunnelStatus();
      fetchCliStatus();
    });
  }, []);

  const isLarkUserAuthorized = Boolean(
    larkStatus?.identities?.user?.status === 'ready' ||
    larkStatus?.identities?.user?.status === 'needs_refresh' ||
    larkStatus?.identities?.user?.available === true ||
    larkStatus?.identities?.user?.userName
  );

  const isLarkBotReady = Boolean(
    larkStatus?.appId &&
    (larkStatus?.identities?.bot?.status === 'ready' ||
      larkStatus?.identities?.bot?.available === true)
  );

  const isLarkConnected = Boolean(
    larkStatus &&
    larkStatus.status !== 'needs_login' &&
    (isLarkUserAuthorized || isLarkBotReady)
  );

  const larkAuthLevel: 'full' | 'bot_only' | 'disconnected' = isLarkConnected
    ? isLarkUserAuthorized
      ? 'full'
      : 'bot_only'
    : 'disconnected';

  const larkUser = larkStatus?.identities?.user?.userName || '';
  const larkAppId = larkStatus?.appId || '';

  const isWecomConnected = Boolean(
    (wecomStatus?.hasConfig === true || wecomStatus?.status === 'connected') &&
    (wecomStatus?.botId || wecomStatus?.config?.botId)
  );

  const wecomBotId = wecomStatus?.botId || wecomStatus?.config?.botId || '';

  const isDingtalkConnected = Boolean(
    dingtalkStatus?.status === 'connected' ||
    dingtalkStatus?.cliAuth?.authenticated === true
  );

  const dingtalkAccountTitle =
    (dingtalkStatus?.cliAuth?.corpName
      ? `${dingtalkStatus.cliAuth.corpName}${dingtalkStatus.cliAuth.userName ? ' · ' + dingtalkStatus.cliAuth.userName : ''}`
      : dingtalkStatus?.cliAuth?.userName) ||
    dingtalkStatus?.appKey ||
    '';
  const isImaConnected = Boolean(imaStatus?.status === 'connected');
  const isWeixinConnected = Boolean(weixinStatus?.connected);

  return (
    <div
      className="jy-connector-panel"
      style={{
        width: '100%',
        height: '100%',
        padding: '24px 32px',
        boxSizing: 'border-box',
        background:
          'var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-main, #ffffff))',
        color: 'var(--dsw-alias-label-primary, #0f172a)',
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      {/* 头部标题描述 */}
      <div style={{ marginBottom: '20px' }}>
        <h2
          style={{
            margin: '0 0 6px 0',
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--dsw-alias-label-primary, #0f172a)',
          }}
        >
          连接器
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: 'var(--dsw-alias-label-tertiary, #64748b)',
            lineHeight: '1.6',
          }}
        >
          {activeCategory === 'channels'
            ? '配置并绑定第三方协同办公与即时通讯渠道。绑定后，智能体将能够直接在这些渠道中与您互动，执行命令或推送通知。'
            : '配置并连接移动端或第三方即时通讯远程通道。连接后，即可随时随地远程向电脑端工作台指派任务，执行进度与结果实时双向同步。'}
        </p>
      </div>

      {/* 分类切换 Tab 栏 */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          borderBottom:
            '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveCategory('channels')}
          style={{
            padding: '8px 4px 12px 4px',
            background: 'transparent',
            border: 'none',
            borderBottom:
              activeCategory === 'channels'
                ? '2px solid var(--dsw-alias-label-primary, #0f172a)'
                : '2px solid transparent',
            color:
              activeCategory === 'channels'
                ? 'var(--dsw-alias-label-primary, #0f172a)'
                : 'var(--dsw-alias-label-tertiary, #64748b)',
            fontSize: '14px',
            fontWeight: activeCategory === 'channels' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginBottom: '-1px',
          }}
        >
          渠道
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('remote_tunnel')}
          style={{
            padding: '8px 4px 12px 4px',
            background: 'transparent',
            border: 'none',
            borderBottom:
              activeCategory === 'remote_tunnel'
                ? '2px solid var(--dsw-alias-label-primary, #0f172a)'
                : '2px solid transparent',
            color:
              activeCategory === 'remote_tunnel'
                ? 'var(--dsw-alias-label-primary, #0f172a)'
                : 'var(--dsw-alias-label-tertiary, #64748b)',
            fontSize: '14px',
            fontWeight: activeCategory === 'remote_tunnel' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginBottom: '-1px',
          }}
        >
          远程通道
        </button>
      </div>

      {activeCategory === 'channels' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            width: '100%',
          }}
        >
          <ConnectorCard
            name="飞书 (Lark)"
            icon={<FeishuLogo />}
            description="支持通过飞书账号授权，使 AI 具备读取及编辑飞书文档、发送即时聊天消息、配置任务、安排日历等多场景协同能力。"
            isConnected={isLarkConnected}
            isLoading={larkLoading}
            statusBadge={
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  color: larkAuthLevel === 'full' ? '#16a34a' : '#d97706',
                  background:
                    larkAuthLevel === 'full'
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'rgba(217, 119, 6, 0.1)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background:
                      larkAuthLevel === 'full' ? '#22c55e' : '#f59e0b',
                  }}
                />
                {larkAuthLevel === 'full'
                  ? '已完整授权'
                  : '底座就绪 · 待应用授权'}
              </span>
            }
            onConnect={() => handleConnect('lark')}
            onManage={() => setShowDetailModal(true)}
          />

          <ConnectorCard
            name="钉钉 (DingTalk)"
            icon={<DingtalkLogo />}
            description="与钉钉官方工作区生态深度集成，支持浏览器一键授权、消息收发与知识库/日程/待办协同。"
            isConnected={isDingtalkConnected}
            isLoading={dingtalkLoading}
            statusBadge={
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  color: '#16a34a',
                  background: 'rgba(34, 197, 94, 0.1)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#22c55e',
                  }}
                />
                已连接
              </span>
            }
            onConnect={() => handleConnect('dingtalk')}
            onManage={() => setShowDingtalkDetailModal(true)}
          />

          <ConnectorCard
            name="企业微信"
            icon={<WechatWorkLogo />}
            description="与企业微信智能机器人深度集成，支持 WebSocket 长连接实时消息收发与协同。"
            isConnected={isWecomConnected}
            isLoading={wecomLoading}
            statusBadge={
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  color: '#16a34a',
                  background: 'rgba(34, 197, 94, 0.1)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#22c55e',
                  }}
                />
                已连接
              </span>
            }
            onConnect={() => handleConnect('wecom')}
            onManage={() => setShowWecomDetailModal(true)}
          />

          <ConnectorCard
            name="腾讯 ima 知识库"
            icon={<ImaCatLogo size={36} />}
            description="腾讯AI知识管家，连接后支持搜索、读取和写入知识库资料，并可搜索和订阅教育、法律、财经、科技等20+行业专业知识。"
            isConnected={isImaConnected}
            isLoading={imaLoading}
            statusBadge={
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  color: '#16a34a',
                  background: 'rgba(34, 197, 94, 0.1)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#22c55e',
                  }}
                />
                已连接
              </span>
            }
            onConnect={() => setShowImaModal(true)}
            onManage={() => setShowImaDetailModal(true)}
          />
        </div>
      )}

      {activeCategory === 'remote_tunnel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '8px',
              background:
                'var(--dsw-alias-surface-subtle, rgba(0, 0, 0, 0.02))',
              border:
                '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
              fontSize: '13px',
              color: 'var(--dsw-alias-label-secondary, #475569)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="var(--dsw-alias-label-secondary, #64748b)"
                strokeWidth="2"
              />
              <path
                d="M12 8v4M12 16h.01"
                stroke="var(--dsw-alias-label-secondary, #64748b)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>
              连接远程消息通道，即可在移动端随时向工作台指派任务并执行自动化流程，结果将实时回传到对应通道会话中。在任一远程通道聊天中发送{' '}
              <code
                style={{
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background:
                    'var(--dsw-alias-surface-hover, rgba(0,0,0,0.06))',
                  fontWeight: 600,
                }}
              >
                /new
              </code>{' '}
              即可快速重置上下文并开启全新会话，发送{' '}
              <code
                style={{
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background:
                    'var(--dsw-alias-surface-hover, rgba(0,0,0,0.06))',
                  fontWeight: 600,
                }}
              >
                /help
              </code>{' '}
              可查看使用指南。
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
              width: '100%',
            }}
          >
            <ConnectorCard
              name="微信助理"
              icon={<WeixinLogo />}
              description="通过微信直接下发指令，结果实时回传至微信聊天窗口。"
              isConnected={isWeixinConnected}
              isLoading={weixinLoading}
              statusBadge={
                isWeixinConnected ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: '#16a34a',
                      background: 'rgba(34, 197, 94, 0.1)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: '#22c55e',
                      }}
                    />
                    已连接
                  </span>
                ) : undefined
              }
              onConnect={() => setShowWeixinModal(true)}
              onManage={() => setShowWeixinModal(true)}
            />
            <ConnectorCard
              name="企业微信助理"
              icon={<WechatWorkLogo />}
              description="通过企业微信下发指令，结果实时回传至企业微信聊天窗口。"
              isConnected={isWecomConnected}
              isLoading={wecomLoading}
              statusBadge={
                isWecomConnected ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: '#16a34a',
                      background: 'rgba(34, 197, 94, 0.1)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: '#22c55e',
                      }}
                    />
                    已连接
                  </span>
                ) : undefined
              }
              onConnect={() => setShowWecomModal(true)}
              onManage={() => setShowWecomAssistantModal(true)}
            />
            <ConnectorCard
              name="飞书助理"
              icon={<FeishuLogo />}
              description="通过飞书开放平台 WebSocket 长连接下发指令，结果实时回传至飞书聊天窗口（支持群聊及单聊）。"
              isConnected={feishuTunnelStatus?.status === 'connected'}
              isLoading={feishuTunnelLoading}
              statusBadge={
                feishuTunnelStatus?.status === 'connected' ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: '#16a34a',
                      background: 'rgba(34, 197, 94, 0.1)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: '#22c55e',
                      }}
                    />
                    已连接
                  </span>
                ) : undefined
              }
              onConnect={() => setShowFeishuTunnelModal(true)}
              onManage={() => setShowFeishuTunnelModal(true)}
            />
            <ConnectorCard
              name="钉钉助理"
              icon={<DingtalkLogo />}
              description="通过钉钉开放平台 Stream 模式长连接下发指令，随时在钉钉给工作台指派任务，结果实时回传。"
              isConnected={dingtalkTunnelStatus?.status === 'connected'}
              isLoading={dingtalkTunnelLoading}
              statusBadge={
                dingtalkTunnelStatus?.status === 'connected' ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: '#16a34a',
                      background: 'rgba(34, 197, 94, 0.1)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: '#22c55e',
                      }}
                    />
                    已连接
                  </span>
                ) : undefined
              }
              onConnect={() => setShowDingtalkTunnelModal(true)}
              onManage={() => setShowDingtalkTunnelModal(true)}
            />
          </div>
        </div>
      )}

      {/* 企业微信授权扫码弹窗 */}
      {showWecomModal && (
        <WecomModal
          onClose={() => setShowWecomModal(false)}
          onSuccess={() => {
            setShowWecomModal(false);
            fetchWecomStatus();
          }}
        />
      )}

      {/* 企业微信管理详情弹窗 (复用通用 ConnectorDetailModal 组件) */}
      {showWecomDetailModal && (
        <ConnectorDetailModal
          channel="wecom"
          title="企业微信 (WeCom)"
          botId={wecomBotId}
          status={wecomStatus?.status || 'connected'}
          onClose={() => setShowWecomDetailModal(false)}
          onDisconnect={() => {
            setShowWecomDetailModal(false);
            handleWecomDisconnect();
          }}
          onTryIt={() => {
            handleTryIt('wecom');
          }}
          onSendPrompt={(text) => {
            handleSendPrompt(text);
          }}
        />
      )}

      {/* 钉钉官方授权扫码/浏览器弹窗 */}
      {showDingtalkModal && (
        <ConnectorAuthModal
          channel="dingtalk"
          title="钉钉授权连接"
          isCliInstalled={cliStatus?.dingtalk?.installed}
          onClose={() => setShowDingtalkModal(false)}
          onSuccess={() => {
            setShowDingtalkModal(false);
            fetchDingtalkStatus();
          }}
          onDisconnect={() => {
            setShowDingtalkModal(false);
            handleDingtalkDisconnect();
          }}
        />
      )}

      {/* 钉钉管理详情弹窗 */}
      {showDingtalkDetailModal && (
        <ConnectorDetailModal
          channel="dingtalk"
          title="钉钉 (DingTalk)"
          userName={dingtalkAccountTitle}
          status={isDingtalkConnected ? 'connected' : 'disconnected'}
          onClose={() => setShowDingtalkDetailModal(false)}
          onDisconnect={() => {
            setShowDingtalkDetailModal(false);
            handleDingtalkDisconnect();
          }}
          onTryIt={() => {
            handleTryIt('dingtalk');
          }}
          onSendPrompt={(text) => {
            handleSendPrompt(text);
          }}
        />
      )}
      {/* 飞书授权扫码弹窗 */}
      {showAuthModal && (
        <ConnectorAuthModal
          channel="lark"
          title="飞书授权连接"
          isCliInstalled={cliStatus?.lark?.installed}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            fetchLarkStatus();
          }}
          onDisconnect={() => {
            setShowAuthModal(false);
            handleDisconnect();
          }}
        />
      )}

      {/* 飞书管理详情弹窗 (仿图 2 技能市场弹窗) */}
      {showDetailModal && (
        <ConnectorDetailModal
          channel="lark"
          title="飞书 (Lark)"
          userName={larkUser}
          appId={larkAppId}
          status={isLarkConnected ? 'connected' : 'disconnected'}
          authLevel={larkAuthLevel}
          onAuthorizeUser={() => {
            setShowDetailModal(false);
            handleConnect('lark');
          }}
          onClose={() => setShowDetailModal(false)}
          onDisconnect={() => {
            setShowDetailModal(false);
            handleDisconnect();
          }}
          onTryIt={() => {
            handleTryIt('lark');
          }}
          onSendPrompt={(text) => {
            handleSendPrompt(text);
          }}
        />
      )}
      {/* 腾讯 ima 知识库连接与管理弹窗 */}
      {showImaModal && (
        <ImaConnectorModal
          isOpen={showImaModal}
          status={isImaConnected ? 'connected' : 'disconnected'}
          nickname={imaStatus?.nickname}
          defaultKbId={imaStatus?.defaultKbId}
          onClose={() => setShowImaModal(false)}
          onRefresh={() => fetchImaStatus()}
          onTryIt={() => handleTryIt('ima')}
          onSendPrompt={(text: string) => handleSendPrompt(text)}
        />
      )}

      {/* 腾讯 ima 知识库管理详情弹窗 (复用全站通用的 ConnectorDetailModal) */}
      {showImaDetailModal && (
        <ConnectorDetailModal
          channel="ima"
          title="腾讯 ima 知识库"
          userName={imaStatus?.nickname || '腾讯 ima 知识库用户'}
          status={isImaConnected ? 'connected' : 'disconnected'}
          onConfigure={() => {
            setShowImaDetailModal(false);
            setShowImaModal(true);
          }}
          onClose={() => setShowImaDetailModal(false)}
          onDisconnect={() => {
            setShowImaDetailModal(false);
            handleImaDisconnect();
          }}
          onTryIt={() => {
            handleTryIt('ima');
          }}
          onSendPrompt={(text) => {
            handleSendPrompt(text);
          }}
        />
      )}

      {/* 微信助理连接与管理弹窗 */}
      {showWeixinModal && (
        <WeixinModal
          isOpen={showWeixinModal}
          onClose={() => setShowWeixinModal(false)}
          onRefresh={() => fetchWeixinStatus()}
        />
      )}
      {/* 企业微信助理连接与管理弹窗 (复用组件) */}
      {showWecomAssistantModal && (
        <WeixinModal
          channel="wecom"
          isOpen={showWecomAssistantModal}
          onClose={() => setShowWecomAssistantModal(false)}
          onRefresh={() => fetchWecomStatus()}
          onSuccess={() => fetchWecomStatus()}
        />
      )}
      {/* 飞书远程通道管理弹窗 */}
      {showFeishuTunnelModal && (
        <FeishuModal
          isOpen={showFeishuTunnelModal}
          onClose={() => setShowFeishuTunnelModal(false)}
          onRefresh={() => fetchFeishuTunnelStatus()}
          onSuccess={() => fetchFeishuTunnelStatus()}
        />
      )}
      {/* 钉钉远程通道管理弹窗 */}
      {showDingtalkTunnelModal && (
        <DingtalkTunnelModal
          isOpen={showDingtalkTunnelModal}
          onClose={() => setShowDingtalkTunnelModal(false)}
          onRefresh={() => fetchDingtalkTunnelStatus()}
          onSuccess={() => fetchDingtalkTunnelStatus()}
        />
      )}
      {confirmInstallChannel && (
        <InstallCliConfirmModal
          channel={confirmInstallChannel}
          onConfirm={handleConfirmInstall}
          onCancel={() => setConfirmInstallChannel(null)}
        />
      )}
    </div>
  );
};

const InstallCliConfirmModal = ({
  channel,
  onConfirm,
  onCancel,
}: {
  channel: 'lark' | 'dingtalk' | 'wecom';
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const { name, pkg } = getConnectorInfo(channel);

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000000,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '380px',
          maxWidth: '90vw',
          background: 'var(--dsw-alias-bg-layer-1, #ffffff)',
          borderRadius: '16px',
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid var(--dsw-alias-border-l2, #e2e8f0)',
          padding: '24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--dsw-alias-primary, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0,
            }}
          >
            📦
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--dsw-alias-label-primary, #0f172a)',
                lineHeight: '1.3',
              }}
            >
              需安装{name}连接器组件
            </h3>
            <p
              style={{
                margin: '3px 0 0 0',
                fontSize: '12px',
                color: 'var(--dsw-alias-label-tertiary, #64748b)',
              }}
            >
              检测到当前便携环境尚未安装此扩展
            </p>
          </div>
        </div>

        <div
          style={{
            fontSize: '12.5px',
            lineHeight: '1.6',
            color: 'var(--dsw-alias-label-secondary, #334155)',
            background: 'var(--dsw-alias-bg-layer-2, #f8fafc)',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid var(--dsw-alias-border, #e2e8f0)',
          }}
        >
          使用 <strong>{name}</strong> 账号连接需要安装组件（
          <code
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              color: 'var(--dsw-alias-primary, #2563eb)',
            }}
          >
            {pkg}
          </code>
          ），是否确认安装？
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '4px',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              border: '1px solid var(--dsw-alias-border, #cbd5e1)',
              background: 'transparent',
              color: 'var(--dsw-alias-label-secondary, #475569)',
              transition: 'all 0.15s ease',
            }}
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="jy-btn-primary"
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              border: 'none',
              background: 'var(--dsw-alias-primary, #3b82f6)',
              color: '#ffffff',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              transition: 'all 0.15s ease',
            }}
          >
            确认安装
          </button>
        </div>
      </div>
    </div>
  );
};

const ConnectorSpinner = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      display: 'block',
      animation: 'jy-connector-spin 0.85s linear infinite',
    }}
  >
    <style>{`
      @keyframes jy-connector-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `}</style>
    <circle
      cx="16"
      cy="16"
      r="12"
      stroke="rgba(59, 130, 246, 0.16)"
      strokeWidth="3"
    />
    <path
      d="M16 4C9.37258 4 4 9.37258 4 16"
      stroke="var(--dsw-alias-primary, #3b82f6)"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 16 16"
        to="360 16 16"
        dur="0.85s"
        repeatCount="indefinite"
      />
    </path>
  </svg>
);

interface AuthModalProps {
  channel: string;
  title: string;
  isCliInstalled?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDisconnect?: () => void;
}

// 扫码授权弹窗组件
const ConnectorAuthModal = ({
  channel,
  title,
  isCliInstalled,
  onClose,
  onSuccess,
  onDisconnect,
}: AuthModalProps) => {
  const connInfo = getConnectorInfo(channel);
  const [loading, setLoading] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState<'fetching' | 'downloading'>(
    isCliInstalled === false ? 'downloading' : 'fetching'
  );
  const [authData, setAuthData] = useState<{
    verification_url: string;
    device_code: string;
    mode?: string;
  } | null>(null);
  const [authMode, setAuthMode] = useState<'init' | 'login' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const intervalRef = useRef<any>(null);

  // 1. 开始授权流程，获取设备码与验证链接
  const startAuth = async () => {
    setErrorMessage('');
    setLoading(true);

    if (isCliInstalled === false) {
      setLoadingPhase('downloading');
    } else if (isCliInstalled === undefined) {
      fetch('/api/jingyun/connectors/cli/status')
        .then((res) => res.json())
        .then((cliJson) => {
          const status = cliJson?.data?.[channel];
          if (status && !status.installed) {
            setLoadingPhase('downloading');
          }
        })
        .catch(() => {});
    }
    try {
      if (channel === 'wecom') {
        if (isCliInstalled === false) {
          try {
            await fetch('/api/jingyun/connectors/cli/install', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'wecom' }),
            });
          } catch (e) {
            console.warn('[WecomConnector] Failed to install wecom-cli:', e);
          }
          setLoadingPhase('fetching');
        }
        const res = await fetch('/api/jingyun/connectors/wecom/qr-start');
        if (res.ok) {
          const json = await res.json();
          const qrData = json?.data || json;
          if (qrData && qrData.authUrl && qrData.scode) {
            setAuthData({
              verification_url: qrData.authUrl,
              device_code: qrData.scode,
              mode: 'wecom',
            });
            setAuthMode('login');
            startPolling(qrData.scode);
          } else {
            setErrorMessage(json?.error || '无法获取企业微信授权数据');
          }
        } else {
          setErrorMessage('获取企业微信授权二维码失败');
        }
        return;
      }

      const res = await fetch(`/api/jingyun/connectors/${channel}/auth-start`, {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (loadingPhase === 'downloading') {
            showToast(
              `✓ ${connInfo.name} 连接器组件准备就绪，请使用手机客户端扫码`
            );
          }
          setLoadingPhase('fetching');
          setAuthData(json.data);
          setAuthMode(json.data.mode || 'login');
          startPolling(json.data.device_code);
          if (channel === 'dingtalk' && json.data.verification_url) {
            openExternalUrl(json.data.verification_url);
          }
        } else {
          setErrorMessage(json.error || '无法初始化授权链接');
        }
      } else {
        setErrorMessage('服务器请求失败，请确保本地 DSH 后端正常运行');
      }
    } catch (err: any) {
      setErrorMessage(err.message || '网络连接失败');
    } finally {
      setLoading(false);
    }
  };

  // 2. 双轨制：长连接等待写入 + 只读状态轮询检测
  const startPolling = (deviceCode: string) => {
    let active = true;
    let statusInterval: any = null;
    // 轨道 A：轮询检查（飞书长轮询 / 企业微信查询接口）
    const runPoll = async () => {
      if (!active) return;
      try {
        if (channel === 'wecom') {
          const res = await fetch(
            `/api/jingyun/connectors/wecom/query-result?scode=${encodeURIComponent(deviceCode)}`
          );
          if (res.ok && active) {
            const json = await res.json();
            const data = json?.data || {};
            if (data.status === 'success' && data.bot_info) {
              // 自动发起 connect 长连接建连
              await fetch('/api/jingyun/connectors/wecom/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  botId: data.bot_info.botid,
                  botSecret: data.bot_info.secret,
                }),
              }).catch((e) =>
                console.warn('[ConnectorAuthModal] Wecom connect error:', e)
              );
              triggerSuccess();
              return;
            }
          }
          if (active) {
            setTimeout(runPoll, 2000);
          }
          return;
        }

        const res = await fetch(
          `/api/jingyun/connectors/${channel}/auth-poll`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_code: deviceCode }),
          }
        );
        if (res.ok && active) {
          const json = await res.json();
          if (json.success) {
            if (json.mode === 'init_done') {
              console.log(
                '[ConnectorAuthModal] Phase 1 config init finished. Re-starting auth to get Phase 2 QR code...'
              );
              active = false;
              if (statusInterval) clearInterval(statusInterval);

              setAuthMode('login');
              setLoading(true);
              setAuthData(null);

              setTimeout(() => {
                startAuth();
              }, 1500);
            } else {
              triggerSuccess();
            }
          } else {
            if (active) {
              setTimeout(runPoll, 2000);
            }
          }
        }
      } catch (err) {
        console.warn('[ConnectorAuthModal] Poll verification failed:', err);
        if (active) {
          setTimeout(runPoll, 3000);
        }
      }
    };

    // 轨道 B：只读状态极速检测（每2秒）
    const checkStatus = async () => {
      if (!active) return;
      try {
        const res = await fetch(`/api/jingyun/connectors/${channel}/status`);
        if (res.ok && active) {
          const json = await res.json();
          if (json.success && json.data) {
            if (channel === 'wecom') {
              if (json.data.status === 'connected' || json.data.hasConfig) {
                triggerSuccess();
              }
            } else if (channel === 'dingtalk') {
              if (
                json.data.cliAuth?.authenticated === true ||
                json.data.status === 'connected' ||
                json.data.connected === true
              ) {
                triggerSuccess();
              }
            } else {
              const status = json.data.identities?.user?.status;
              const available = json.data.identities?.user?.available;
              if (
                status === 'ready' ||
                status === 'needs_refresh' ||
                available === true ||
                (authMode === 'login' &&
                  json.data.identities?.bot?.status === 'ready')
              ) {
                triggerSuccess();
              }
            }
          }
        }
      } catch (err) {
        console.warn('[ConnectorAuthModal] Status check failed:', err);
      }
    };

    const triggerSuccess = () => {
      if (!active) return;
      active = false;
      if (statusInterval) clearInterval(statusInterval);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    };

    // 启动两条轨道
    runPoll();
    statusInterval = setInterval(checkStatus, 2000);

    intervalRef.current = {
      close: () => {
        active = false;
        if (statusInterval) clearInterval(statusInterval);
      },
    };
  };

  const handleModalClose = () => {
    if (channel === 'dingtalk') {
      fetch('/api/jingyun/connectors/dingtalk/auth-cancel', {
        method: 'POST',
      }).catch(() => {});
    }
    onClose();
  };

  const channelRef = useRef(channel);
  useEffect(() => {
    channelRef.current = channel;
  });

  const startAuthRef = useRef(startAuth);
  useEffect(() => {
    startAuthRef.current = startAuth;
  });
  useEffect(() => {
    queueMicrotask(() => {
      startAuthRef.current();
    });
    return () => {
      if (channelRef.current === 'dingtalk') {
        fetch('/api/jingyun/connectors/dingtalk/auth-cancel', {
          method: 'POST',
        }).catch(() => {});
      }
      if (
        intervalRef.current &&
        typeof intervalRef.current.close === 'function'
      ) {
        intervalRef.current.close();
      }
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="jy-detail-modal"
        style={{
          width: '380px',
          background:
            'var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-card, #ffffff))',
          borderRadius: '16px',
          border:
            '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          padding: '28px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isSuccess ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 0',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
                marginBottom: '18px',
                boxShadow: '0 4px 10px rgba(34, 197, 94, 0.15)',
              }}
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h4
              style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: 600,
                color: '#16a34a',
              }}
            >
              授权连接成功！
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: 'var(--dsw-alias-label-tertiary, #64748b)',
              }}
            >
              {connInfo.authSuccessDesc}
            </p>
          </div>
        ) : (
          <>
            {/* 关闭按钮 */}
            <button
              onClick={handleModalClose}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--dsw-alias-label-primary, #0f172a)',
              }}
            >
              {title}
            </h3>
            <p
              style={{
                margin: '0 0 20px 0',
                fontSize: '12px',
                color:
                  authMode === 'init'
                    ? '#d97706'
                    : 'var(--dsw-alias-label-tertiary, #64748b)',
                textAlign: 'center',
                lineHeight: '1.4',
                fontWeight: authMode === 'init' ? 500 : 'normal',
                minHeight: '44px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {loading && loadingPhase === 'downloading' ? (
                <>首次使用正在准备环境组件，下载完成后将自动展示二维码</>
              ) : channel === 'dingtalk' ? (
                <>
                  已为您在系统默认浏览器中打开钉钉授权页面，
                  <br />
                  您也可以使用手机钉钉直接扫描下方二维码完成授权。
                </>
              ) : channel === 'wecom' ? (
                <>
                  请使用手机企业微信扫描下方二维码完成授权，
                  <br />
                  授权后智能体即可介入您的企业微信会话。
                </>
              ) : !authMode ? (
                <>正在检查飞书授权状态并生成二维码...</>
              ) : authMode === 'init' ? (
                <>
                  <strong
                    style={{
                      display: 'block',
                      color: '#d97706',
                      marginBottom: '6px',
                      fontSize: '13px',
                    }}
                  >
                    第一步：选择应用
                  </strong>
                  检测到本地尚未配置飞书。请扫码或打开下方配置网址，
                  <br />
                  在浏览器中新建或选择您的飞书应用完成绑定。
                </>
              ) : (
                <>
                  <strong
                    style={{
                      display: 'block',
                      color: '#16a34a',
                      marginBottom: '6px',
                      fontSize: '13px',
                    }}
                  >
                    第二步：应用授权
                  </strong>
                  请继续使用手机飞书扫描下方二维码进行登录，
                  <br />
                  或者在电脑浏览器里打开配置网址完成授权。
                </>
              )}
            </p>

            {loading ? (
              <div
                style={{
                  width: '210px',
                  height: '210px',
                  border:
                    '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                  gap: '10px',
                  background: 'var(--dsw-alias-bg-layer-2, #fafafa)',
                }}
              >
                <ConnectorSpinner />
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--dsw-alias-label-primary, #0f172a)',
                  }}
                >
                  {loadingPhase === 'downloading'
                    ? `正在下载 ${connInfo.cliName}...`
                    : '正在向平台申请二维码...'}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    lineHeight: '1.4',
                    color: 'var(--dsw-alias-label-tertiary, #64748b)',
                    maxWidth: '170px',
                  }}
                >
                  {loadingPhase === 'downloading'
                    ? '首次使用安装便携扩展组件'
                    : '本地 CLI 已就绪，正在通信'}
                </div>
                {loadingPhase === 'downloading' && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: 'rgba(59, 130, 246, 0.08)',
                      color: 'var(--dsw-alias-primary, #2563eb)',
                      fontSize: '10.5px',
                      fontWeight: 500,
                      marginTop: '2px',
                    }}
                  >
                    <span>📦</span> 首次使用自动安装
                  </div>
                )}
              </div>
            ) : errorMessage ? (
              <div
                style={{
                  width: '200px',
                  height: '200px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontSize: '12px',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ marginBottom: '8px' }}
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div>{errorMessage}</div>
                <button
                  onClick={startAuth}
                  style={{
                    marginTop: '12px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  重试
                </button>
              </div>
            ) : authData ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                {/* 二维码图片容器 (白底保证扫码识别率) */}
                <div
                  style={{
                    padding: '12px',
                    border:
                      '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
                    borderRadius: '12px',
                    background: '#ffffff',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <QRCodeSVG
                    value={authData.verification_url}
                    size={180}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                {/* 飞书 / 钉钉网页授权跳转链接 */}
                {channel !== 'wecom' && authData.verification_url && (
                  <button
                    type="button"
                    onClick={() => openExternalUrl(authData.verification_url)}
                    style={{
                      fontSize: '12px',
                      color: channel === 'dingtalk' ? '#007FFF' : '#3370FF',
                      textDecoration: 'none',
                      fontWeight: 500,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        channel === 'dingtalk'
                          ? 'rgba(0, 127, 255, 0.08)'
                          : 'rgba(51, 112, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span
                      style={{
                        borderBottom: `1px solid ${
                          channel === 'dingtalk' ? '#007FFF' : '#3370FF'
                        }`,
                      }}
                    >
                      {channel === 'dingtalk'
                        ? '在浏览器中重新打开授权页面 ↗'
                        : authMode === 'init'
                          ? '或在浏览器中打开配置网址'
                          : '或在浏览器中打开授权网址'}
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </button>
                )}
              </div>
            ) : null}

            <div
              style={{
                marginTop: '24px',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {onDisconnect &&
                channel === 'lark' &&
                !loading &&
                authMode === 'login' && (
                  <button
                    type="button"
                    onClick={onDisconnect}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '6px',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      background: 'rgba(239, 68, 68, 0.05)',
                      color: '#ef4444',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <UnbindIcon />
                    解除授权
                  </button>
                )}
              <button
                type="button"
                className="jy-btn-secondary"
                onClick={handleModalClose}
                style={{
                  padding: '6px 20px',
                  borderRadius: '6px',
                  border:
                    '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
                  background: 'var(--dsw-alias-bg-layer-3, transparent)',
                  color: 'var(--dsw-alias-label-secondary, #475569)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                关闭
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
