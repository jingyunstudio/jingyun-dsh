import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface WecomConfigData {
  botId: string;
  botSecret: string;
  gatewayUrl?: string;
  autoReconnect?: boolean;
}

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

  const handleAuthSuccess = useCallback(() => {
    setIsSuccess(true);
    setStatusMsg('企业微信智能机器人连接成功！');
    setTimeout(() => {
      onSuccess();
    }, 1200);
  }, [onSuccess]);

  const startPolling = useCallback(
    (scode: string) => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/jingyun/connectors/wecom/qr-poll?scode=${encodeURIComponent(scode)}`
          );
          if (res.ok) {
            const result = await res.json();
            if (result && result.status === 'success') {
              if (pollTimerRef.current) clearInterval(pollTimerRef.current);
              handleAuthSuccess();
            }
          }
        } catch {
          // 忽略单次网络轮询抖动
        }
      }, 2000);
    },
    [handleAuthSuccess]
  );

  useEffect(() => {
    const fetchQrAndStartPoll = async () => {
      try {
        const res = await fetch('/api/jingyun/connectors/wecom/qr-start');
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(
            `获取二维码失败: ${res.status} ${errText || res.statusText}`
          );
        }

        const json = await res.json();
        const qrData = json.data;
        if (!qrData?.authUrl || !qrData?.scode) {
          throw new Error(json.error || '返回的二维码授权数据异常');
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

    fetchQrAndStartPoll();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [startPolling]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        animation: 'fade-in 0.15s ease-out',
      }}
      onClick={onClose}
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
              className="jy-card-icon-box"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(24, 117, 240, 0.1)',
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
            {/* 纯净原生 SVG 二维码容器 (保持白底衬垫以确保扫码清晰) */}
            <div
              style={{
                width: '240px',
                height: '240px',
                borderRadius: '12px',
                border:
                  '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
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
