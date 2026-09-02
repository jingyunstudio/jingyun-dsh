import {
  IconUserOutline16,
  IconSettingsOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives';
import React from 'react';
import { createPortal } from 'react-dom';

import { brandingManager, showToast } from './BrandBranding';
import {
  openLoginModal,
  openUpgradeModal,
  openRechargeModal,
  openCardActivateModal,
} from './NavigationRows';

export function CustomLoginSettingBtn(props: any) {
  const wide = props?.wide ?? true;
  const isCollapsed = !wide;
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<any>(null);
  const [avatarErr, setAvatarErr] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [themeMode, setThemeMode] = React.useState<'light' | 'dark'>('light');
  const [menuPos, setMenuPos] = React.useState<{
    left: number;
    bottom: number;
  }>({ left: 0, bottom: 0 });
  const [wechatConfig, setWechatConfig] = React.useState<any>(null);
  const [showQrPopover, setShowQrPopover] = React.useState(false);
  const [tenantDomain, setTenantDomain] = React.useState<string>('');
  const [configured, setConfigured] = React.useState(true);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const updateMenuPos = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({
        left: Math.max(12, rect.left),
        bottom: window.innerHeight - rect.top + 8,
      });
    }
  };

  React.useEffect(() => {
    let active = true;

    // 注入样式表，防重
    const styleId = 'jy-login-setting-style';
    if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = styleSheetContent;
      document.head.appendChild(style);
    }

    const loadBrandingAndConfig = async () => {
      try {
        const branding = await brandingManager.fetch();
        const appHost = (branding && branding.appHost) || '';
        const baseUrl = appHost.endsWith('/') ? appHost.slice(0, -1) : appHost;
        if (active) {
          setTenantDomain(baseUrl);
          setConfigured(!!(branding?.apiUrl || branding?.appHost));
        }

        // 拉取公开的小程序与租户配置 (方案A)
        const res = await fetch(`${baseUrl}/v1/public/tenant/info`);
        if (res.ok) {
          const data = await res.json();
          if (active && data) {
            setWechatConfig(data);
          }
        }
      } catch (err) {
        console.error(
          '[UIBranding] Failed to load branding/public config:',
          err
        );
      }
    };

    loadBrandingAndConfig();

    const fetchUserProfile = async (authToken: string, baseUrl: string) => {
      try {
        const res = await fetch(`${baseUrl}/v1/plugins/user_auth/profile`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const profile = await res.json();
          const userData = profile?.user || profile?.data || profile;
          if (active && userData) {
            setUser(userData);
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('jy_online_user', JSON.stringify(userData));
            }
          }
        }
      } catch (err) {
        console.error('[UIBranding] Failed to fetch user profile:', err);
      }
    };

    const checkAuth = async () => {
      if (typeof localStorage !== 'undefined') {
        const t = localStorage.getItem('jy_online_token');
        const u = localStorage.getItem('jy_online_user');
        setToken(t);
        if (u) {
          try {
            setUser(JSON.parse(u));
          } catch {}
        } else {
          setUser(null);
        }
        brandingManager.fetch().then((data) => {
          const isConf = !!(data?.apiUrl || data?.appHost);
          setConfigured(isConf);
          if (t) {
            const appHost = (data && data.appHost) || '';
            const baseUrl = appHost.endsWith('/')
              ? appHost.slice(0, -1)
              : appHost;
            fetchUserProfile(t, baseUrl);
          }
        });
      }
    };
    checkAuth();

    const handleAuthChange = () => checkAuth();
    window.addEventListener('jy_auth_changed', handleAuthChange);
    return () => {
      active = false;
      window.removeEventListener('jy_auth_changed', handleAuthChange);
    };
  }, []);

  // 监听点击弹窗外部与滚动重新定位，全局 Portal 防挡，并支持同源及跨域 iframe 点击穿透隐藏
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setShowMenu(false);
        setShowQrPopover(false);
      }
    };

    const handleScrollOrResize = () => {
      if (showMenu) {
        updateMenuPos();
      }
    };

    // 针对跨域 iframe 点击，利用 window.blur 焦点转移机制实现穿透隐藏
    const handleWindowBlur = () => {
      setTimeout(() => {
        if (
          document.activeElement &&
          (document.activeElement.tagName === 'IFRAME' ||
            document.activeElement.tagName === 'iframe')
        ) {
          setShowMenu(false);
          setShowQrPopover(false);
        }
      }, 50);
    };

    // 用于安全记录和销毁同源 iframe 的事件监听器
    const boundIframeDocs: Document[] = [];

    if (showMenu || showQrPopover) {
      document.addEventListener('pointerdown', handleClickOutside);
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('blur', handleWindowBlur);

      // 寻找当前主文档中的所有 iframe 并挂载点击监听 (适用于同源)
      if (typeof document !== 'undefined') {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe) => {
          try {
            const iframeDoc =
              iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
              iframeDoc.addEventListener('pointerdown', handleClickOutside);
              boundIframeDocs.push(iframeDoc);
            }
          } catch {
            // 捕获可能存在的跨域 iframe 异常，不影响页面主流程
          }
        });
      }
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('blur', handleWindowBlur);

      // 彻底销毁所有已绑定的 iframe 事件监听，防内存泄漏
      boundIframeDocs.forEach((iframeDoc) => {
        try {
          iframeDoc.removeEventListener('pointerdown', handleClickOutside);
        } catch {}
      });
    };
  }, [showMenu, showQrPopover]);

  // 全通道广播主题变化给页面中所有 iframe 实例与子框架 (如 User-App)
  const broadcastThemeChange = (mode: 'light' | 'dark') => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jy_theme_mode', mode);
        localStorage.setItem('theme', mode);
      } catch {}

      // 1. 触发宿主 window 自定义事件
      try {
        window.dispatchEvent(
          new CustomEvent('jy_theme_change', { detail: mode })
        );
      } catch {}

      // 2. 遍历查找 document.querySelectorAll('iframe')
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        try {
          iframe.contentWindow?.postMessage(
            { type: 'JY_THEME_CHANGE', theme: mode },
            '*'
          );
        } catch {}
      });

      // 3. 遍历 window.frames
      for (let i = 0; i < window.frames.length; i++) {
        try {
          window.frames[i].postMessage(
            { type: 'JY_THEME_CHANGE', theme: mode },
            '*'
          );
        } catch {}
      }
    }
  };

  // 检测与初始化深浅主题 (持久化优先 -> 租户默认设置后备)
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const savedTheme = localStorage.getItem('jy_theme_mode') as
        | 'light'
        | 'dark'
        | null;
      if (savedTheme) {
        setThemeMode(savedTheme);
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
          document.body.classList.add('dark');
          document.body.setAttribute('data-ds-dark-theme', 'true');
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.body.classList.remove('dark');
          document.body.removeAttribute('data-ds-dark-theme');
          document.documentElement.setAttribute('data-theme', 'light');
        }
      } else {
        brandingManager.fetch().then((data: any) => {
          const defaultTheme =
            data?.default_theme || data?.theme_mode || 'light';
          if (defaultTheme === 'dark') {
            setThemeMode('dark');
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark');
            document.body.setAttribute('data-ds-dark-theme', 'true');
            document.documentElement.setAttribute('data-theme', 'dark');
          }
        });
      }
    }
  }, [showMenu]);

  const toggleTheme = (mode: 'light' | 'dark', e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setThemeMode(mode);
    if (typeof document !== 'undefined') {
      try {
        localStorage.setItem('jy_theme_mode', mode);
      } catch {}
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        document.body.setAttribute('data-ds-dark-theme', 'true');
        document.documentElement.setAttribute('data-theme', 'dark');
        try {
          localStorage.setItem('dsw_theme', 'dark');
        } catch {}
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        document.body.removeAttribute('data-ds-dark-theme');
        document.documentElement.setAttribute('data-theme', 'light');
        try {
          localStorage.setItem('dsw_theme', 'light');
        } catch {}
      }
      broadcastThemeChange(mode);
    }
  };

  const handleLogout = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('jy_online_token');
      localStorage.removeItem('jy_online_user');
    }
    setToken(null);
    setUser(null);
    setShowMenu(false);
    window.dispatchEvent(new CustomEvent('jy_auth_changed'));
  };

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idText = user?.id || user?.username || user?.nickname || 'JY_USER';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(idText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 唤起 DSH 官方 SettingsPanel 设置弹窗
  const handleOpenSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);

    // 精准触发官方 SettingsRoot 包裹按钮 (带有 aria-haspopup="dialog") 的 onClick 事件
    if (btnRef.current) {
      const dialogTrigger = btnRef.current.closest(
        'button[aria-haspopup="dialog"]'
      ) as HTMLElement | null;
      if (dialogTrigger) {
        dialogTrigger.click();
        return;
      }
    }

    if (typeof document !== 'undefined') {
      const dialogTrigger = document.querySelector(
        'button[aria-haspopup="dialog"]'
      ) as HTMLElement | null;
      if (dialogTrigger) {
        dialogTrigger.click();
        return;
      }
    }

    if (typeof props?.onClick === 'function') {
      props.onClick(e);
    }
  };

  const isLogin = Boolean(token);
  const displayName =
    user?.nickname || user?.username || user?.phone || '已登录';
  const avatarUrl = user?.avatar;

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'relative',
        width: '100%',
        padding: '6px 8px',
        boxSizing: 'border-box',
      }}
    >
      {/* 侧边栏底部按钮 */}
      <div
        ref={btnRef as any}
        className="jy-sidebar-btn jy-sidebar-profile-btn"
        onClick={(e) => {
          e.stopPropagation();
          brandingManager.fetch().then((data) => {
            const configured = !!(data?.apiUrl || data?.appHost);
            if (!configured) {
              showToast('线上域名未配置，请先配置');
              return;
            }

            if (isLogin) {
              if (!showMenu) {
                updateMenuPos();
              }
              setShowMenu(!showMenu);
            } else {
              openLoginModal();
            }
          });
        }}
        title={isLogin ? `当前登录：${displayName}` : '点击登录账号'}
        style={{
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          padding: isCollapsed ? '0' : '0 12px',
          boxSizing: 'border-box',
        }}
      >
        {isLogin && avatarUrl && !avatarErr ? (
          <img
            className="jy-profile-avatar-el"
            src={avatarUrl}
            alt={displayName}
            onError={() => setAvatarErr(true)}
            style={{
              width: isCollapsed ? '26px' : '28px',
              height: isCollapsed ? '26px' : '28px',
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
          />
        ) : isLogin && user ? (
          <div
            className="jy-profile-avatar-el"
            style={{
              width: isCollapsed ? '26px' : '28px',
              height: isCollapsed ? '26px' : '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
              flexShrink: 0,
              textTransform: 'uppercase',
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
            }}
          >
            {displayName.slice(0, 1)}
          </div>
        ) : (
          <span style={{ flexShrink: 0, display: 'inline-flex' }}>
            <IconUserOutline16
              size={16}
              className="link-icon"
            />
          </span>
        )}

        {!isCollapsed && (
          <span
            style={{
              fontWeight: isLogin ? 600 : 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: isLogin ? '14px' : '13px',
            }}
          >
            {isLogin ? displayName : '登录'}
          </span>
        )}

        {!isCollapsed && isLogin && (
          <div
            className="jy-sidebar-preview-actions"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginLeft: 'auto',
              flexShrink: 0,
            }}
          >
            {/* 网页端预览 */}
            <div
              className="jy-preview-action-btn"
              title="打开网站网页端"
              onClick={(e) => {
                e.stopPropagation();
                const targetUrl = tenantDomain || 'https://demo.jingyun.online';
                if (typeof window !== 'undefined') {
                  window.open(targetUrl, '_blank');
                }
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </div>

            {/* 手机端小程序码 */}
            <div
              className="jy-preview-action-btn"
              title="微信小程序扫码体验"
              onClick={(e) => {
                e.stopPropagation();
                if (wechatConfig?.wechat_qrcode_url) {
                  setShowQrPopover(!showQrPopover);
                } else {
                  showToast('暂未配置小程序 请联系管理员');
                }
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
            </div>
          </div>
        )}

        {/* 当未配置且展开侧边栏时，右侧显示设置齿轮按钮 */}
        {!isCollapsed && !configured && (
          <div
            className="jy-sidebar-preview-actions"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginLeft: 'auto',
              flexShrink: 0,
            }}
          >
            <div
              className="jy-preview-action-btn"
              title="打开设置"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenSettings(e);
              }}
            >
              <IconSettingsOutline16 size={13} />
            </div>
          </div>
        )}
      </div>

      {/* 微信小程序扫码 Popover 卡片 */}
      {showQrPopover && wechatConfig?.wechat_qrcode_url && (
        <div
          className="jy-qr-popover-card"
          style={{
            position: 'absolute',
            bottom: '50px',
            left: '8px',
            width: '180px',
            backgroundColor:
              'var(--dsw-alias-bg-popover, var(--dsw-alias-bg-layer-2, #ffffff))',
            border: '1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.08))',
            borderRadius: '12px',
            padding: '10px',
            boxShadow:
              '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 顶部标题栏 */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--dsw-alias-label-primary)',
              }}
            >
              手机扫码预览
            </span>
            <span
              style={{
                fontSize: '13px',
                cursor: 'pointer',
                color: 'var(--dsw-alias-label-tertiary)',
                fontWeight: 'bold',
                padding: '0 4px',
              }}
              onClick={() => setShowQrPopover(false)}
            >
              ×
            </span>
          </div>

          {/* 二维码图片 */}
          <img
            src={wechatConfig.wechat_qrcode_url}
            alt="小程序体验码"
            style={{
              width: '150px',
              height: '150px',
              borderRadius: '6px',
              objectFit: 'contain',
              border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.04))',
              backgroundColor: '#ffffff',
            }}
          />

          {/* 卡片底注 */}
          <span
            style={{
              fontSize: '9px',
              color: 'var(--dsw-alias-label-tertiary)',
              textAlign: 'center',
            }}
          >
            使用微信扫码预览小程序
          </span>
        </div>
      )}

      {/* 使用 Portal 挂载至 document.body，防溢出隐藏遮挡，全局 z-index: 999999 */}
      {isLogin &&
        showMenu &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="jy-popover-menu"
            style={{
              position: 'fixed',
              bottom: `${menuPos.bottom}px`,
              left: `${menuPos.left}px`,
              width: '270px',
              borderRadius: '16px',
              padding: '12px 10px',
              zIndex: 999999,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              animation: 'jyMenuFadeIn 0.15s ease-out',
            }}
          >
            {/* Header 区域 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px 8px 8px',
              }}
            >
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                title={copied ? '已复制' : '复制 ID'}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  color: copied
                    ? '#16a34a'
                    : 'var(--dsw-alias-label-tertiary, #71717a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                {copied ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
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
                    <rect
                      x="9"
                      y="9"
                      width="13"
                      height="13"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>
            </div>

            <div className="jy-menu-divider" />

            {/* 列表块 1 */}
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
            >
              {/* 体验版 */}
              <div
                className="jy-menu-item"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowMenu(false);
                  openUpgradeModal();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>{user?.membership_name || '体验版'}</span>
                </div>
                <button
                  type="button"
                  className="jy-upgrade-btn"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowMenu(false);
                    openUpgradeModal();
                  }}
                >
                  升级
                </button>
              </div>

              {/* 积分余额 / 算力充值 */}
              <div
                className="jy-menu-item"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowMenu(false);
                  openRechargeModal();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  <span>积分余额</span>
                </div>
                <span
                  className="jy-menu-subtext"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  {user?.balance || 0}
                </span>
              </div>

              {/* 个人中心 */}
              <div
                className="jy-menu-item"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowMenu(false);
                  window.location.hash = '#/jingyun/more?path=%2Fuser';
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>个人中心</span>
                </div>
              </div>

              {/* 我的资产 */}
              <div
                className="jy-menu-item"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowMenu(false);
                  window.location.hash = '#/jingyun/more?path=%2Fmy-assets';
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect
                      x="2"
                      y="7"
                      width="20"
                      height="14"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                  <span>我的资产</span>
                </div>
              </div>

              {/* 订单记录 */}
              <div
                className="jy-menu-item"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowMenu(false);
                  window.location.hash = '#/jingyun/more?path=%2Forder-list';
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                  <span>订单记录</span>
                </div>
              </div>

              {/* 算力记录 */}
              <div
                className="jy-menu-item"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowMenu(false);
                  window.location.hash = '#/jingyun/more?path=%2Fcompute-list';
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                  <span>算力记录</span>
                </div>
              </div>

              {/* 卡密激活 */}
              <div
                className="jy-menu-item"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowMenu(false);
                  openCardActivateModal();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                  </svg>
                  <span>卡密激活</span>
                </div>
              </div>
            </div>

            <div className="jy-menu-divider" />

            {/* 列表块 2 */}
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
            >
              {/* 设置 */}
              <div
                className="jy-menu-item"
                onClick={handleOpenSettings}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  gap: '10px',
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
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>设置</span>
              </div>

              {/* 外观 */}
              <div
                className="jy-menu-item"
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 2a7 7 0 1 0 10 10"></path>
                  </svg>
                  <span>外观</span>
                </div>
                {/* 分段按钮开关 */}
                <div className="jy-segment-container">
                  <button
                    type="button"
                    className={`jy-segment-btn ${themeMode === 'light' ? 'jy-segment-btn-active' : ''}`}
                    onClick={(e) => toggleTheme('light', e)}
                  >
                    浅色
                  </button>
                  <button
                    type="button"
                    className={`jy-segment-btn ${themeMode === 'dark' ? 'jy-segment-btn-active' : ''}`}
                    onClick={(e) => toggleTheme('dark', e)}
                  >
                    深色
                  </button>
                </div>
              </div>

              {/* 邀请有礼 */}
              <div
                className="jy-menu-item"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowMenu(false);
                  window.location.hash = '#/jingyun/more?path=%2Faffiliate';
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 12v10H4V12"></path>
                    <path d="M2 7h20v5H2z"></path>
                    <path d="M12 22V7"></path>
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                  </svg>
                  <span>邀请有礼</span>
                </div>
                <span className="jy-menu-subtext">赢积分赚佣金</span>
              </div>
            </div>

            <div className="jy-menu-divider" />

            {/* 退出登录 */}
            <div
              className="jy-menu-item jy-menu-logout"
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
                gap: '10px',
                color: 'var(--dsw-alias-label-primary, #09090b)',
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>退出登录</span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

const styleSheetContent = `
/* 覆盖 SettingsRoot 外层包裹按钮样式，使其成为无感的透明容器，避免双重间距和悬浮背景冲突 */
button[aria-haspopup="dialog"]:has(.jy-sidebar-profile-btn) {
  padding: 0 !important;
  margin: 0 !important;
  width: 100% !important;
  height: auto !important;
  background: transparent !important;
  border-radius: 0 !important;
  cursor: default !important;
}
button[aria-haspopup="dialog"]:has(.jy-sidebar-profile-btn):hover {
  background: transparent !important;
}

@keyframes jy-slide-up-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.jy-qr-popover-card {
  animation: jy-slide-up-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.jy-preview-action-btn {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 24px !important;
  height: 24px !important;
  border-radius: 50% !important;
  color: var(--dsw-alias-label-secondary, #71717a) !important;
  transition: all 0.2s ease !important;
  cursor: pointer !important;
}

.jy-preview-action-btn:hover {
  background-color: var(--dsw-alias-interactive-bg-hover, rgba(9, 9, 11, 0.08)) !important;
  color: var(--dsw-alias-label-primary, #09090b) !important;
  transform: scale(1.05) !important;
}

.jy-sidebar-profile-btn {
  height: 42px !important;
}

.jy-sidebar-profile-btn .jy-profile-avatar-el {
  width: 28px !important;
  height: 28px !important;
  max-width: 28px !important;
  max-height: 28px !important;
  flex-shrink: 0 !important;
}
`;

// ----------------------------------------------------
// Branding & Customization Settings Card definition
// ----------------------------------------------------
interface SingleCardProps {
  descriptor: {
    ns: string;
    schema: {
      properties?: Record<string, any>;
    };
    value: Record<string, any>;
  };
  onSaveConfig: (ns: string, data: Record<string, any>) => Promise<void>;
}

function ConfigItemCard({ descriptor, onSaveConfig }: SingleCardProps) {
  const [open, setOpen] = React.useState(false);
  const isBranding = descriptor.ns === 'jingyun-dsh';

  // Form states initialized from descriptors
  const [mode, setMode] = React.useState<'cloud' | 'local'>('cloud');
  const [apiUrl, setApiUrl] = React.useState('');
  const [tenantHost, setTenantHost] = React.useState('');
  const [customName, setCustomName] = React.useState('');
  const [customLogo, setCustomLogo] = React.useState('');

  // Database backups
  const [dbMode, setDbMode] = React.useState<'cloud' | 'local'>('cloud');
  const [dbApiUrl, setDbApiUrl] = React.useState('');
  const [dbTenantHost, setDbTenantHost] = React.useState('');
  const [dbCustomName, setDbCustomName] = React.useState('');
  const [dbCustomLogo, setDbCustomLogo] = React.useState('');
  const [appHost, setAppHost] = React.useState('');
  const [dbAppHost, setDbAppHost] = React.useState('');

  // Dynamic field states for other schema generated items
  const [dynamicValues, setDynamicValues] = React.useState<
    Record<string, string>
  >({});
  const [dbDynamicValues, setDbDynamicValues] = React.useState<
    Record<string, string>
  >({});

  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (isBranding) {
      const activeMode = descriptor.value.mode || 'cloud';
      setMode(activeMode);
      setDbMode(activeMode);

      const apiVal = descriptor.value.apiUrl || '';
      setApiUrl(apiVal);
      setDbApiUrl(apiVal);

      const tenantVal = descriptor.value.tenantHost || '';
      setTenantHost(tenantVal);
      setDbTenantHost(tenantVal);

      const nameVal = descriptor.value.customName || '';
      setCustomName(nameVal);
      setDbCustomName(nameVal);

      const logoVal = descriptor.value.customLogo || '';
      setCustomLogo(logoVal);
      setDbCustomLogo(logoVal);

      const appHostVal = descriptor.value.appHost || '';
      setAppHost(appHostVal);
      setDbAppHost(appHostVal);
    } else {
      // General schemas properties mapper
      const initVals: Record<string, string> = {};
      const props = descriptor.schema.properties || {};
      Object.keys(props).forEach((key) => {
        initVals[key] =
          descriptor.value[key] !== undefined
            ? String(descriptor.value[key])
            : props[key].default || '';
      });
      setDynamicValues(initVals);
      setDbDynamicValues({ ...initVals });
    }
  }, [descriptor]);

  // Determine dirty state
  const isDirty = isBranding
    ? mode !== dbMode ||
      apiUrl !== dbApiUrl ||
      tenantHost !== dbTenantHost ||
      appHost !== dbAppHost ||
      customName !== dbCustomName ||
      customLogo !== dbCustomLogo
    : Object.keys(dynamicValues).some(
        (key) => dynamicValues[key] !== dbDynamicValues[key]
      );

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isBranding) {
        await onSaveConfig(descriptor.ns, {
          mode,
          apiUrl,
          tenantHost,
          appHost,
          customName,
          customLogo,
        });
        setDbMode(mode);
        setDbApiUrl(apiUrl);
        setDbTenantHost(tenantHost);
        setDbAppHost(appHost);
        setDbCustomName(customName);
        setDbCustomLogo(customLogo);

        // Update global branding manager cache and clear to force reload config
        brandingManager.updateCache(customLogo, customName);
        brandingManager.clear();
        window.dispatchEvent(new CustomEvent('jy_auth_changed'));
      } else {
        await onSaveConfig(descriptor.ns, dynamicValues);
        setDbDynamicValues({ ...dynamicValues });
      }
    } catch (err) {
      console.error(err);
      alert('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (isBranding) {
      setMode(dbMode);
      setApiUrl(dbApiUrl);
      setTenantHost(dbTenantHost);
      setAppHost(dbAppHost);
      setCustomName(dbCustomName);
      setCustomLogo(dbCustomLogo);
    } else {
      setDynamicValues({ ...dbDynamicValues });
    }
  };

  // Handle local image file picker and convert it to Base64 data url
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 250 * 1024) {
      alert('图片体积请勿超过 250KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setCustomLogo(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Card headers and metadata details
  let cardTitle = descriptor.ns;
  let cardDesc = '配置该插件相关参数。';

  if (isBranding) {
    cardTitle = '品牌定制';
    cardDesc = '配置云端接口获取参数，或完全离线自定义站点展示名称与 Logo。';
  }

  return (
    <li className={`jy-card ${open ? 'jy-card-open' : ''}`}>
      <button
        type="button"
        className="jy-card-header"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="jy-card-headText">
          <span className="jy-card-name">{cardTitle}</span>
          <span className="jy-card-description">{cardDesc}</span>
        </span>
        {isDirty && <span className="jy-card-pending">未保存</span>}
        <svg
          className={`jy-card-chevron ${open ? 'jy-card-chevron-open' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      {open && (
        <div className="jy-card-body">
          {isBranding ? (
            <>
              {/* Branding customize mode */}
              <div className="jy-field">
                <div className="jy-field-head">
                  <label className="jy-field-label">定制模式</label>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '24px',
                    marginTop: '6px',
                    padding: '2px 0',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      color: 'var(--dsw-alias-label-primary)',
                    }}
                  >
                    <input
                      type="radio"
                      name="jy-brand-mode"
                      value="cloud"
                      checked={mode === 'cloud'}
                      onChange={() => setMode('cloud')}
                      style={{ cursor: 'pointer' }}
                    />
                    云端同步模式 (获取线上品牌数据)
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      color: 'var(--dsw-alias-label-primary)',
                    }}
                  >
                    <input
                      type="radio"
                      name="jy-brand-mode"
                      value="local"
                      checked={mode === 'local'}
                      onChange={() => setMode('local')}
                      style={{ cursor: 'pointer' }}
                    />
                    离线自定义模式 (完全本地配置)
                  </label>
                </div>
              </div>

              {/* Conditional cloud inputs */}
              {mode === 'cloud' ? (
                <>
                  <div
                    className="jy-field"
                    style={{
                      borderTop:
                        '1px solid var(--dsw-alias-border-l2, #e4e4e7)',
                    }}
                  >
                    <div className="jy-field-head">
                      <label
                        className="jy-field-label"
                        htmlFor="jy-settings-api-url"
                      >
                        服务地址
                      </label>
                    </div>
                    <input
                      id="jy-settings-api-url"
                      className="jy-field-input"
                      type="text"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                    />
                    <p className="jy-field-hint">
                      SaaS 接口请求地址。留空默认需手动配置。
                    </p>
                  </div>

                  <div
                    className="jy-field"
                    style={{
                      borderTop:
                        '1px solid var(--dsw-alias-border-l2, #e4e4e7)',
                    }}
                  >
                    <div className="jy-field-head">
                      <label
                        className="jy-field-label"
                        htmlFor="jy-settings-tenant-host"
                      >
                        租户标识
                      </label>
                    </div>
                    <input
                      id="jy-settings-tenant-host"
                      className="jy-field-input"
                      type="text"
                      value={tenantHost}
                      onChange={(e) => setTenantHost(e.target.value)}
                    />
                    <p className="jy-field-hint">
                      租户唯一标识，用于鉴权与同步线上资源。留空默认需手动配置。
                    </p>
                  </div>

                  <div
                    className="jy-field"
                    style={{
                      borderTop:
                        '1px solid var(--dsw-alias-border-l2, #e4e4e7)',
                    }}
                  >
                    <div className="jy-field-head">
                      <label
                        className="jy-field-label"
                        htmlFor="jy-settings-app-host"
                      >
                        终端域名
                      </label>
                    </div>
                    <input
                      id="jy-settings-app-host"
                      className="jy-field-input"
                      type="text"
                      value={appHost}
                      onChange={(e) => setAppHost(e.target.value)}
                    />
                    <p className="jy-field-hint">
                      Tauri 桌面端或独立终端的主页访问地址。留空默认需手动配置。
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="jy-field"
                    style={{
                      borderTop:
                        '1px solid var(--dsw-alias-border-l2, #e4e4e7)',
                    }}
                  >
                    <div className="jy-field-head">
                      <label
                        className="jy-field-label"
                        htmlFor="jy-settings-custom-name"
                      >
                        站点名称
                      </label>
                    </div>
                    <input
                      id="jy-settings-custom-name"
                      className="jy-field-input"
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="为空则显示默认 DeepSeek 标识"
                    />
                    <p className="jy-field-hint">
                      完全离线环境下系统展示的全局站点名称。默认值：为空自动展示原生标识
                    </p>
                  </div>

                  <div
                    className="jy-field"
                    style={{
                      borderTop:
                        '1px solid var(--dsw-alias-border-l2, #e4e4e7)',
                    }}
                  >
                    <div className="jy-field-head">
                      <label
                        className="jy-field-label"
                        htmlFor="jy-settings-custom-logo"
                      >
                        站点 Logo
                      </label>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        id="jy-settings-custom-logo"
                        className="jy-field-input"
                        type="text"
                        value={customLogo}
                        onChange={(e) => setCustomLogo(e.target.value)}
                        placeholder="为空则自动显示原生小黑鱼 Logo"
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="jy-card-discard"
                        style={{
                          whiteSpace: 'nowrap',
                          height: '34px',
                          padding: '0 14px',
                          boxSizing: 'border-box',
                        }}
                        onClick={() =>
                          document
                            .getElementById('jy-logo-file-picker')
                            ?.click()
                        }
                      >
                        选择本地图片
                      </button>
                      <input
                        id="jy-logo-file-picker"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                    </div>
                    <p className="jy-field-hint">
                      系统左上角及网页 Favicon 小图标链接，支持 Base64
                      数据编码或公网 URL 地址。
                    </p>
                  </div>
                </>
              )}
            </>
          ) : (
            // Dynamic form fields loops generated for any other third-party schemas
            Object.keys(descriptor.schema.properties || {}).map(
              (fieldKey, idx) => {
                const prop = descriptor.schema.properties?.[fieldKey] || {};
                const isFirst = idx === 0;
                return (
                  <div
                    key={fieldKey}
                    className="jy-field"
                    style={
                      isFirst
                        ? {}
                        : {
                            borderTop:
                              '1px solid var(--dsw-alias-border-l2, #e4e4e7)',
                          }
                    }
                  >
                    <div className="jy-field-head">
                      <label
                        className="jy-field-label"
                        htmlFor={`jy-settings-${descriptor.ns}-${fieldKey}`}
                      >
                        {fieldKey}
                      </label>
                    </div>
                    <input
                      id={`jy-settings-${descriptor.ns}-${fieldKey}`}
                      className="jy-field-input"
                      type="text"
                      value={dynamicValues[fieldKey] || ''}
                      onChange={(e) => {
                        setDynamicValues({
                          ...dynamicValues,
                          [fieldKey]: e.target.value,
                        });
                      }}
                    />
                    {prop.description && (
                      <p className="jy-field-hint">{prop.description}</p>
                    )}
                  </div>
                );
              }
            )
          )}

          {/* Footer Actions */}
          <div className="jy-card-footer">
            <button
              type="button"
              className="jy-card-discard"
              disabled={!isDirty || saving}
              onClick={handleDiscard}
            >
              放弃修改
            </button>
            <button
              type="button"
              className="jy-card-save"
              disabled={!isDirty || saving}
              onClick={handleSave}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

// ----------------------------------------------------
// Root configuration tabs container
// ----------------------------------------------------
const NATIVE_BUILTIN_NS = [
  'terminal',
  'loop',
  'web-search-deepseek',
  'agent-loop',
  'agent-presets',
  'shell',
  'permission',
  'ui-theme',
  'ui-onboarding',
  'ui-conversation',
  'llm-deepseek',
  'llm-pi-ai',
  'agent-default-model',
  'locale',
];

export function AutoSchemaCards() {
  const [descriptors, setDescriptors] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchDescriptors = () => {
    fetch('/api/jingyun/branding/descriptors')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          // Filter out native built-in cards and properties-empty plugins
          const filtered = data.data.filter((item: any) => {
            // A. Strict built-in exclusion blacklist
            if (NATIVE_BUILTIN_NS.includes(item.ns)) {
              return false;
            }
            // B. Eliminate empty properties (plugins that register namespace but define no configuration keys)
            const keys = Object.keys(item.schema?.properties || {});
            if (keys.length === 0 && item.ns !== 'jingyun-dsh') {
              return false;
            }
            return true;
          });
          setDescriptors(filtered);
        }
      })
      .catch((err) =>
        console.error(
          '[UIBranding] Failed to retrieve settings descriptors:',
          err
        )
      )
      .finally(() => setLoading(false));
  };

  React.useEffect(() => {
    fetchDescriptors();
  }, []);

  const handleSaveConfig = async (ns: string, data: Record<string, any>) => {
    const res = await fetch('/api/jingyun/branding/descriptors/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ns, patch: data }),
    });
    if (!res.ok) {
      throw new Error('Server returned error on configurations update.');
    }
  };

  if (loading) {
    return (
      <p style={{ fontSize: '13px', color: 'var(--dsw-alias-label-tertiary)' }}>
        正在获取配置项列表...
      </p>
    );
  }

  if (descriptors.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: 'var(--dsw-alias-label-tertiary)' }}>
        暂无可配置扩展插件。
      </p>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {descriptors.map((desc: any) => (
        <ConfigItemCard
          key={desc.ns}
          descriptor={desc}
          onSaveConfig={handleSaveConfig}
        />
      ))}
    </div>
  );
}

// ----------------------------------------------------
// Global Toast notification system
// ----------------------------------------------------
