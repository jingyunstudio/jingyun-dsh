import React, { useState, useEffect } from 'react';

import { brandingManager, showToast } from '../../components/BrandBranding';
import {
  TunnelModalShell,
  TunnelReadyCard,
  TunnelNotice,
  TunnelActionButtons,
  TunnelFormButtons,
} from './TunnelCommon.js';

export interface JingyunTunnelModalProps {
  isOpen?: boolean;
  onClose: () => void;
  initialStatus?: JingyunTunnelStateResponse | null;
  onRefresh?: (newState: JingyunTunnelStateResponse) => void;
}

export interface JingyunTunnelStateResponse {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  deviceId?: string;
  deviceName?: string;
  cloudUrl?: string;
  lastConnectedAt?: number;
  lastHeartbeatAt?: number;
  error?: string;
  proxyUrl?: string;
  config?: {
    deviceId?: string;
    deviceName?: string;
    cloudUrl?: string;
  };
}

export const JingyunCloudIcon = () => (
  <div
    style={{
      width: '38px',
      height: '38px',
      borderRadius: '10px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      flexShrink: 0,
      boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)',
    }}
  >
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
        fill="currentColor"
      />
    </svg>
  </div>
);

function readLocalAuth() {
  try {
    const token = localStorage.getItem('jy_online_token') || '';
    const userRaw = localStorage.getItem('jy_online_user') || '';
    return {
      token,
      userInfo: userRaw
        ? (JSON.parse(userRaw) as { username?: string; phone?: string })
        : null,
    };
  } catch (err) {
    console.debug('[JingyunTunnelModal] Read local auth error:', err);
    return { token: '', userInfo: null };
  }
}

export const JingyunTunnelModal: React.FC<JingyunTunnelModalProps> = ({
  isOpen = true,
  onClose,
  initialStatus = null,
  onRefresh,
}) => {
  const [connecting, setConnecting] = useState(false);
  const [tunnelState, setTunnelState] =
    useState<JingyunTunnelStateResponse | null>(initialStatus);
  const [errorText, setErrorText] = useState<string>('');
  const [{ token, userInfo }, setAuth] = useState(readLocalAuth);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => setAuth(readLocalAuth()));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnected = tunnelState?.status === 'connected';

  // 1. 处理开启穿透并绑定
  const handleConnect = async () => {
    if (!token) {
      window.dispatchEvent(new CustomEvent('jy_open_login_modal'));
      return;
    }

    try {
      setConnecting(true);
      setErrorText('');
      const branding = await brandingManager.fetch().catch(() => null);
      const cloudHost = branding?.appHost || undefined;

      const res = await fetch(
        '/api/jingyun/connectors/jingyun-tunnel/connect',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userToken: token,
            cloudUrl: cloudHost,
            deviceName: `${userInfo?.username || userInfo?.phone || '本机'} 的 DSH 客户端`,
          }),
        }
      );

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
        data?: JingyunTunnelStateResponse;
      } & JingyunTunnelStateResponse;
      if (!res.ok || json.success === false) {
        const errMsg = json.error || json.message || '连接云端工作台失败';
        setErrorText(errMsg);
        showToast(errMsg);
        return;
      }

      setTunnelState(json);
      onRefresh?.(json);
      showToast('云端工作台已连接');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setErrorText(errMsg);
      showToast(errMsg);
    } finally {
      setConnecting(false);
    }
  };

  // 2. 处理断开连接
  const handleDisconnect = async () => {
    try {
      setConnecting(true);
      const res = await fetch(
        '/api/jingyun/connectors/jingyun-tunnel/disconnect',
        {
          method: 'POST',
        }
      );
      if (res.ok) {
        const json = (await res.json()) as {
          data?: JingyunTunnelStateResponse;
        } & JingyunTunnelStateResponse;
        setTunnelState(json);
        onRefresh?.(json);
      }
    } catch (err) {
      console.error('[JingyunTunnelModal] Disconnect failed:', err);
    } finally {
      setConnecting(false);
    }
  };

  const displayName = '云端工作台';

  return (
    <TunnelModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={<JingyunCloudIcon />}
      title={displayName}
      subtitle="连接后即可在网页端远程访问并操作本机工作台"
      badgeText={
        isConnected
          ? '已连接'
          : tunnelState?.status === 'connecting'
            ? '连接中...'
            : '未连接'
      }
      badgeColor={isConnected ? '#22c55e' : '#64748b'}
      maxWidth="540px"
    >
      <div
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* 未登录态提示 */}
        {!token ? (
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background:
                'var(--dsw-alias-surface-subtle, rgba(0, 0, 0, 0.02))',
              border: '1px solid var(--dsw-alias-border-l2, #e2e8f0)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="8"
                  r="4"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M4 20c0-4 4-6 8-6s8 2 8 6"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '15px',
                  color: 'var(--dsw-alias-label-primary, #0f172a)',
                }}
              >
                尚未登录平台账号
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--dsw-alias-label-secondary, #64748b)',
                  marginTop: '4px',
                }}
              >
                请先登录平台账号以完成工作台绑定。
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('jy_open_login_modal'));
                onClose();
              }}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                background: '#007FFF',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                marginTop: '4px',
              }}
            >
              前往登录账号
            </button>
          </div>
        ) : isConnected ? (
          /* 已连接态：精炼核心信息 */
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <TunnelReadyCard
              channelName={displayName}
              subtitle={`已绑定账号：${userInfo?.username || userInfo?.phone || '平台用户'}`}
              badgeText="运行中"
            />

            <TunnelActionButtons
              onDisconnect={handleDisconnect}
              isDisconnecting={connecting}
              disconnectText="断开连接"
            />
          </div>
        ) : (
          /* 已登录但未连接态：需用户主动确认开启 */
          <>
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1e3a8a',
                  }}
                >
                  当前登录账号：
                  {userInfo?.username || userInfo?.phone || '平台用户'}
                </div>
              </div>
            </div>

            <TunnelNotice notice="开启连接后，您可使用当前账号在网页端远程访问并操作本机工作台，随时可在此断开。" />
            {errorText && <TunnelNotice error={errorText} />}

            <TunnelFormButtons
              submitText={connecting ? '正在连接...' : '立即连接'}
              onSubmit={handleConnect}
              isSubmitting={connecting}
              onClose={onClose}
            />
          </>
        )}
      </div>
    </TunnelModalShell>
  );
};
