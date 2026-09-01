import React from 'react';
import { createPortal } from 'react-dom';

import { brandingManager } from '../components/BrandBranding';

export function JYLoginModal() {
  const [open, setOpen] = React.useState(false);
  const [appHost, setAppHost] = React.useState('');

  React.useEffect(() => {
    brandingManager.fetch().then((data) => {
      const host = (data && data.appHost) || 'https://demo.jingyun.online/';
      setAppHost(host);
    });

    const handleOpenLogin = () => setOpen(true);
    const handleCloseLogin = () => setOpen(false);

    window.addEventListener('jy_open_login_modal', handleOpenLogin);
    window.addEventListener('jy_close_login_modal', handleCloseLogin);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'JY_LOGIN_SUCCESS') {
        const { token, user } = event.data.payload || {};
        if (token && typeof localStorage !== 'undefined') {
          localStorage.setItem('jy_online_token', token);
          if (user) {
            localStorage.setItem('jy_online_user', JSON.stringify(user));
          }
        }
        setOpen(false);
        window.dispatchEvent(
          new CustomEvent('jy_auth_changed', { detail: { token, user } })
        );
      } else if (event.data?.type === 'JY_LOGIN_CLOSE') {
        setOpen(false);
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('jy_open_login_modal', handleOpenLogin);
      window.removeEventListener('jy_close_login_modal', handleCloseLogin);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  if (!open || !appHost || typeof document === 'undefined') return null;

  // 动态拼装用户自定义 appHost 域名下的纯弹窗独立路由地址 (/auth-modal)
  let baseHost = appHost || 'https://demo.jingyun.online/';
  baseHost = baseHost.endsWith('/') ? baseHost : baseHost + '/';
  const loginIframeUrl = `${baseHost}auth-modal?embed=true`;

  return createPortal(
    <div
      className="jy-login-modal-overlay"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <iframe
        src={loginIframeUrl}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '900px',
          height: '550px',
          maxWidth: '90vw',
          maxHeight: '85vh',
          border: 'none',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'block',
          backgroundColor: 'transparent',
        }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-downloads allow-modals"
        allow="camera; microphone; clipboard-read; clipboard-write; display-capture; autoplay; fullscreen"
      />
    </div>,
    document.body
  );
}

// ----------------------------------------------------
// 复用 User-App 动态域名会员订购弹窗组件 (JYUpgradeModal)
// ----------------------------------------------------
export function openUpgradeModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jy_open_upgrade_modal'));
  }
}
