import React from 'react';
import { createPortal } from 'react-dom';

import { brandingManager, showToast } from '../components/BrandBranding';

export function JYUpgradeModal() {
  const [open, setOpen] = React.useState(false);
  const [appHost, setAppHost] = React.useState('');

  React.useEffect(() => {
    brandingManager.fetch().then((data) => {
      const host = (data && data.appHost) || 'https://demo.jingyun.online/';
      setAppHost(host);
    });

    const handleOpenUpgrade = () => setOpen(true);
    const handleCloseUpgrade = () => setOpen(false);

    window.addEventListener('jy_open_upgrade_modal', handleOpenUpgrade);
    window.addEventListener('jy_close_upgrade_modal', handleCloseUpgrade);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'JY_UPGRADE_SUCCESS') {
        setOpen(false);
        window.dispatchEvent(new CustomEvent('jy_auth_changed'));
        try {
          showToast('🎉 升级成功！您的会员权益已生效');
        } catch (e) {}
      } else if (event.data?.type === 'JY_UPGRADE_CLOSE') {
        setOpen(false);
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('jy_open_upgrade_modal', handleOpenUpgrade);
      window.removeEventListener('jy_close_upgrade_modal', handleCloseUpgrade);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  if (!open || !appHost || typeof document === 'undefined') return null;

  let baseHost = appHost || 'https://demo.jingyun.online/';
  baseHost = baseHost.endsWith('/') ? baseHost : baseHost + '/';
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('jy_online_token')
      : '';
  const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : '';
  const upgradeIframeUrl = `${baseHost}upgrade-modal?embed=true${tokenQuery}`;

  return createPortal(
    <div
      className="jy-upgrade-modal-overlay"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <iframe
        src={upgradeIframeUrl}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100vw',
          height: '100vh',
          border: 'none',
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
// 复用 User-App 动态域名算力充值弹窗组件 (JYRechargeModal)
// ----------------------------------------------------
export function openRechargeModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jy_open_recharge_modal'));
  }
}
