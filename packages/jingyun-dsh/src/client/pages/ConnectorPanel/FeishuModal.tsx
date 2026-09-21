import React, { useState, useEffect, useCallback } from 'react';

import { RECOMMENDED_FEISHU_SCOPES_JSON } from '../../../connectors/feishu-types.js';

export interface FeishuModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onRefresh?: () => void;
}

interface FeishuStateResponse {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
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

const FeishuIcon = () => (
  <div
    style={{
      width: '38px',
      height: '38px',
      borderRadius: '10px',
      background: '#3370FF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      flexShrink: 0,
    }}
  >
    <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
      <path
        d="M24 4C12.95 4 4 12.95 4 24C4 35.05 12.95 44 24 44C35.05 44 44 35.05 44 24C44 12.95 35.05 4 24 4ZM28.59 29.83L24 34.42L19.41 29.83C15.82 26.24 15.82 20.41 19.41 16.82C23 13.23 28.83 13.23 32.42 16.82C36.01 20.41 36.01 26.24 32.42 29.83H28.59ZM24 24C25.1 24 26 23.1 26 22C26 20.9 25.1 20 24 20C22.9 20 22 20.9 22 22C22 23.1 22.9 24 24 24Z"
        fill="#ffffff"
      />
    </svg>
  </div>
);

export const FeishuModal: React.FC<FeishuModalProps> = ({
  isOpen = true,
  onClose,
  onSuccess,
  onRefresh,
}) => {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [status, setStatus] = useState<FeishuStateResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // 表单字段
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [encryptKey, setEncryptKey] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [domain, setDomain] = useState<'feishu' | 'lark'>('feishu');
  const [customHost, setCustomHost] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [requireMention, setRequireMention] = useState(true);

  // 提示信息
  const [errorMsg, setErrorMsg] = useState('');
  const [testNotice, setTestNotice] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [copiedScopes, setCopiedScopes] = useState(false);
  const [showScopesJson, setShowScopesJson] = useState(false);

  // 复制推荐权限 JSON
  const handleCopyScopes = async () => {
    try {
      await navigator.clipboard.writeText(RECOMMENDED_FEISHU_SCOPES_JSON);
      setCopiedScopes(true);
      setTimeout(() => setCopiedScopes(false), 3000);
    } catch (err) {
      console.warn('[FeishuModal] Clipboard copy failed:', err);
      setErrorMsg(
        '复制到剪贴板失败，请点击下方「预览 JSON 清单」进行手动复制。'
      );
    }
  };

  // 获取状态与配置回填
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/jingyun/connectors/feishu/status');
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          const data = json.data as FeishuStateResponse;
          setStatus(data);
          if (data.appId) setAppId(data.appId);
          if (data.customHost) setCustomHost(data.customHost);
          if (data.domain) setDomain(data.domain);
          if (data.requireMention !== undefined) {
            setRequireMention(data.requireMention);
          }
          return data;
        }
      }
    } catch (err: unknown) {
      console.warn('[FeishuModal] Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchStatus();
    });
    const timer = setInterval(() => {
      fetchStatus();
    }, 2000);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  // 连接 / 保存
  const handleConnect = async () => {
    setErrorMsg('');
    setTestNotice('');

    if (!appId.trim() && !status?.hasConfig) {
      setErrorMsg('请填写飞书自建应用的 App ID');
      return;
    }
    if (!appSecret.trim() && !status?.hasConfig) {
      setErrorMsg('请填写飞书自建应用的 App Secret');
      return;
    }

    setConnecting(true);
    try {
      const payload: Record<string, unknown> = {
        domain,
        customHost: customHost.trim() || undefined,
        requireMention,
      };
      if (appId.trim()) payload.appId = appId.trim();
      if (appSecret.trim()) payload.appSecret = appSecret.trim();
      if (encryptKey.trim()) payload.encryptKey = encryptKey.trim();
      if (verificationToken.trim()) {
        payload.verificationToken = verificationToken.trim();
      }

      const res = await fetch('/api/jingyun/connectors/feishu/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `连接失败: HTTP ${res.status}`);
      }

      setIsEditing(false);
      await fetchStatus();
      onSuccess?.();
      onRefresh?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  };

  // 断开连接
  const handleDisconnect = async () => {
    setDisconnecting(true);
    setErrorMsg('');
    setTestNotice('');
    try {
      const res = await fetch('/api/jingyun/connectors/feishu/disconnect', {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || '断开连接失败');
      }
      setIsEditing(false);
      await fetchStatus();
      onRefresh?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setDisconnecting(false);
    }
  };

  // 发送测试消息
  const handleSendTest = async () => {
    setTestSending(true);
    setErrorMsg('');
    setTestNotice('');
    try {
      const res = await fetch('/api/jingyun/connectors/feishu/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '🎉 飞书助理连接测试成功！工作台与飞书通道已就绪。',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || '测试消息发送失败');
      }
      setTestNotice('测试消息已成功发送至飞书，请查收！');
      await fetchStatus();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setTestSending(false);
    }
  };

  // 清除配置
  const handleClear = async () => {
    if (!confirm('确定要清除飞书通道配置吗？清除后需重新填入凭据连接。')) {
      return;
    }
    setClearing(true);
    setErrorMsg('');
    setTestNotice('');
    try {
      const res = await fetch('/api/jingyun/connectors/feishu/clear', {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || '清除配置失败');
      }
      setAppId('');
      setAppSecret('');
      setEncryptKey('');
      setVerificationToken('');
      setShowSecret(false);
      setIsEditing(false);
      await fetchStatus();
      onRefresh?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setClearing(false);
    }
  };

  const isConnected = status?.status === 'connected';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Header */}
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
            <FeishuIcon />
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--dsw-alias-label-primary, #0f172a)',
                }}
              >
                {isConnected && !isEditing
                  ? '飞书助理设置与管理'
                  : isEditing
                    ? '修改飞书配置'
                    : '连接飞书助理 (远程通道)'}
              </h3>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '12px',
                  color: 'var(--dsw-alias-label-tertiary, #64748b)',
                }}
              >
                随时在飞书上给工作台指派任务，结果实时回传
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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

        {/* Content */}
        <div
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
          }}
        >
          {loading ? (
            <div
              style={{
                padding: '32px 0',
                textAlign: 'center',
                color: 'var(--dsw-alias-label-tertiary, #64748b)',
                fontSize: '13px',
              }}
            >
              正在检查飞书通道状态...
            </div>
          ) : isConnected && !isEditing ? (
            /* 已连接视图 (Connected View) - 极简就绪卡片 */
            <>
              {/* 绿色就绪状态卡片 */}
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>飞书通道已就绪</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#16a34a',
                        background: '#dcfce7',
                        padding: '1px 8px',
                        borderRadius: '9999px',
                      }}
                    >
                      运行中
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#166534',
                      marginTop: '2px',
                    }}
                  >
                    飞书可随时交互，AI 任务结果将实时回传
                  </div>
                </div>
              </div>

              {/* 绑定身份 */}
              <div
                style={{
                  background: 'var(--dsw-alias-layer-secondary, #f8fafc)',
                  border: '1px solid var(--dsw-alias-border-subtle, #e2e8f0)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '13px',
                }}
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
                      background: '#22c55e',
                      display: 'inline-block',
                    }}
                  />
                  {status?.botName || '飞书助理机器人'}
                </span>
              </div>

              {/* 结果提示 */}
              {testNotice && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#16a34a',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    textAlign: 'center',
                    lineHeight: '1.5',
                  }}
                >
                  {testNotice}
                </div>
              )}
              {errorMsg && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#ef4444',
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    textAlign: 'center',
                  }}
                >
                  {errorMsg}
                </div>
              )}

              {/* 操作按钮区 */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
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
                    cursor:
                      testSending || disconnecting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                  {testSending ? '正在测试...' : '发送测试消息'}
                </button>

                <button
                  onClick={() => {
                    setIsEditing(true);
                    setErrorMsg('');
                    setTestNotice('');
                  }}
                  disabled={disconnecting}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--dsw-alias-border-subtle, #e2e8f0)',
                    background: '#ffffff',
                    color: 'var(--dsw-alias-label-secondary, #475569)',
                    fontSize: '13px',
                    cursor: disconnecting ? 'not-allowed' : 'pointer',
                  }}
                >
                  修改配置
                </button>

                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #fee2e2',
                    background: '#fef2f2',
                    color: '#ef4444',
                    fontSize: '13px',
                    cursor: disconnecting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {disconnecting ? '断开中...' : '断开'}
                </button>
              </div>
            </>
          ) : (
            /* 编辑 / 未连接表单视图 - 极简输入 */
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    marginBottom: '6px',
                    color: 'var(--dsw-alias-label-secondary, #334155)',
                  }}
                >
                  App ID <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={appId}
                  placeholder="例如：cli_a1b2c3d4e5f6..."
                  onChange={(e) => setAppId(e.target.value)}
                  disabled={connecting}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid var(--dsw-alias-border-subtle, #cbd5e1)',
                    backgroundColor:
                      'var(--dsw-alias-layer-secondary, #ffffff)',
                    color: 'var(--dsw-alias-label-primary, #0f172a)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    marginBottom: '6px',
                    color: 'var(--dsw-alias-label-secondary, #334155)',
                  }}
                >
                  App Secret <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={appSecret}
                    placeholder={
                      status?.hasConfig
                        ? '•••••••••••••••• (已保存，无需修改留空即可)'
                        : '飞书自建应用 App Secret'
                    }
                    onChange={(e) => setAppSecret(e.target.value)}
                    disabled={connecting}
                    style={{
                      width: '100%',
                      padding: '9px 38px 9px 12px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border:
                        '1px solid var(--dsw-alias-border-subtle, #cbd5e1)',
                      backgroundColor:
                        'var(--dsw-alias-layer-secondary, #ffffff)',
                      color: 'var(--dsw-alias-label-primary, #0f172a)',
                      boxSizing: 'border-box',
                      outline: 'none',
                      fontFamily: showSecret ? 'inherit' : 'monospace',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    title={showSecret ? '隐藏 App Secret' : '显示 App Secret'}
                    aria-label={
                      showSecret ? '隐藏 App Secret' : '显示 App Secret'
                    }
                    style={{
                      position: 'absolute',
                      right: '8px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '6px',
                      color: showSecret
                        ? '#3370ff'
                        : 'var(--dsw-alias-label-tertiary, #94a3b8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showSecret ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* 高级选项折叠 */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '12px',
                    color: 'var(--dsw-alias-label-tertiary, #64748b)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{
                      transform: showAdvanced ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                  <span>
                    {showAdvanced ? '收起高级设置' : '展开高级设置 (选填)'}
                  </span>
                </button>

                {showAdvanced && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '12px',
                      background: 'var(--dsw-alias-layer-secondary, #f8fafc)',
                      border:
                        '1px solid var(--dsw-alias-border-subtle, #e2e8f0)',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      fontSize: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="domain"
                            checked={domain === 'feishu'}
                            onChange={() => setDomain('feishu')}
                          />
                          <span>飞书 (国内)</span>
                        </label>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="domain"
                            checked={domain === 'lark'}
                            onChange={() => setDomain('lark')}
                          />
                          <span>Lark (海外)</span>
                        </label>
                      </div>

                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={requireMention}
                          onChange={(e) => setRequireMention(e.target.checked)}
                        />
                        <span>群聊需 @ 机器人</span>
                      </label>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            display: 'block',
                            marginBottom: '4px',
                            color: '#64748b',
                          }}
                        >
                          Encrypt Key
                        </span>
                        <input
                          type="password"
                          value={encryptKey}
                          placeholder="订阅加密密钥"
                          onChange={(e) => setEncryptKey(e.target.value)}
                          disabled={connecting}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border:
                              '1px solid var(--dsw-alias-border-subtle, #cbd5e1)',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div>
                        <span
                          style={{
                            display: 'block',
                            marginBottom: '4px',
                            color: '#64748b',
                          }}
                        >
                          Verification Token
                        </span>
                        <input
                          type="text"
                          value={verificationToken}
                          placeholder="校验 Token"
                          onChange={(e) => setVerificationToken(e.target.value)}
                          disabled={connecting}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border:
                              '1px solid var(--dsw-alias-border-subtle, #cbd5e1)',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <span
                        style={{
                          display: 'block',
                          marginBottom: '4px',
                          color: '#64748b',
                        }}
                      >
                        专有云自定义 Host
                      </span>
                      <input
                        type="text"
                        value={customHost}
                        placeholder="https://open.feishu.mycompany.com"
                        onChange={(e) => setCustomHost(e.target.value)}
                        disabled={connecting}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          border:
                            '1px solid var(--dsw-alias-border-subtle, #cbd5e1)',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 获取配置说明指引 */}
              <div style={{ marginTop: '2px' }}>
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '12px',
                    color: '#3370ff',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>
                    {showGuide ? '收起配置获取说明' : '如何获取飞书配置？'}
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{
                      transform: showGuide ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {showGuide && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '14px',
                      borderRadius: '8px',
                      backgroundColor:
                        'var(--dsw-alias-layer-secondary, #f8fafc)',
                      border:
                        '1px solid var(--dsw-alias-border-subtle, #e2e8f0)',
                      fontSize: '12px',
                      lineHeight: '1.6',
                      color: 'var(--dsw-alias-label-secondary, #475569)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: 'var(--dsw-alias-label-primary, #0f172a)',
                        }}
                      >
                        飞书自建应用接入步骤
                      </span>
                      <a
                        href="https://open.feishu.cn"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#3370ff',
                          textDecoration: 'none',
                          fontSize: '11px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <span>打开开放平台</span>
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                        </svg>
                      </a>
                    </div>

                    <ol
                      style={{
                        margin: 0,
                        paddingLeft: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <li>
                        <strong>创建自建应用</strong>：登录{' '}
                        <a
                          href="https://open.feishu.cn"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#3370ff', textDecoration: 'none' }}
                        >
                          open.feishu.cn
                        </a>{' '}
                        进入「开发者后台」，点击「创建企业自建应用」。
                      </li>
                      <li>
                        <strong>获取凭证</strong>：在「凭证与基础信息」中复制{' '}
                        <code
                          style={{
                            background: 'rgba(51, 112, 255, 0.08)',
                            color: '#3370ff',
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          App ID
                        </code>{' '}
                        与{' '}
                        <code
                          style={{
                            background: 'rgba(51, 112, 255, 0.08)',
                            color: '#3370ff',
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          App Secret
                        </code>{' '}
                        填入上方。
                      </li>
                      <li>
                        <strong>添加机器人</strong>
                        ：在左侧导航进入「添加应用能力」，添加「机器人」应用能力。
                      </li>
                      <li>
                        <strong>开启长连接事件</strong>
                        ：在「事件与回调」中将获取方式设为「
                        <strong>使用长连接获取事件 (WebSocket)</strong>
                        」，并添加事件{' '}
                        <code
                          style={{
                            background: 'rgba(51, 112, 255, 0.08)',
                            color: '#3370ff',
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          im.message.receive_v1
                        </code>{' '}
                        (接收消息)。
                      </li>
                      <li>
                        <strong>开通权限（推荐使用「批量导入」）</strong>
                        ：在「权限管理」中开通消息与通讯录等核心权限。
                        <div
                          style={{
                            marginTop: '6px',
                            padding: '10px 12px',
                            background: '#ffffff',
                            border:
                              '1px solid var(--dsw-alias-border-subtle, #e2e8f0)',
                            borderRadius: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <div style={{ fontSize: '12px', color: '#334155' }}>
                            💡 <strong>一键批量导入</strong>
                            ：无需逐项查找。点击复制下方
                            JSON，前往开放平台「权限管理」页面，点击右上角「
                            <strong>批量导入</strong>
                            」并粘贴即可一键开通全量所需权限！
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <button
                              type="button"
                              onClick={handleCopyScopes}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: copiedScopes
                                  ? '1px solid #22c55e'
                                  : '1px solid #3370ff',
                                background: copiedScopes
                                  ? '#f0fdf4'
                                  : '#3370ff',
                                color: copiedScopes ? '#16a34a' : '#ffffff',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {copiedScopes ? (
                                <>
                                  <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  <span>已复制权限 JSON！前往批量导入</span>
                                </>
                              ) : (
                                <>
                                  <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <rect
                                      x="9"
                                      y="9"
                                      width="13"
                                      height="13"
                                      rx="2"
                                      ry="2"
                                    />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                  </svg>
                                  <span>复制推荐权限配置 (JSON)</span>
                                </>
                              )}
                            </button>

                            <a
                              href={
                                status?.appId || appId.trim()
                                  ? `https://open.feishu.cn/app/${status?.appId || appId.trim()}/auth`
                                  : 'https://open.feishu.cn/app'
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border:
                                  '1px solid var(--dsw-alias-border-subtle, #cbd5e1)',
                                background: '#ffffff',
                                color:
                                  'var(--dsw-alias-label-primary, #0f172a)',
                                textDecoration: 'none',
                                fontSize: '12px',
                                fontWeight: 500,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span>前往权限管理</span>
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M10 14L21 3" />
                              </svg>
                            </a>

                            <button
                              type="button"
                              onClick={() => setShowScopesJson(!showScopesJson)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                fontSize: '11px',
                                cursor: 'pointer',
                                padding: '4px 6px',
                                textDecoration: 'underline',
                              }}
                            >
                              {showScopesJson
                                ? '隐藏 JSON 预览'
                                : '预览 JSON 清单'}
                            </button>
                          </div>

                          {showScopesJson && (
                            <pre
                              style={{
                                margin: 0,
                                padding: '10px',
                                borderRadius: '6px',
                                background: '#1e293b',
                                color: '#f8fafc',
                                fontSize: '11px',
                                lineHeight: '1.4',
                                maxHeight: '180px',
                                overflowY: 'auto',
                                fontFamily: 'monospace',
                              }}
                            >
                              {RECOMMENDED_FEISHU_SCOPES_JSON}
                            </pre>
                          )}
                        </div>
                      </li>
                      <li>
                        <strong>发布新版本上线（必做）</strong>
                        ：开通权限后，前往「
                        <a
                          href={
                            status?.appId || appId.trim()
                              ? `https://open.feishu.cn/app/${status?.appId || appId.trim()}/version`
                              : 'https://open.feishu.cn/app'
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#3370ff', fontWeight: 600 }}
                        >
                          版本管理与发布
                        </a>
                        」创建新版本并申请发布。发布上线后权限才会在生产环境的聊天窗口中生效！
                      </li>
                    </ol>
                  </div>
                )}
              </div>

              {/* 错误信息 */}
              {errorMsg && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#ef4444',
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    textAlign: 'center',
                  }}
                >
                  {errorMsg}
                </div>
              )}

              {/* 操作按钮栏 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '6px',
                }}
              >
                <div>
                  {status?.hasConfig && !isEditing && (
                    <button
                      type="button"
                      onClick={handleClear}
                      disabled={clearing}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '12px',
                        cursor: clearing ? 'not-allowed' : 'pointer',
                        padding: 0,
                      }}
                    >
                      {clearing ? '清除中...' : '清除配置'}
                    </button>
                  )}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setErrorMsg('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--dsw-alias-label-secondary, #64748b)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      取消修改
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: '8px 14px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border:
                        '1px solid var(--dsw-alias-border-subtle, #cbd5e1)',
                      background: '#ffffff',
                      color: 'var(--dsw-alias-label-secondary, #475569)',
                      cursor: 'pointer',
                    }}
                  >
                    关闭
                  </button>
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connecting}
                    style={{
                      padding: '8px 18px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#3370ff',
                      color: '#ffffff',
                      fontWeight: 500,
                      cursor: connecting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {connecting
                      ? '连接中...'
                      : isConnected
                        ? '保存并重启连接'
                        : '保存并启动连接'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
