import React, { useState, useEffect, useRef } from 'react';

export interface WecomConfigData {
  botId: string;
  botSecret: string;
  gatewayUrl?: string;
  autoReconnect?: boolean;
}

// 腾讯企业微信授权常数
const AUTH_ORIGIN = 'https://work.weixin.qq.com';
const DEFAULT_GATEWAY_URL = 'wss://openws.work.weixin.qq.com';

const MESSAGE_TYPE = {
  QR_CODE_READY: 'QR_CODE_READY',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_ERROR: 'AUTH_ERROR',
  AUTH_CANCEL: 'AUTH_CANCEL',
};
import { QRCodeSVG } from 'qrcode.react';

// 企业微信扫码连接弹窗 (纯净原生 SVG 二维码模式)
export const WecomModal = ({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('正在生成企业微信授权二维码...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const pollTimerRef = useRef<any>(null);

  const handleAuthSuccess = async (botInfo: any) => {
    try {
      setStatusMsg('授权成功，正在连接企业微信机器人网关...');
      const res = await fetch('/api/jingyun/connectors/wecom/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: botInfo.botid,
          botSecret: botInfo.secret,
          gatewayUrl: DEFAULT_GATEWAY_URL,
          autoReconnect: true,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        setIsSuccess(true);
        setStatusMsg('企业微信智能机器人连接成功！');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setErrorMsg(data?.error || '连接机器人失败');
      }
    } catch (e: any) {
      setErrorMsg(e.message || '连接机器人失败');
    }
  };

  const startPolling = (scode: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/jingyun/connectors/wecom/qr-poll?scode=${encodeURIComponent(scode)}`
        );
        if (res.ok) {
          const result = await res.json();
          if (result && result.status === 'success' && result.bot_info) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            handleAuthSuccess(result.bot_info);
          }
        }
      } catch (e) {
        // ignore poll errors
      }
    }, 2000);
  };

  const fetchQrAndStartPoll = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      setStatusMsg('正在向企业微信申请授权二维码...');

      const res = await fetch('/api/jingyun/connectors/wecom/qr-start');
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(
          `获取二维码失败: ${res.status} ${errText || res.statusText}`
        );
      }

      const json = await res.json();
      const qrData = json?.data || json;
      if (!qrData || !qrData.authUrl || !qrData.scode) {
        throw new Error(json?.error || '返回的二维码授权数据异常');
      }

      setAuthUrl(qrData.authUrl);
      setLoading(false);
      setStatusMsg('请使用手机企业微信扫码授权');
      startPolling(qrData.scode);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || '生成二维码失败');
    }
  };

  useEffect(() => {
    fetchQrAndStartPoll();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(4px)',
        animation: 'fade-in 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '380px',
          background: 'var(--dsw-alias-bg-card, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--dsw-alias-border, #e2e8f0)',
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          padding: '28px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) =>
            (e.currentTarget.style.color =
              'var(--dsw-alias-label-primary, #0f172a)')
          }
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) =>
            (e.currentTarget.style.color =
              'var(--dsw-alias-label-tertiary, #94a3b8)')
          }
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

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
                marginBottom: '16px',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--dsw-alias-label-primary, #0f172a)',
              }}
            >
              授权连接成功
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--dsw-alias-label-secondary, #64748b)',
              }}
            >
              企业微信智能机器人已成功就绪
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                <path
                  d="M24 4C12.95 4 4 12.95 4 24C4 35.05 12.95 44 24 44C35.05 44 44 35.05 44 24C44 12.95 35.05 4 24 4ZM28.5 28.5C28.5 29.33 27.83 30 27 30H21C20.17 30 19.5 29.33 19.5 28.5V25.5H16.5C15.67 25.5 15 24.83 15 24C15 23.17 15.67 22.5 16.5 22.5H19.5V19.5C19.5 18.67 20.17 18 21 18H27C27.83 18 28.5 18.67 28.5 19.5V22.5H31.5C32.33 22.5 33 23.17 33 24C33 24.83 32.33 25.5 31.5 25.5H28.5V28.5Z"
                  fill="#1875F0"
                />
              </svg>
            </div>

            <h3
              style={{
                margin: '0 0 6px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--dsw-alias-label-primary, #0f172a)',
              }}
            >
              企业微信授权连接
            </h3>

            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '13px',
                color: 'var(--dsw-alias-label-secondary, #64748b)',
                textAlign: 'center',
              }}
            >
              使用手机企业微信扫描下方二维码完成授权
            </p>

            {errorMsg && (
              <div
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  marginBottom: '12px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontSize: '12px',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
              >
                {errorMsg}
              </div>
            )}
            {/* 纯净原生 SVG 二维码容器 */}
            <div
              style={{
                width: '240px',
                height: '240px',
                borderRadius: '12px',
                border: '1px solid var(--dsw-alias-border, #e2e8f0)',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              }}
            >
              {authUrl && !loading && (
                <QRCodeSVG
                  value={authUrl}
                  size={210}
                  level="M"
                  fgColor="#0f172a"
                  bgColor="#ffffff"
                />
              )}

              {loading && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      border: '2.5px solid #1875F0',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    生成二维码中...
                  </span>
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: '16px',
                fontSize: '12px',
                color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isSuccess
                    ? '#22c55e'
                    : errorMsg
                      ? '#ef4444'
                      : '#3b82f6',
                  display: 'inline-block',
                }}
              />
              <span>{statusMsg}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const WecomConfigModal = WecomModal;

// 企业微信详情管理弹窗
export const WecomDetailModal = ({
  botId,
  status,
  onClose,
  onDisconnect,
  onTryIt,
}: {
  botId: string;
  status: string;
  onClose: () => void;
  onDisconnect: () => void;
  onClearConfig?: () => void;
  onEditConfig?: () => void;
  onTryIt?: () => void;
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        animation: 'fade-in 0.15s ease-out',
      }}
    >
      <div
        style={{
          background: 'var(--dsw-alias-bg-card, #ffffff)',
          border: '1px solid var(--dsw-alias-border, #e2e8f0)',
          borderRadius: '16px',
          width: '460px',
          maxWidth: '90vw',
          padding: '24px',
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* 头部 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
                <path
                  d="M24 4C12.95 4 4 12.95 4 24C4 35.05 12.95 44 24 44C35.05 44 44 35.05 44 24C44 12.95 35.05 4 24 4ZM28.5 28.5C28.5 29.33 27.83 30 27 30H21C20.17 30 19.5 29.33 19.5 28.5V25.5H16.5C15.67 25.5 15 24.83 15 24C15 23.17 15.67 22.5 16.5 22.5H19.5V19.5C19.5 18.67 20.17 18 21 18H27C27.83 18 28.5 18.67 28.5 19.5V22.5H31.5C32.33 22.5 33 23.17 33 24C33 24.83 32.33 25.5 31.5 25.5H28.5V28.5Z"
                  fill="#1875F0"
                />
              </svg>
            </div>
            <div>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--dsw-alias-label-primary, #0f172a)',
                  }}
                >
                  企业微信机器人
                </h3>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: status === 'connected' ? '#16a34a' : '#d97706',
                    background:
                      status === 'connected'
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'rgba(245, 158, 11, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background:
                        status === 'connected' ? '#22c55e' : '#f59e0b',
                    }}
                  />
                  {status === 'connected' ? '运行中' : '连接中'}
                </span>
              </div>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '12px',
                  color: 'var(--dsw-alias-label-tertiary, #64748b)',
                }}
              >
                企业微信智能机器人通道
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--dsw-alias-label-tertiary, #64748b)',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* 状态详情卡片 */}
        <div
          style={{
            background: 'var(--dsw-alias-bg-subtle, #f8fafc)',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            border: '1px solid var(--dsw-alias-border, #e2e8f0)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
            }}
          >
            <span
              style={{ color: 'var(--dsw-alias-label-secondary, #64748b)' }}
            >
              机器人 ID (BotId)
            </span>
            <span
              style={{
                fontWeight: 500,
                color: 'var(--dsw-alias-label-primary, #0f172a)',
                fontFamily: 'monospace',
              }}
            >
              {botId || '-'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
            }}
          >
            <span
              style={{ color: 'var(--dsw-alias-label-secondary, #64748b)' }}
            >
              连接模式
            </span>
            <span
              style={{
                fontWeight: 500,
                color: 'var(--dsw-alias-label-primary, #0f172a)',
              }}
            >
              WebSocket 长连接
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
            }}
          >
            <span
              style={{ color: 'var(--dsw-alias-label-secondary, #64748b)' }}
            >
              状态
            </span>
            <span
              style={{
                fontWeight: 500,
                color: status === 'connected' ? '#16a34a' : '#d97706',
              }}
            >
              {status === 'connected' ? '长连接已就绪' : '连接断开 / 正在重连'}
            </span>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onDisconnect}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #fee2e2',
                background: '#fff1f2',
                color: '#e11d48',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              断开连接
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {onTryIt && (
              <button
                onClick={onTryIt}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--dsw-alias-bg-button-primary, #0f172a)',
                  color: 'var(--dsw-alias-label-inverse, #ffffff)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                去试试
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid var(--dsw-alias-border, #e2e8f0)',
                background: 'var(--dsw-alias-bg-card, #ffffff)',
                color: 'var(--dsw-alias-label-primary, #0f172a)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
