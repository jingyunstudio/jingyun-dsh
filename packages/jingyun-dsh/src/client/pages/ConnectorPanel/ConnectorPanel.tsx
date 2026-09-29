import React, { useState, useEffect } from 'react';

import type { WeixinBotStatus } from '../../../connectors/types';
import { showToast } from '../../components/BrandBranding';
import { sendPromptToComposer } from '../../dom-helper';
import {
  ConnectorAuthModal,
  InstallCliConfirmModal,
} from './ConnectorAuthModal';
import {
  ConnectorDetailModal,
  DEFAULT_DINGTALK_SUGGESTIONS,
  DEFAULT_LARK_SUGGESTIONS,
  DEFAULT_WECOM_SUGGESTIONS,
} from './ConnectorDetailModal';
import { DingtalkTunnelModal } from './DingtalkTunnelModal';
import { FeishuModal } from './FeishuModal';
import { ImaCatLogo, ImaConnectorModal } from './ImaConnectorModal';
import {
  JingyunCloudIcon,
  JingyunTunnelModal,
  type JingyunTunnelStateResponse,
} from './JingyunTunnelModal';
import { ConnectedBadge } from './TunnelCommon';
import {
  MobileBrandIcon,
  MobileConnectorModal,
  type MobileStatusData,
} from './MobileConnectorModal';
import { WecomModal } from './WecomModal';
import { WeixinModal } from './WeixinModal';

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
  const [jingyunTunnelStatus, setJingyunTunnelStatus] =
    useState<JingyunTunnelStateResponse | null>(null);
  const [jingyunTunnelLoading, setJingyunTunnelLoading] = useState(true);
  const [showJingyunTunnelModal, setShowJingyunTunnelModal] = useState(false);
  const [mobileStatus, setMobileStatus] = useState<MobileStatusData | null>(
    null
  );
  const [mobileLoading, setMobileLoading] = useState(true);
  const [showMobileModal, setShowMobileModal] = useState(false);
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

  // 获取 Jingyun 云端工作台反向穿透状态
  const fetchJingyunTunnelStatus = async () => {
    setJingyunTunnelLoading(true);
    try {
      const res = await fetch('/api/jingyun/connectors/jingyun-tunnel/status');
      if (res.ok) {
        const json = await res.json();
        setJingyunTunnelStatus(json?.data || json);
      }
    } catch (err) {
      console.warn(
        '[ConnectorPanel] Failed to fetch jingyun tunnel status:',
        err
      );
    } finally {
      setJingyunTunnelLoading(false);
    }
  };

  // 获取移动端设备连接状态
  const fetchMobileStatus = async () => {
    setMobileLoading(true);
    try {
      const res = await fetch('/api/jingyun/connectors/mobile/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setMobileStatus(json.data);
        }
      }
    } catch (err) {
      console.warn('[ConnectorPanel] Failed to fetch mobile status:', err);
    } finally {
      setMobileLoading(false);
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
      fetchMobileStatus();
      fetchJingyunTunnelStatus();
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
  const mobileDevices = mobileStatus
    ? mobileStatus.devices.filter((d) => d.state === 'device')
    : [];
  const isMobileConnected = mobileDevices.length > 0;

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
            statusBadge={<ConnectedBadge />}
            onConnect={() => handleConnect('dingtalk')}
            onManage={() => setShowDingtalkDetailModal(true)}
          />

          <ConnectorCard
            name="企业微信"
            icon={<WechatWorkLogo />}
            description="与企业微信智能机器人深度集成，支持 WebSocket 长连接实时消息收发与协同。"
            isConnected={isWecomConnected}
            isLoading={wecomLoading}
            statusBadge={<ConnectedBadge />}
            onConnect={() => handleConnect('wecom')}
            onManage={() => setShowWecomDetailModal(true)}
          />

          <ConnectorCard
            name="腾讯 ima 知识库"
            icon={<ImaCatLogo size={36} />}
            description="腾讯AI知识管家，连接后支持搜索、读取和写入知识库资料，并可搜索和订阅教育、法律、财经、科技等20+行业专业知识。"
            isConnected={isImaConnected}
            isLoading={imaLoading}
            statusBadge={<ConnectedBadge />}
            onConnect={() => setShowImaModal(true)}
            onManage={() => setShowImaDetailModal(true)}
          />

          <ConnectorCard
            name="移动终端 (Android)"
            icon={<MobileBrandIcon size={36} />}
            description="与 Android 移动设备深度集成，支持 ADB 无线局域网配对、多模态实时屏幕快照、无障碍语义树操作与自动化任务控制。"
            isConnected={isMobileConnected}
            isLoading={mobileLoading}
            statusBadge={
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  color: isMobileConnected ? '#10B981' : '#64748b',
                  background: isMobileConnected
                    ? 'rgba(16, 185, 129, 0.1)'
                    : 'rgba(100, 116, 139, 0.1)',
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
                    background: isMobileConnected ? '#10B981' : '#94a3b8',
                  }}
                />
                {isMobileConnected
                  ? `已连接 (${mobileDevices.length}台)`
                  : '未连接设备'}
              </span>
            }
            onConnect={() => setShowMobileModal(true)}
            onManage={() => setShowMobileModal(true)}
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
              name="云端工作台"
              icon={<JingyunCloudIcon />}
              description="连接后可在网页端直接使用本地工作台，随时随地进行智能体对话与任务协作。"
              isConnected={jingyunTunnelStatus?.status === 'connected'}
              isLoading={jingyunTunnelLoading}
              statusBadge={
                jingyunTunnelStatus?.status === 'connected' ? (
                  <ConnectedBadge />
                ) : undefined
              }
              onConnect={() => setShowJingyunTunnelModal(true)}
              onManage={() => setShowJingyunTunnelModal(true)}
            />
            <ConnectorCard
              name="微信助理"
              icon={<WeixinLogo />}
              description="通过微信直接下发指令，结果实时回传至微信聊天窗口。"
              isConnected={isWeixinConnected}
              isLoading={weixinLoading}
              statusBadge={isWeixinConnected ? <ConnectedBadge /> : undefined}
              onConnect={() => setShowWeixinModal(true)}
              onManage={() => setShowWeixinModal(true)}
            />
            <ConnectorCard
              name="企业微信助理"
              icon={<WechatWorkLogo />}
              description="通过企业微信下发指令，结果实时回传至企业微信聊天窗口。"
              isConnected={isWecomConnected}
              isLoading={wecomLoading}
              statusBadge={isWecomConnected ? <ConnectedBadge /> : undefined}
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
                  <ConnectedBadge />
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
                  <ConnectedBadge />
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
      {/* 移动设备连接与管理弹窗 */}
      {showMobileModal && (
        <MobileConnectorModal
          isOpen={showMobileModal}
          onClose={() => setShowMobileModal(false)}
          onRefresh={() => fetchMobileStatus()}
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
      {/* 云端工作台管理弹窗 */}
      {showJingyunTunnelModal && (
        <JingyunTunnelModal
          isOpen={showJingyunTunnelModal}
          onClose={() => setShowJingyunTunnelModal(false)}
          initialStatus={jingyunTunnelStatus}
          onRefresh={setJingyunTunnelStatus}
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
