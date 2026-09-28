import { QRCodeSVG } from 'qrcode.react';
import React, { useEffect, useRef, useState } from 'react';

import { showToast } from '../../components/BrandBranding';
import { UnbindIcon } from './ConnectorDetailModal';

export const openExternalUrl = (target: string) => {
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

export const InstallCliConfirmModal = ({
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

export interface AuthModalProps {
  channel: string;
  title: string;
  isCliInstalled?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDisconnect?: () => void;
}

export const ConnectorAuthModal = ({
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

  const startPolling = (deviceCode: string) => {
    let active = true;
    let statusInterval: any = null;
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
