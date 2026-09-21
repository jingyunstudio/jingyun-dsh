import React from 'react';

// ==================== 1. 弹窗外壳骨架 ====================
export interface TunnelModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badgeText?: string;
  badgeColor?: string;
  maxWidth?: string;
  children: React.ReactNode;
}

export const TunnelModalShell: React.FC<TunnelModalShellProps> = ({
  isOpen,
  onClose,
  icon,
  title,
  subtitle,
  badgeText,
  badgeColor = '#007FFF',
  maxWidth = '480px',
  children,
}) => {
  if (!isOpen) return null;

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
          maxWidth,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
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
            {icon}
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
                  {title}
                </h3>
                {badgeText && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: badgeColor,
                      background: `${badgeColor}18`,
                      padding: '1px 8px',
                      borderRadius: '9999px',
                      fontWeight: 500,
                    }}
                  >
                    {badgeText}
                  </span>
                )}
              </div>
              <p
                style={{
                  margin: '3px 0 0 0',
                  fontSize: '12px',
                  color: 'var(--dsw-alias-label-tertiary, #64748b)',
                }}
              >
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
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

        {/* 弹窗内容区域 */}
        <div
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

// ==================== 2. 通道就绪状态卡片 ====================
export interface TunnelReadyCardProps {
  channelName: string;
  subtitle?: string;
  badgeText?: string;
}

export const TunnelReadyCard: React.FC<TunnelReadyCardProps> = ({
  channelName,
  subtitle,
  badgeText = '运行中',
}) => {
  return (
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
          <span>{channelName}通道已就绪</span>
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
            {badgeText}
          </span>
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#166534',
            marginTop: '2px',
          }}
        >
          {subtitle || `${channelName}可随时交互，AI 任务结果将实时回传`}
        </div>
      </div>
    </div>
  );
};

// ==================== 3. 详细信息条目卡片 ====================
export interface TunnelInfoItem {
  label: string;
  value: React.ReactNode;
}

export const TunnelInfoCard: React.FC<{ items: TunnelInfoItem[] }> = ({
  items,
}) => {
  return (
    <div
      style={{
        background: 'var(--dsw-alias-layer-secondary, #f8fafc)',
        border: '1px solid var(--dsw-alias-border-subtle, #e2e8f0)',
        borderRadius: '10px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
          }}
        >
          <span style={{ color: 'var(--dsw-alias-label-tertiary, #64748b)' }}>
            {item.label}
          </span>
          <span
            style={{
              fontWeight: 500,
              color: 'var(--dsw-alias-label-primary, #0f172a)',
            }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ==================== 4. 就绪态操作按钮栏 ====================
export interface TunnelActionButtonsProps {
  onTestSend?: () => void;
  isTestSending?: boolean;
  testSendText?: string;
  onEdit?: () => void;
  editText?: string;
  onDisconnect?: () => void;
  isDisconnecting?: boolean;
  disconnectText?: string;
  disabled?: boolean;
}

export const TunnelActionButtons: React.FC<TunnelActionButtonsProps> = ({
  onTestSend,
  isTestSending = false,
  testSendText = '发送测试消息',
  onEdit,
  editText = '修改配置',
  onDisconnect,
  isDisconnecting = false,
  disconnectText = '断开',
  disabled = false,
}) => {
  const isBusy = disabled || isTestSending || isDisconnecting;

  return (
    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
      {onTestSend && (
        <button
          type="button"
          onClick={onTestSend}
          disabled={isBusy}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid var(--dsw-alias-border-subtle, #e2e8f0)',
            background: '#ffffff',
            color: 'var(--dsw-alias-label-primary, #0f172a)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: isBusy ? 'not-allowed' : 'pointer',
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
          {isTestSending ? '正在测试...' : testSendText}
        </button>
      )}

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          disabled={isBusy}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid var(--dsw-alias-border-subtle, #e2e8f0)',
            background: '#ffffff',
            color: 'var(--dsw-alias-label-secondary, #475569)',
            fontSize: '13px',
            cursor: isBusy ? 'not-allowed' : 'pointer',
          }}
        >
          {editText}
        </button>
      )}

      {onDisconnect && (
        <button
          type="button"
          onClick={onDisconnect}
          disabled={isBusy}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #fee2e2',
            background: '#fef2f2',
            color: '#ef4444',
            fontSize: '13px',
            cursor: isBusy ? 'not-allowed' : 'pointer',
          }}
        >
          {isDisconnecting ? '断开中...' : disconnectText}
        </button>
      )}
    </div>
  );
};

// ==================== 5. 提示信息横幅 ====================
export const TunnelNotice: React.FC<{
  notice?: string;
  error?: string;
}> = ({ notice, error }) => {
  return (
    <>
      {notice && (
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
          {notice}
        </div>
      )}
      {error && (
        <div
          style={{
            fontSize: '12px',
            color: '#ef4444',
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '8px',
            padding: '8px 12px',
            textAlign: 'center',
            lineHeight: '1.5',
          }}
        >
          {error}
        </div>
      )}
    </>
  );
};

// ==================== 6. 表单字段项 ====================
export interface TunnelFormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

export const TunnelFormField: React.FC<TunnelFormFieldProps> = ({
  label,
  required = false,
  hint,
  children,
}) => {
  return (
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
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
      {hint && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
            marginTop: '4px',
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
};

// ==================== 7. 可折叠配置指引 ====================
export interface TunnelCollapsibleGuideProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  accentColor?: string;
  children: React.ReactNode;
}

export const TunnelCollapsibleGuide: React.FC<TunnelCollapsibleGuideProps> = ({
  title,
  isOpen,
  onToggle,
  accentColor = '#007FFF',
  children,
}) => {
  return (
    <div
      style={{
        marginTop: '2px',
        borderTop: '1px solid var(--dsw-alias-border-subtle, #f1f5f9)',
        paddingTop: '12px',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          fontSize: '12px',
          color: accentColor,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontWeight: 500,
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
        <span>{title}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            marginTop: '10px',
            padding: '14px',
            borderRadius: '8px',
            backgroundColor: 'var(--dsw-alias-layer-secondary, #f8fafc)',
            border: '1px solid var(--dsw-alias-border-subtle, #e2e8f0)',
            fontSize: '12px',
            lineHeight: '1.6',
            color: 'var(--dsw-alias-label-secondary, #475569)',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

// ==================== 8. 表单操作按钮组 ====================
export interface TunnelFormButtonsProps {
  submitText: string;
  onSubmit: () => void;
  isSubmitting?: boolean;
  accentColor?: string;
  onClear?: () => void;
  isClearing?: boolean;
  clearText?: string;
  onCancel?: () => void;
  cancelText?: string;
  onClose?: () => void;
  disabled?: boolean;
}

export const TunnelFormButtons: React.FC<TunnelFormButtonsProps> = ({
  submitText,
  onSubmit,
  isSubmitting = false,
  accentColor = '#007FFF',
  onClear,
  isClearing = false,
  clearText = '清除配置',
  onCancel,
  cancelText = '取消修改',
  onClose,
  disabled = false,
}) => {
  const isBusy = disabled || isSubmitting || isClearing;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '6px',
      }}
    >
      <div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            disabled={isBusy}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              fontSize: '12px',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              padding: 0,
            }}
          >
            {isClearing ? '清除中...' : clearText}
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--dsw-alias-label-secondary, #64748b)',
              fontSize: '12px',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              padding: 0,
            }}
          >
            {cancelText}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid var(--dsw-alias-border-subtle, #cbd5e1)',
              background: '#ffffff',
              color: 'var(--dsw-alias-label-secondary, #475569)',
              cursor: isBusy ? 'not-allowed' : 'pointer',
            }}
          >
            关闭
          </button>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={isBusy}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            borderRadius: '8px',
            border: 'none',
            background: accentColor,
            color: '#ffffff',
            fontWeight: 500,
            cursor: isBusy ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          {isSubmitting ? '连接中...' : submitText}
        </button>
      </div>
    </div>
  );
};
