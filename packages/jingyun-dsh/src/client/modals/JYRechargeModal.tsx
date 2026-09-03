import React from 'react';
import { createPortal } from 'react-dom';

import { brandingManager, showToast } from '../components/BrandBranding';

export function JYRechargeModal() {
  const [open, setOpen] = React.useState(false);
  const [appHost, setAppHost] = React.useState('');

  React.useEffect(() => {
    brandingManager.fetch().then((data) => {
      const host = (data && data.appHost) || '';
      setAppHost(host);
    });

    const handleOpenRecharge = () => setOpen(true);
    const handleCloseRecharge = () => setOpen(false);

    window.addEventListener('jy_open_recharge_modal', handleOpenRecharge);
    window.addEventListener('jy_close_recharge_modal', handleCloseRecharge);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'JY_RECHARGE_SUCCESS') {
        setOpen(false);
        window.dispatchEvent(new CustomEvent('jy_auth_changed'));
        try {
          showToast('🎉 充值成功！积分余额已实时更新');
        } catch {}
      } else if (event.data?.type === 'JY_RECHARGE_CLOSE') {
        setOpen(false);
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('jy_open_recharge_modal', handleOpenRecharge);
      window.removeEventListener(
        'jy_close_recharge_modal',
        handleCloseRecharge
      );
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  if (!open || !appHost || typeof document === 'undefined') return null;

  let baseHost = appHost;
  baseHost = baseHost.endsWith('/') ? baseHost : baseHost + '/';
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('jy_online_token')
      : '';
  const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : '';
  const rechargeIframeUrl = `${baseHost}recharge-modal?embed=true${tokenQuery}`;

  return createPortal(
    <div
      className="jy-recharge-modal-overlay"
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
        src={rechargeIframeUrl}
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
// 复用 User-App 动态域名卡密激活弹窗组件 (JYCardActivateModal)
// ----------------------------------------------------
export function openCardActivateModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jy_open_card_activate_modal'));
  }
}
