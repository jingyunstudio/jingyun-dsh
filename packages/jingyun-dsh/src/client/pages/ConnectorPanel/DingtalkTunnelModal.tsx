import React, { useState, useEffect, useCallback } from 'react';

import {
  TunnelModalShell,
  TunnelReadyCard,
  TunnelInfoCard,
  TunnelActionButtons,
  TunnelNotice,
  TunnelFormField,
  TunnelCollapsibleGuide,
  TunnelFormButtons,
  type TunnelInfoItem,
} from './TunnelCommon.js';

export interface DingtalkTunnelModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onRefresh?: () => void;
}

interface DingtalkTunnelStateResponse {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  appKey?: string;
  robotCode?: string;
  connectedAt?: number;
  lastError?: string;
  hasConfig?: boolean;
  requireMention?: boolean;
  hasSessionWebhook?: boolean;
  hasChat?: boolean;
}

const DingtalkIcon = () => (
  <div
    style={{
      width: '38px',
      height: '38px',
      borderRadius: '10px',
      background: '#007FFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      flexShrink: 0,
    }}
  >
    <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
      <path
        d="M24 4C12.95 4 4 12.95 4 24C4 35.05 12.95 44 24 44C35.05 44 44 35.05 44 24C44 12.95 35.05 4 24 4ZM31.95 19.48C30.93 23.63 26.35 29.02 20.17 31.79C19.34 32.16 18.52 31.42 18.78 30.56C19.78 27.27 21.6 23.27 22.58 19.72C22.75 19.11 22.37 18.54 21.75 18.66C18.64 19.26 14.88 20.69 11.95 22.25C11.39 22.55 10.74 21.99 11.08 21.46C13.88 17.15 19.26 11.59 25.96 9.43C26.78 9.16 27.53 9.94 27.23 10.76C26.06 13.98 24.32 18.12 23.41 21.43C23.24 22.04 23.63 22.61 24.25 22.49C27.35 21.89 31.11 20.46 34.04 18.9C34.6 18.6 35.25 19.16 34.91 19.69C34.25 20.7 33.15 22.25 31.95 19.48Z"
        fill="#ffffff"
      />
    </svg>
  </div>
);

export const DingtalkTunnelModal: React.FC<DingtalkTunnelModalProps> = ({
  isOpen = true,
  onClose,
  onSuccess,
  onRefresh,
}) => {
  if (!isOpen) return null;

  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [status, setStatus] = useState<DingtalkTunnelStateResponse | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // 表单字段
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [robotCode, setRobotCode] = useState('');
  const [requireMention, setRequireMention] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 提示与操作状态
  const [errorMsg, setErrorMsg] = useState('');
  const [testNotice, setTestNotice] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  // 获取状态与配置回填
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/jingyun/connectors/dingtalk-tunnel/status');
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          const data = json.data as DingtalkTunnelStateResponse;
          setStatus(data);
          if (data.appKey) setAppKey(data.appKey);
          if (data.robotCode) setRobotCode(data.robotCode);
          if (data.requireMention !== undefined) {
            setRequireMention(data.requireMention);
          }
          return data;
        }
      }
    } catch (err: unknown) {
      console.warn('[DingtalkTunnelModal] Failed to fetch status:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchStatus();
    });
    const timer = setInterval(() => {
      fetchStatus();
    }, 2500);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  // 连接 / 保存
  const handleConnect = async () => {
    setErrorMsg('');
    setTestNotice('');

    if (!appKey.trim() && !status?.hasConfig) {
      setErrorMsg('请填写钉钉应用的 AppKey (Client ID)');
      return;
    }
    if (!appSecret.trim() && !status?.hasConfig) {
      setErrorMsg('请填写钉钉应用的 AppSecret (Client Secret)');
      return;
    }

    setConnecting(true);
    try {
      const payload: Record<string, unknown> = {
        requireMention,
      };
      if (appKey.trim()) payload.appKey = appKey.trim();
      if (appSecret.trim()) payload.appSecret = appSecret.trim();
      if (robotCode.trim()) payload.robotCode = robotCode.trim();

      const res = await fetch(
        '/api/jingyun/connectors/dingtalk-tunnel/connect',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error || `连接失败: HTTP ${res.status}`);
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

  // 断开长连接
  const handleDisconnect = async () => {
    setDisconnecting(true);
    setErrorMsg('');
    setTestNotice('');
    try {
      const res = await fetch(
        '/api/jingyun/connectors/dingtalk-tunnel/disconnect',
        {
          method: 'POST',
        }
      );
      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error || '断开连接失败');
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

  // 清除配置
  const handleClear = async () => {
    if (
      !confirm(
        '确定要清除本地保存的钉钉远程通道配置吗？清除后将断开当前 Stream 连接并清空凭据。'
      )
    ) {
      return;
    }

    setClearing(true);
    setErrorMsg('');
    setTestNotice('');
    try {
      const res = await fetch('/api/jingyun/connectors/dingtalk-tunnel/clear', {
        method: 'POST',
      });
      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error || '清除配置失败');
      }
      setAppKey('');
      setAppSecret('');
      setRobotCode('');
      setIsEditing(false);
      await fetchStatus();
      onRefresh?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setClearing(false);
    }
  };

  // 发送测试消息
  const handleTestSend = async () => {
    setTestSending(true);
    setErrorMsg('');
    setTestNotice('');
    try {
      const res = await fetch('/api/jingyun/connectors/dingtalk-tunnel/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content:
            '🎉 钉钉智能助理连接测试成功！工作台与钉钉 Stream 通道已就绪。',
          title: '智能助理测试消息',
        }),
      });
      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error || '发送测试消息失败');
      }
      setTestNotice('✅ 测试消息已成功推送到钉钉！');
      setTimeout(() => setTestNotice(''), 5000);
      await fetchStatus();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setTestSending(false);
    }
  };

  const isConnected = status?.status === 'connected';
  const isConnecting = status?.status === 'connecting' || connecting;

  // 已就绪状态信息条目
  const infoItems: TunnelInfoItem[] = [
    {
      label: '绑定身份',
      value: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#22c55e',
              display: 'inline-block',
            }}
          />
          钉钉智能助理
        </span>
      ),
    },
  ];

  const modalTitle =
    isConnected && !isEditing
      ? '钉钉助理设置与管理'
      : isEditing
        ? '修改钉钉配置'
        : '连接钉钉助理 (远程通道)';

  return (
    <TunnelModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={<DingtalkIcon />}
      title={modalTitle}
      subtitle="随时在钉钉上给工作台指派任务，结果实时回传"
      maxWidth="480px"
    >
      {/* 已连接视图 (Connected View) */}
      {isConnected && !isEditing ? (
        <>
          <TunnelReadyCard
            channelName="钉钉"
            subtitle="钉钉可随时交互，AI 任务结果将实时回传"
            badgeText="运行中"
          />

          <TunnelInfoCard items={infoItems} />

          {!status?.hasSessionWebhook && !status?.hasChat && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--dsw-alias-label-secondary, #475569)',
                background: 'var(--dsw-alias-layer-secondary, #f8fafc)',
                border: '1px solid var(--dsw-alias-border-subtle, #e2e8f0)',
                borderRadius: '8px',
                padding: '10px 14px',
                lineHeight: '1.5',
              }}
            >
              💡 <strong>首次使用指引：</strong>通道已连通！请在钉钉群中 @机器人
              或在单聊中发送一条任意消息（如“hi”），即可自动绑定会话通道。
            </div>
          )}

          <TunnelNotice notice={testNotice} error={errorMsg} />

          <TunnelActionButtons
            onTestSend={handleTestSend}
            isTestSending={testSending}
            onEdit={() => {
              setIsEditing(true);
              setErrorMsg('');
              setTestNotice('');
            }}
            onDisconnect={handleDisconnect}
            isDisconnecting={disconnecting}
          />
        </>
      ) : (
        /* 未连接或编辑视图 (Form View) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <TunnelNotice notice={testNotice} error={errorMsg} />

          <TunnelFormField label="AppKey (Client ID)" required>
            <input
              type="text"
              value={appKey}
              onChange={(e) => setAppKey(e.target.value)}
              placeholder="例如 ding0abcdef123456"
              disabled={isConnecting}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid var(--dsw-alias-border-subtle, #cbd5e1)',
                backgroundColor: 'var(--dsw-alias-layer-secondary, #ffffff)',
                color: 'var(--dsw-alias-label-primary, #0f172a)',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </TunnelFormField>

          <TunnelFormField label="AppSecret (Client Secret)" required>
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
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder={
                  status?.hasConfig
                    ? '•••••••••••••••• (已保存，无需修改留空即可)'
                    : '钉钉企业内部应用 AppSecret'
                }
                disabled={isConnecting}
                style={{
                  width: '100%',
                  padding: '9px 38px 9px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid var(--dsw-alias-border-subtle, #cbd5e1)',
                  backgroundColor: 'var(--dsw-alias-layer-secondary, #ffffff)',
                  color: 'var(--dsw-alias-label-primary, #0f172a)',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: showSecret ? 'inherit' : 'monospace',
                }}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                title={showSecret ? '隐藏 AppSecret' : '显示 AppSecret'}
                aria-label={showSecret ? '隐藏 AppSecret' : '显示 AppSecret'}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  color: showSecret
                    ? '#007FFF'
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
          </TunnelFormField>

          {/* 高级配置项展开 */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                fontSize: '12px',
                color: '#007FFF',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 500,
              }}
            >
              <span>{showAdvanced ? '收起高级设置' : '展开高级设置'}</span>
              <span>{showAdvanced ? '▲' : '▼'}</span>
            </button>
            {showAdvanced && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'var(--dsw-alias-layer-secondary, #f8fafc)',
                  border: '1px solid var(--dsw-alias-border-subtle, #e2e8f0)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <TunnelFormField
                  label="RobotCode (选填)"
                  hint="机器人编码，默认与 AppKey 一致"
                >
                  <input
                    type="text"
                    value={robotCode}
                    onChange={(e) => setRobotCode(e.target.value)}
                    placeholder="选填，默认为与 AppKey 相同"
                    disabled={isConnecting}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border:
                        '1px solid var(--dsw-alias-border-subtle, #cbd5e1)',
                      backgroundColor:
                        'var(--dsw-alias-layer-secondary, #ffffff)',
                      color: 'var(--dsw-alias-label-primary, #0f172a)',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </TunnelFormField>
              </div>
            )}
          </div>

          {/* 勾选设置 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="dingtalk-require-mention"
              checked={requireMention}
              onChange={(e) => setRequireMention(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label
              htmlFor="dingtalk-require-mention"
              style={{
                fontSize: '12px',
                color: 'var(--dsw-alias-label-secondary, #475569)',
                cursor: 'pointer',
              }}
            >
              群聊中仅当被 @ 机器人时响应（推荐开启，避免在普通群聊中产生干扰）
            </label>
          </div>

          {/* 表单底部操作按钮 */}
          <TunnelFormButtons
            submitText={
              isConnecting
                ? '连接中...'
                : isConnected
                  ? '保存并重启连接'
                  : '保存并启动连接'
            }
            onSubmit={handleConnect}
            isSubmitting={isConnecting}
            accentColor="#007FFF"
            onClear={status?.hasConfig && !isEditing ? handleClear : undefined}
            isClearing={clearing}
            onCancel={
              isEditing
                ? () => {
                    setIsEditing(false);
                    setErrorMsg('');
                  }
                : undefined
            }
            onClose={onClose}
          />

          {/* 可折叠钉钉开放平台指引 */}
          <TunnelCollapsibleGuide
            title={
              showGuide
                ? '收起钉钉开放平台配置指引'
                : '查看钉钉开放平台配置指引 (Stream 模式)'
            }
            isOpen={showGuide}
            onToggle={() => setShowGuide(!showGuide)}
            accentColor="#007FFF"
          >
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <div>
                <strong>1. 创建内部应用：</strong>登录{' '}
                <a
                  href="https://open-dev.dingtalk.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#007FFF' }}
                >
                  钉钉开放平台
                </a>
                ，进入「应用开发」→「企业内部开发」→「创建应用」。
              </div>
              <div>
                <strong>2. 获取凭据：</strong>在「凭证与基础信息」中获取{' '}
                <code>AppKey</code> (Client ID) 与 <code>AppSecret</code>{' '}
                (Client Secret)。
              </div>
              <div>
                <strong>3. 开启机器人能力：</strong>
                在左侧导航点击「添加应用能力」→「机器人」，开启机器人配置；将“消息接收模式”切换为{' '}
                <strong>Stream 模式</strong>（无需公网域名或回调地址）。
              </div>
              <div>
                <strong>4. 开通所需权限：</strong>
                在「权限管理」中搜索并申请开通以下 3 项权限：
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  <li>
                    <code>Card.Streaming.Write</code>
                  </li>
                  <li>
                    <code>Card.Instance.Write</code>
                  </li>
                  <li>
                    <code>qyapi_robot_sendmsg</code>
                  </li>
                </ul>
              </div>
              <div>
                <strong>5. 发布新版本（必做）：</strong>
                在左侧导航点击「版本管理与发布」→「发布新版本」，设置版本号与可见范围后发布应用。发布上线后机器人与权限方可在企业内正式生效。
              </div>
              <div>
                <strong>6. 开始使用：</strong>
                在钉钉群中添加该机器人，或在单聊中直接向机器人发送消息即可开始交互。
              </div>
            </div>
          </TunnelCollapsibleGuide>
        </div>
      )}
    </TunnelModalShell>
  );
};
