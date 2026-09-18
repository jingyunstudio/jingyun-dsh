import { QRCodeSVG } from 'qrcode.react';
import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface WeixinModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onRefresh?: () => void;
}

interface WeixinStatusResponse {
  connected: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  accountId?: string;
  userId?: string;
  nickName?: string;
  lastSyncTime?: number;
  lastError?: string;
}

export const WeixinModal: React.FC<WeixinModalProps> = ({
  onClose,
  onSuccess,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<WeixinStatusResponse | null>(null);
  const [qrScanUrl, setQrScanUrl] = useState('');
  const [qrState, setQrState] = useState<
    'wait' | 'scaned' | 'confirmed' | 'expired'
  >('wait');
  const [statusMsg, setStatusMsg] = useState('正在获取二维码...');
  const [errorMsg, setErrorMsg] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const pollTimerRef = useRef<NodeJS.Timeout | number | null>(null);
  // 清除轮询定时器
  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // 获取当前微信连接状态
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/jingyun/connectors/weixin/status');
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          setStatus(json.data);
          return json.data as WeixinStatusResponse;
        }
      }
    } catch {
      // 忽略检查异常
    }
    return null;
  }, []);

  // 开始轮询二维码状态
  const startPollingQr = useCallback(
    (qrcode: string) => {
      clearPollTimer();
      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/jingyun/connectors/weixin/qr-poll?qrcode=${encodeURIComponent(qrcode)}`
          );
          if (res.ok) {
            const json = await res.json();
            const data = json.data;
            if (data?.status === 'scaned') {
              setQrState('scaned');
              setStatusMsg('已扫描二维码，请在微信中点击确认绑定...');
            } else if (data?.status === 'confirmed') {
              setQrState('confirmed');
              setStatusMsg('绑定成功！正在进入工作台通道...');
              clearPollTimer();
              await fetchStatus();
              setTimeout(() => {
                onSuccess?.();
                onRefresh?.();
              }, 1200);
            } else if (data?.status === 'expired') {
              setQrState('expired');
              setStatusMsg('二维码已过期，请点击重新获取');
              clearPollTimer();
            }
          }
        } catch {
          // 容忍单次轮询网络波动
        }
      }, 2000);
    },
    [clearPollTimer, fetchStatus, onSuccess, onRefresh]
  );

  // 获取二维码
  const fetchQrCode = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    setQrState('wait');
    setStatusMsg('正在生成登录二维码...');
    clearPollTimer();

    try {
      const res = await fetch('/api/jingyun/connectors/weixin/qr-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `请求二维码失败: ${res.status}`);
      }

      const json = await res.json();
      const data = json.data;
      if (data?.qrcode) {
        // qrcode 是轮询 key，qrUrl (即 qrcode_img_content) 是微信扫码的目标地址
        const targetUrl = data.qrUrl ?? data.qrcode;
        setQrScanUrl(targetUrl);
        setStatusMsg('请使用微信“扫一扫”完成绑定');
        startPollingQr(data.qrcode);
      } else {
        throw new Error('网关未返回有效的二维码识别码');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setStatusMsg('获取二维码失败');
    } finally {
      setLoading(false);
    }
  }, [clearPollTimer, startPollingQr]);

  // 初始化流程
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const current = await fetchStatus();
      if (!mounted) return;
      if (current && current.connected) {
        setLoading(false);
      } else {
        await fetchQrCode();
      }
    };
    init();
    return () => {
      mounted = false;
      clearPollTimer();
    };
  }, [clearPollTimer, fetchQrCode, fetchStatus]);

  // 发送测试消息
  const handleSendTest = async () => {
    setTestSending(true);
    setTestSuccess(false);
    setErrorMsg('');
    try {
      const res = await fetch('/api/jingyun/connectors/weixin/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '助理远程通道测试成功！您现在可以随时下发指令。',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestSuccess(true);
        setTimeout(() => setTestSuccess(false), 3000);
      } else {
        setErrorMsg(data.error || '发送测试消息失败');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setTestSending(false);
    }
  };

  // 断开连接
  const handleDisconnect = async (clearCreds = false) => {
    setDisconnecting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/jingyun/connectors/weixin/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearCredentials: clearCreds }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(null);
        fetchQrCode();
        onSuccess?.();
        onRefresh?.();
      } else {
        setErrorMsg(data.error || '断开连接失败');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = status && status.connected;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          clearPollTimer();
          onClose();
        }
      }}
    >
      <div
        style={{
          background: 'var(--dsw-alias-layer-popover, #ffffff)',
          borderRadius: '16px',
          boxShadow:
            '0 20px 40px -15px rgba(0, 0, 0, 0.2), 0 0 1px 1px rgba(0,0,0,0.05)',
          width: '100%',
          maxWidth: '480px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* 标题栏 */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--dsw-alias-border-subtle, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#07C160',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8.5 3.5C4.91 3.5 2 5.96 2 9c0 1.76.96 3.32 2.45 4.33L3.8 16.2c-.08.26.18.49.43.38l3.18-1.41c.36.06.72.09 1.09.09.31 0 .61-.02.9-.06-.39-.8-.6-1.68-.6-2.6 0-3.41 3.22-6.17 7.2-6.17.17 0 .34.01.5.03C15.54 4.38 12.28 3.5 8.5 3.5zm-2 3.5a1 1 0 110 2 1 1 0 010-2zm4.5 0a1 1 0 110 2 1 1 0 010-2zm4.5 5.1c-3.31 0-6 2.24-6 5s2.69 5 6 5c.34 0 .67-.03 1-.09l2.65 1.18c.21.09.43-.1.36-.32l-.54-2.39C21.2 19.46 22 18.16 22 16.7c0-2.76-2.69-5-6-5zm-2 2.9a.9.9 0 110 1.8.9.9 0 010-1.8zm4 0a.9.9 0 110 1.8.9.9 0 010-1.8z" />
              </svg>
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--dsw-alias-label-primary, #0f172a)',
                }}
              >
                {isConnected ? '微信助理设置与管理' : '连接微信助理 (远程通道)'}
              </h3>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '12px',
                  color: 'var(--dsw-alias-label-tertiary, #64748b)',
                }}
              >
                随时在手机微信上给工作台指派任务，结果实时回传
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              clearPollTimer();
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
              padding: '6px',
              borderRadius: '8px',
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
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 主体内容 */}
        <div
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {isConnected ? (
            /* 已连接视图 */
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#15803d',
                    }}
                  >
                    微信通道已就绪
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#166534',
                      marginTop: '2px',
                    }}
                  >
                    服务网关正在后台保持长轮询，手机微信可随时交互
                  </div>
                </div>
              </div>

              {/* 账号详情 */}
              <div
                style={{
                  background: 'var(--dsw-alias-layer-secondary, #f8fafc)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '13px',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span
                    style={{
                      color: 'var(--dsw-alias-label-tertiary, #64748b)',
                    }}
                  >
                    绑定身份
                  </span>
                  <span
                    style={{
                      fontWeight: 500,
                      color: 'var(--dsw-alias-label-primary, #0f172a)',
                    }}
                  >
                    {status.nickName || '已绑定微信用户'}
                  </span>
                </div>
                {status.accountId && (
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <span
                      style={{
                        color: 'var(--dsw-alias-label-tertiary, #64748b)',
                      }}
                    >
                      账号标识
                    </span>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        color: 'var(--dsw-alias-label-secondary, #334155)',
                      }}
                    >
                      {status.accountId}
                    </span>
                  </div>
                )}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span
                    style={{
                      color: 'var(--dsw-alias-label-tertiary, #64748b)',
                    }}
                  >
                    通道类型
                  </span>
                  <span
                    style={{
                      color: 'var(--dsw-alias-label-secondary, #334155)',
                    }}
                  >
                    微信个人助理 (iLink)
                  </span>
                </div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span
                    style={{
                      color: 'var(--dsw-alias-label-tertiary, #64748b)',
                    }}
                  >
                    连接状态
                  </span>
                  <span
                    style={{
                      color: '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#22c55e',
                        display: 'inline-block',
                      }}
                    />
                    在线轮询中
                  </span>
                </div>
              </div>

              {/* 提示信息与按钮操作 */}
              {testSuccess && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#16a34a',
                    textAlign: 'center',
                  }}
                >
                  测试消息已成功发送至微信！
                </div>
              )}
              {errorMsg && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#ef4444',
                    textAlign: 'center',
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  onClick={handleSendTest}
                  disabled={testSending || disconnecting}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--dsw-alias-border-subtle, #e2e8f0)',
                    background: '#ffffff',
                    color: 'var(--dsw-alias-label-primary, #0f172a)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {testSending ? '发送中...' : '发送测试消息'}
                </button>
                <button
                  onClick={() => handleDisconnect(true)}
                  disabled={testSending || disconnecting}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #fee2e2',
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {disconnecting ? '处理中...' : '解绑账号'}
                </button>
              </div>
            </div>
          ) : (
            /* 未连接扫码视图 */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
              }}
            >
              {/* 二维码容器 */}
              <div
                style={{
                  width: '240px',
                  height: '240px',
                  borderRadius: '16px',
                  border: '1px solid var(--dsw-alias-border-subtle, #e2e8f0)',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden',
                }}
              >
                {loading ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        border: '3px solid #07C160',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      生成二维码中...
                    </span>
                  </div>
                ) : qrState === 'expired' ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      二维码已失效
                    </span>
                    <button
                      onClick={() => fetchQrCode()}
                      style={{
                        background: '#07C160',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      点击刷新
                    </button>
                  </div>
                ) : qrScanUrl ? (
                  <QRCodeSVG
                    value={qrScanUrl}
                    size={200}
                    level="M"
                    fgColor="#0f172a"
                    bgColor="#ffffff"
                  />
                ) : null}

                {/* 扫码中遮罩 */}
                {qrState === 'scaned' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(255, 255, 255, 0.92)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '16px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#07C160',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
                    >
                      已扫描二维码
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      请在手机微信界面点击“允许/确认”
                    </div>
                  </div>
                )}
              </div>

              {/* 状态文字 */}
              <div
                style={{
                  marginTop: '16px',
                  fontSize: '13px',
                  color: 'var(--dsw-alias-label-secondary, #475569)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: qrState === 'scaned' ? '#eab308' : '#07C160',
                    display: 'inline-block',
                  }}
                />
                <span>{statusMsg}</span>
              </div>

              {errorMsg && (
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#ef4444',
                  }}
                >
                  {errorMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
