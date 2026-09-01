import React from 'react';
import { createPortal } from 'react-dom';

function checkIsTauri() {
  if (typeof window === 'undefined') return false;
  return !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;
}

export function JYWindowControls() {
  const [isTauri, setIsTauri] = React.useState(false);

  React.useEffect(() => {
    setIsTauri(checkIsTauri());
  }, []);

  if (!isTauri || typeof document === 'undefined') return null;

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const tauri = (window as any).__TAURI__;
      const internals = (window as any).__TAURI_INTERNALS__;
      if (tauri?.window?.getCurrentWindow) {
        tauri.window.getCurrentWindow().minimize();
      } else if (tauri?.core?.invoke) {
        tauri.core.invoke('app_minimize');
      } else if (internals?.invoke) {
        internals.invoke('app_minimize');
      }
    } catch (err) {
      console.error('Minimize error:', err);
    }
  };

  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const tauri = (window as any).__TAURI__;
      const internals = (window as any).__TAURI_INTERNALS__;
      if (tauri?.window?.getCurrentWindow) {
        tauri.window.getCurrentWindow().toggleMaximize();
      } else if (tauri?.core?.invoke) {
        tauri.core.invoke('app_toggle_maximize');
      } else if (internals?.invoke) {
        internals.invoke('app_toggle_maximize');
      }
    } catch (err) {
      console.error('Maximize error:', err);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const tauri = (window as any).__TAURI__;
      const internals = (window as any).__TAURI_INTERNALS__;
      if (tauri?.window?.getCurrentWindow) {
        tauri.window.getCurrentWindow().close();
      } else if (tauri?.core?.invoke) {
        tauri.core.invoke('app_close');
      } else if (internals?.invoke) {
        internals.invoke('app_close');
      }
    } catch (err) {
      console.error('Close error:', err);
    }
  };

  return createPortal(
    <div
      className="jy-window-controls"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={
        {
          position: 'fixed',
          top: 0,
          right: 0,
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          height: '32px',
          WebkitAppRegion: 'no-drag',
          pointerEvents: 'auto',
        } as any
      }
    >
      {/* 最小化按钮 */}
      <button
        type="button"
        title="最小化"
        onClick={handleMinimize}
        style={{
          width: '42px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--dsw-alias-label-tertiary, #a1a1aa)',
          transition: 'background-color 0.15s ease, color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.color =
            'var(--dsw-alias-label-primary, #ffffff)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color =
            'var(--dsw-alias-label-tertiary, #a1a1aa)';
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <line x1="4" y1="12" x2="20" y2="12" />
        </svg>
      </button>

      {/* 最大化 / 还原按钮 */}
      <button
        type="button"
        title="最大化"
        onClick={handleMaximize}
        style={{
          width: '42px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--dsw-alias-label-tertiary, #a1a1aa)',
          transition: 'background-color 0.15s ease, color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.color =
            'var(--dsw-alias-label-primary, #ffffff)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color =
            'var(--dsw-alias-label-tertiary, #a1a1aa)';
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      </button>

      {/* 关闭按钮 */}
      <button
        type="button"
        title="关闭"
        onClick={handleClose}
        style={{
          width: '42px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--dsw-alias-label-tertiary, #a1a1aa)',
          transition: 'background-color 0.15s ease, color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#e11d48';
          e.currentTarget.style.color = '#ffffff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color =
            'var(--dsw-alias-label-tertiary, #a1a1aa)';
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>,
    document.body
  );
}
