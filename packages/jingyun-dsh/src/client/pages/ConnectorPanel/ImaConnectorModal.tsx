import React, { useState, useEffect } from 'react';

import { showToast } from '../../components/BrandBranding';

// 腾讯 ima 品牌图标 (对齐全站 Connector 图标规范)
export const ImaBrandIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="48" height="48" rx="12" fill="#00C777" />
    <circle cx="16" cy="22" r="3.5" fill="white" />
    <circle cx="32" cy="22" r="3.5" fill="white" />
    <ellipse cx="24" cy="28" rx="3" ry="2" fill="white" />
  </svg>
);
export const ImaCatLogo = ImaBrandIcon;

export interface ImaConnectorModalProps {
  isOpen: boolean;
  status: 'connected' | 'disconnected';
  nickname?: string;
  defaultKbId?: string;
  onClose: () => void;
  onRefresh?: () => void;
  onTryIt?: () => void;
  onSendPrompt?: (text: string) => void;
}

export const ImaConnectorModal: React.FC<ImaConnectorModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [defaultKbId, setDefaultKbId] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  // 打开弹窗时，回填已有配置（若是修改配置，回填已有项）
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/jingyun/connectors/ima/status')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          if (json.data.clientId) setClientId(json.data.clientId);
          if (json.data.defaultKbId) setDefaultKbId(json.data.defaultKbId);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleClose = () => {
    setApiKey('');
    onClose();
  };

  // 智能粘贴解析：支持将从官方复制的段落自动拆分提取
  const trySmartParse = (text: string) => {
    const idMatch = text.match(/client[_\s-]?id[:：\s]+([^\s\r\n]+)/i);
    const keyMatch = text.match(/api[_\s-]?key[:：\s]+([^\s\r\n]+)/i);
    let matched = false;
    if (idMatch && idMatch[1]) {
      setClientId(idMatch[1].trim());
      matched = true;
    }
    if (keyMatch && keyMatch[1]) {
      setApiKey(keyMatch[1].trim());
      matched = true;
    }
    return matched;
  };

  // 保存 API Key 与 Client ID 连接
  const handleSaveConnect = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!apiKey.trim()) {
      showToast('请输入有效的 ima API Key');
      return;
    }
    if (!clientId.trim()) {
      showToast('请输入 ima Client ID（官方技能必须提供 Client ID）');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/jingyun/connectors/ima/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          clientId: clientId.trim(),
          defaultKbId: defaultKbId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('腾讯 ima 知识库连接配置已保存');
        if (onRefresh) onRefresh();
        handleClose();
      } else {
        showToast(data.error || '保存连接失败，请重试');
      }
    } catch {
      showToast('网络请求异常，请检查服务状态');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        animation: 'fade-in 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="jy-detail-modal"
        style={{
          width: '460px',
          maxWidth: '92vw',
          maxHeight: '90vh',
          background: 'var(--dsw-alias-bg-layer-2, #ffffff)',
          borderRadius: '16px',
          border:
            '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          boxSizing: 'border-box',
          position: 'relative',
          animation: 'slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 (对齐 ConnectorDetailModal 规范) */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'transparent',
            border: 'none',
            color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color =
              'var(--dsw-alias-label-primary, #0f172a)';
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color =
              'var(--dsw-alias-label-tertiary, #94a3b8)';
            e.currentTarget.style.background = 'transparent';
          }}
          aria-label="关闭"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* 头部标题与图标 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(0, 199, 119, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ImaBrandIcon size={24} />
          </div>
          <div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--dsw-alias-label-primary, #0f172a)',
                lineHeight: 1.4,
              }}
            >
              配置腾讯 ima 知识库
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--dsw-alias-label-tertiary, #64748b)',
                marginTop: '2px',
              }}
            >
              打通个人知识库与笔记检索能力 (官方 ima-skill)
            </div>
          </div>
        </div>

        {/* 表单区域 */}
        <form onSubmit={handleSaveConnect}>
          {/* API Key */}
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--dsw-alias-label-primary, #1e293b)',
                }}
              >
                API Key
                <span
                  style={{
                    color: 'var(--dsw-alias-color-danger-base, #ef4444)',
                    marginLeft: '4px',
                  }}
                >
                  *
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0',
                  fontSize: '12px',
                  color: 'var(--dsw-alias-brand-primary, #3b82f6)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
            <input
              className="jy-field-input"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                if (!trySmartParse(e.target.value)) {
                  setApiKey(e.target.value);
                }
              }}
              placeholder="请输入 ima 官方 API Key (例如 ima_ak_xxxx)"
              style={{ width: '100%', height: '36px' }}
              required
            />
          </div>

          {/* Client ID */}
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--dsw-alias-label-primary, #1e293b)',
                marginBottom: '6px',
              }}
            >
              Client ID
              <span
                style={{
                  color: 'var(--dsw-alias-color-danger-base, #ef4444)',
                  marginLeft: '4px',
                }}
              >
                *
              </span>
            </label>
            <input
              className="jy-field-input"
              type="text"
              value={clientId}
              onChange={(e) => {
                if (!trySmartParse(e.target.value)) {
                  setClientId(e.target.value);
                }
              }}
              placeholder="请输入 ima 官方 Client ID"
              style={{ width: '100%', height: '36px' }}
              required
            />
          </div>

          {/* 默认知识库 ID */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--dsw-alias-label-primary, #1e293b)',
                marginBottom: '6px',
              }}
            >
              默认知识库 ID
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                  fontWeight: 400,
                  marginLeft: '6px',
                }}
              >
                (选填)
              </span>
            </label>
            <input
              className="jy-field-input"
              type="text"
              value={defaultKbId}
              onChange={(e) => setDefaultKbId(e.target.value)}
              placeholder="指定默认检索知识库，留空则检索全部"
              style={{ width: '100%', height: '36px' }}
            />
          </div>

          {/* 提示指引卡片 (对齐 DSH 紧凑轻量风格) */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'var(--dsw-alias-bg-subtle, rgba(0, 0, 0, 0.02))',
              border:
                '1px solid var(--dsw-alias-border-subtle, var(--dsw-alias-border, #e2e8f0))',
              fontSize: '12px',
              color: 'var(--dsw-alias-label-secondary, #64748b)',
              lineHeight: '1.6',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: '4px',
                color: 'var(--dsw-alias-label-primary, #0f172a)',
                display: 'flex',
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
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              获取凭证指引
            </div>
            <div>
              1. 登录腾讯 ima 官方配置页：
              <code
                style={{
                  background: 'rgba(0, 0, 0, 0.04)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  color: 'var(--dsw-alias-brand-primary, #3b82f6)',
                  fontFamily: 'monospace',
                }}
              >
                ima.qq.com/agent-interface
              </code>
            </div>
            <div>
              2. 复制你的 Client ID 与 API Key（官方技能必须同时提供两者）。
            </div>
            <div>
              3. 保存后，智能体将自动通过内置{' '}
              <code
                style={{
                  background: 'rgba(0, 0, 0, 0.04)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                }}
              >
                ima-skill
              </code>{' '}
              执行知识库与笔记检索。
            </div>
          </div>

          {/* 底部按钮 (完全复用 DSH 原生类名与高度) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '16px',
              borderTop:
                '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #f1f5f9))',
            }}
          >
            <button
              type="button"
              className="jy-btn-secondary"
              onClick={handleClose}
              style={{
                height: '34px',
                padding: '0 16px',
                borderRadius: '8px',
                border:
                  '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
                background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
                color: 'var(--dsw-alias-label-primary, #334155)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              取消
            </button>
            <button
              type="submit"
              className="jy-btn-primary"
              disabled={saving}
              style={{
                height: '34px',
                padding: '0 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--dsw-alias-bg-button-primary, #0f172a)',
                color: 'var(--dsw-alias-label-inverse, #ffffff)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                opacity: saving ? 0.6 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {saving ? '正在保存...' : '保存并连接'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
