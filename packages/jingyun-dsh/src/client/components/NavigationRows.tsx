import {
  IconSkillOutline16,
  IconBranchOutline16,
  IconLinkOutline16,
  IconDataOutline16,
  IconProjectAddOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives';
import React from 'react';
import { createPortal } from 'react-dom';

import { AutomationPanel } from '../pages/AutomationPanel';
import { ConnectorPanel } from '../pages/ConnectorPanel';
import { brandingManager, showToast } from './BrandBranding';

interface NavigationRowsProps {
  wide?: boolean;
}

export function NavigationRows({ wide = true }: NavigationRowsProps) {
  const isCollapsed = !wide;
  const [currentHash, setCurrentHash] = React.useState(
    typeof window !== 'undefined' ? window.location.hash || '' : ''
  );
  const [topPortalTarget, setTopPortalTarget] =
    React.useState<HTMLElement | null>(null);

  const handleNavClick = (
    e: React.MouseEvent,
    targetHash: string,
    requiresConfig: boolean
  ) => {
    e.stopPropagation();
    if (!requiresConfig) {
      window.location.hash = targetHash;
      return;
    }

    brandingManager.fetch().then((data) => {
      const configured = !!(data?.apiUrl || data?.appHost);
      if (!configured) {
        showToast('线上域名未配置，请先配置');
      } else {
        window.location.hash = targetHash;
      }
    });
  };

  React.useEffect(() => {
    // 寻找顶部“新会话”按钮的后方容器，实现纯声明式 Portal 移至顶部
    const newChatBtn =
      document.querySelector('button[class*="newSession"]') ||
      Array.from(document.querySelectorAll('button')).find((btn) => {
        const text = btn.textContent || '';
        return (
          text.includes('新会话') ||
          text.includes('新建会话') ||
          text.includes('New Chat') ||
          text.includes('新建任务')
        );
      });

    if (newChatBtn) {
      const labelSpan =
        newChatBtn.querySelector('[class*="newSessionLabel"]') ||
        newChatBtn.querySelector('span');
      if (labelSpan && labelSpan.textContent !== '新建任务') {
        labelSpan.textContent = '新建任务';
      }

      // 使用原生 MutationObserver 实时响应框架文案更新，无需定时器
      const btnObserver = new MutationObserver(() => {
        const span =
          newChatBtn.querySelector('[class*="newSessionLabel"]') ||
          newChatBtn.querySelector('span');
        if (
          span &&
          span.textContent !== '新建任务' &&
          span.textContent !== ''
        ) {
          span.textContent = '新建任务';
        }
      });
      btnObserver.observe(newChatBtn, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      if (newChatBtn.parentElement) {
        let portalDiv = newChatBtn.parentElement.querySelector(
          '#jy-nav-top-portal'
        ) as HTMLElement | null;
        if (!portalDiv) {
          portalDiv = document.createElement('div');
          portalDiv.id = 'jy-nav-top-portal';
          portalDiv.style.width = '100%';
          portalDiv.style.display = 'flex';
          portalDiv.style.flexDirection = 'column';
          portalDiv.style.gap = '2px';
          portalDiv.style.marginTop = '4px';
          portalDiv.style.marginBottom = '8px';
          newChatBtn.insertAdjacentElement('afterend', portalDiv);
        }
        setTopPortalTarget(portalDiv);
      }
    }

    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navContent = (
    <div
      className="jy-sidebar-custom-links"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
    >
      {/* 1. 应用市场 */}
      <button
        type="button"
        className={`jy-sidebar-btn jy-sidebar-link-market ${currentHash.includes('path=%2Fzh%2Fmarketplace') || currentHash.includes('path=/zh/marketplace') ? 'jy-active' : ''}`}
        onClick={(e) =>
          handleNavClick(e, '#/jingyun/more?path=%2Fzh%2Fmarketplace', true)
        }
      >
        <IconSkillOutline16 size={16} className="link-icon" />
        {!isCollapsed && <span>应用市场</span>}
      </button>

      {/* 2. 连接器 */}
      <button
        type="button"
        className={`jy-sidebar-btn jy-sidebar-link-connector ${currentHash === '#/jingyun/connectors' ? 'jy-active' : ''}`}
        onClick={(e) => handleNavClick(e, '#/jingyun/connectors', false)}
      >
        <IconBranchOutline16 size={16} className="link-icon" />
        {!isCollapsed && <span>连接器</span>}
      </button>

      {/* 3. 自动化 */}
      <button
        type="button"
        className={`jy-sidebar-btn jy-sidebar-link-auto ${currentHash === '#/jingyun/automation' ? 'jy-active' : ''}`}
        onClick={(e) => handleNavClick(e, '#/jingyun/automation', false)}
      >
        <IconLinkOutline16 size={16} className="link-icon" />
        {!isCollapsed && <span>自动化</span>}
      </button>

      {/* 4. 资产库 (链接到 /zh/my-assets) */}
      <button
        type="button"
        className={`jy-sidebar-btn jy-sidebar-link-assets ${currentHash.includes('path=%2Fzh%2Fmy-assets') || currentHash.includes('path=/zh/my-assets') ? 'jy-active' : ''}`}
        onClick={(e) =>
          handleNavClick(e, '#/jingyun/more?path=%2Fzh%2Fmy-assets', true)
        }
      >
        <IconDataOutline16 size={16} className="link-icon" />
        {!isCollapsed && <span>资产库</span>}
      </button>

      {/* 5. 更多 (线上资源) */}
      <button
        type="button"
        className={`jy-sidebar-btn jy-sidebar-link-more ${currentHash.startsWith('#/jingyun/more') && !currentHash.includes('marketplace') && !currentHash.includes('my-assets') ? 'jy-active' : ''}`}
        onClick={(e) => handleNavClick(e, '#/jingyun/more?path=%2F', true)}
        style={{
          display: 'flex',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <span
          style={{
            marginRight: isCollapsed ? '0' : '12px',
            display: 'inline-flex',
          }}
        >
          <IconProjectAddOutline16 size={16} className="link-icon" />
        </span>
        {!isCollapsed && <span>更多</span>}
        {!isCollapsed && (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--dsw-alias-label-tertiary, #9e9e9e)',
              marginLeft: 'auto',
              paddingRight: '4px',
            }}
          >
            线上资源
          </span>
        )}
      </button>
    </div>
  );

  if (topPortalTarget) {
    return createPortal(navContent, topPortalTarget);
  }

  return navContent;
}

function OnlineWorkspaceOverlay() {
  const [appHost, setAppHost] = React.useState('');
  const [currentHash, setCurrentHash] = React.useState(
    typeof window !== 'undefined' ? window.location.hash || '' : ''
  );
  const [targetEl, setTargetEl] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    brandingManager.fetch().then((data) => {
      const host = (data && data.appHost) || '';
      setAppHost(host);
    });

    const handleHashChange = () => {
      const hash = window.location.hash || '';
      setCurrentHash(hash);
    };
    window.addEventListener('hashchange', handleHashChange);

    // 捕获阶段监听侧边栏交互：处线上资源页面时，若点击侧边栏的会话或新建任务按钮，自动退出遮罩
    const handleGlobalClick = (e: MouseEvent) => {
      const hash = window.location.hash || '';
      const isOverlay =
        hash.startsWith('#/jingyun/more') ||
        hash === '#/jingyun/connectors' ||
        hash === '#/jingyun/automation';
      if (!isOverlay) return;
      const target = e.target as HTMLElement;
      if (!target) return;

      // 过滤折叠/展开侧边栏按钮，避免误触发退出
      const isToggleBtn =
        target.closest('button[class*="toggle"]') ||
        target.closest('button[class*="collapse"]') ||
        target.closest('button[class*="expand"]') ||
        target.closest('button[class*="trigger"]') ||
        target.closest('[aria-label*="collapse"]') ||
        target.closest('[aria-label*="toggle"]');

      const isMoreControl =
        target.closest('.jy-sidebar-custom-links') ||
        target.closest('.jy-sidebar-link-more') ||
        target.closest('.jy-more-dropdown') ||
        target.closest('.jy-workspace-overlay');

      const isSwitchViewInteraction =
        target.closest('button[class*="newSession"]') ||
        target.closest('a[href]') ||
        target.closest('[class*="session"]') ||
        target.closest('[class*="history"]');

      if (!isMoreControl && !isToggleBtn && isSwitchViewInteraction) {
        window.location.hash = '#/';
        setCurrentHash('#/');
      }
    };
    window.addEventListener('click', handleGlobalClick, true);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

  const isConnectorsRoute = currentHash === '#/jingyun/connectors';
  const isAutomationRoute = currentHash === '#/jingyun/automation';
  const isOverlayActive =
    currentHash.startsWith('#/jingyun/more') ||
    isConnectorsRoute ||
    isAutomationRoute;

  React.useEffect(() => {
    if (!isOverlayActive) {
      setTargetEl(null);
      document.body.classList.remove('jy-route-more');
      return;
    }

    document.body.classList.add('jy-route-more');
    const sidebar = document.querySelector('[class*="sidebar"]');
    const mainEl =
      sidebar && sidebar.parentElement
        ? (Array.from(sidebar.parentElement.children).find(
            (el) => el !== sidebar
          ) as HTMLElement)
        : null;

    if (mainEl) {
      if (mainEl.style.position !== 'relative') {
        mainEl.style.position = 'relative';
      }
      setTargetEl(mainEl);
    }
  }, [currentHash, isOverlayActive]);

  const [currentTheme, setCurrentTheme] = React.useState<string>(() => {
    if (typeof document !== 'undefined') {
      const saved = localStorage.getItem('jy_theme_mode');
      if (saved) return saved;
      const isDark =
        document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark');
      return isDark ? 'dark' : 'light';
    }
    return 'light';
  });

  // 监听 DSH 宿主的主题切换事件
  React.useEffect(() => {
    const handleThemeChange = (e: any) => {
      const newTheme =
        e.detail ||
        (typeof localStorage !== 'undefined'
          ? localStorage.getItem('jy_theme_mode')
          : 'light');
      if (newTheme) {
        setCurrentTheme(newTheme);
        // 给当前的 iframe 实例即时发送 postMessage
        const iframeEl = document.querySelector(
          '.jy-workspace-overlay iframe'
        ) as HTMLIFrameElement;
        if (iframeEl && iframeEl.contentWindow) {
          try {
            iframeEl.contentWindow.postMessage(
              { type: 'JY_THEME_CHANGE', theme: newTheme },
              '*'
            );
          } catch {}
        }
      }
    };

    window.addEventListener('jy_theme_change', handleThemeChange as any);
    return () =>
      window.removeEventListener('jy_theme_change', handleThemeChange as any);
  }, []);

  // Listen to postMessage from embedded iframe
  React.useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const { type, payload } = event.data || {};

      if (type === 'JY_LOGIN_SUCCESS') {
        const { token, user } = payload || {};
        if (token && typeof localStorage !== 'undefined') {
          localStorage.setItem('jy_online_token', token);
          if (user) {
            localStorage.setItem('jy_online_user', JSON.stringify(user));
          }
        }
      }

      // 0. 创建智能体/技能：退出应用市场遮罩，跳转至主页并预填指令
      if (type === 'JY_CREATE_AGENT_ACTION') {
        const prompt = payload?.prompt;
        // 1. 退出线上资源 iframe 遮罩层
        window.location.hash = '#/';
        setCurrentHash('#/');

        // 2. 触发新建任务 (新建会话)
        setTimeout(() => {
          const allButtons = Array.from(document.querySelectorAll('button'));
          const newChatBtn = allButtons.find((b) => {
            const t =
              (b.textContent || '') + (b.getAttribute('aria-label') || '');
            return (
              t.includes('新建') ||
              t.includes('New') ||
              b.className.includes('newSession')
            );
          }) as HTMLElement;

          if (newChatBtn) {
            newChatBtn.click();
          }

          // 3. 填充指令到输入框并聚焦
          setTimeout(() => {
            if (prompt && typeof window !== 'undefined') {
              const textareas = document.querySelectorAll('textarea');
              if (textareas.length > 0) {
                const targetInput = (
                  document.activeElement?.tagName === 'TEXTAREA'
                    ? document.activeElement
                    : textareas[textareas.length - 1]
                ) as HTMLTextAreaElement;

                if (targetInput) {
                  const nativeInputValueSetter =
                    Object.getOwnPropertyDescriptor(
                      window.HTMLTextAreaElement.prototype,
                      'value'
                    )?.set;
                  if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(targetInput, prompt);
                  } else {
                    targetInput.value = prompt;
                  }
                  targetInput.focus();
                  targetInput.setSelectionRange(prompt.length, prompt.length);
                  targetInput.dispatchEvent(
                    new Event('input', { bubbles: true })
                  );
                  targetInput.dispatchEvent(
                    new Event('change', { bubbles: true })
                  );
                }
              }
            }
          }, 250);
        }, 150);
      }

      // 1. 获取本地已安装资产清单 (全量详情与数组)
      if (type === 'JY_GET_INSTALLED_ASSETS') {
        try {
          const res = await fetch('/api/jingyun/installed-assets');
          const json = await res.json();
          if (json.success) {
            const respData = {
              type: 'JY_INSTALLED_ASSETS_RESP',
              payload: json.data?.all || [],
              data: json.data || {},
            };

            // 1.1 精准单播回发给请求来源 window
            if (
              event.source &&
              typeof (event.source as any).postMessage === 'function'
            ) {
              (event.source as any).postMessage(respData, '*');
            }

            // 1.2 广播给宿主中所有的 iframe
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach((iframe) => {
              iframe.contentWindow?.postMessage(respData, '*');
            });
          }
        } catch (e) {
          console.warn('[DSH] Failed to query installed assets:', e);
        }
      }

      // 1.1 打开本地物理文件夹
      if (type === 'JY_OPEN_FOLDER') {
        try {
          await fetch('/api/jingyun/assets/open-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload || {}),
          });
        } catch (e) {
          console.warn('[DSH] Failed to open folder:', e);
        }
      }

      // 1.2 删除本地资产
      if (type === 'JY_DELETE_ASSET') {
        try {
          const res = await fetch('/api/jingyun/assets/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload || {}),
          });
          const json = await res.json();
          // 重新扫描并广播
          const scanRes = await fetch('/api/jingyun/installed-assets');
          const scanJson = await scanRes.json();
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach((iframe) => {
            iframe.contentWindow?.postMessage(
              {
                type: 'JY_INSTALLED_ASSETS_RESP',
                payload: scanJson.data?.all || [],
                data: scanJson.data || {},
                deletedSlug: payload?.slug,
                success: json.success,
              },
              '*'
            );
          });
        } catch (e) {
          console.warn('[DSH] Failed to delete asset:', e);
        }
      }

      // 2. 安装与挂载资产
      if (type === 'JY_LAUNCH_PLUGIN' || type === 'JY_INSTALL_ASSET') {
        try {
          const res = await fetch('/api/jingyun/assets/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload || {}),
          });
          const json = await res.json();
          if (json.success) {
            // 重新扫描并广播已安装更新
            const scanRes = await fetch('/api/jingyun/installed-assets');
            const scanJson = await scanRes.json();
            const allSlugs = scanJson.data?.all || [];

            const iframes = document.querySelectorAll('iframe');
            iframes.forEach((iframe) => {
              iframe.contentWindow?.postMessage(
                {
                  type: 'JY_ASSET_INSTALLED',
                  payload: { slug: payload?.slug, all: allSlugs },
                },
                '*'
              );
            });
          }
        } catch (e) {
          console.error('[DSH] Failed to install asset:', e);
        }
      }

      // 3. 卸载本地资产
      if (type === 'JY_UNINSTALL_ASSET') {
        try {
          const res = await fetch('/api/jingyun/assets/uninstall', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload || {}),
          });
          const json = await res.json();
          if (json.success) {
            const scanRes = await fetch('/api/jingyun/installed-assets');
            const scanJson = await scanRes.json();
            const allSlugs = scanJson.data?.all || [];

            const iframes = document.querySelectorAll('iframe');
            iframes.forEach((iframe) => {
              iframe.contentWindow?.postMessage(
                {
                  type: 'JY_ASSET_UNINSTALLED',
                  payload: { slug: payload?.slug, all: allSlugs },
                },
                '*'
              );
            });
          }
        } catch (e) {
          console.error('[DSH] Failed to uninstall asset:', e);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!isOverlayActive || !targetEl) {
    return null;
  }

  if (isConnectorsRoute) {
    return createPortal(
      <div className="jy-workspace-overlay">
        <ConnectorPanel />
      </div>,
      targetEl
    );
  }

  if (isAutomationRoute) {
    return createPortal(
      <div className="jy-workspace-overlay">
        <AutomationPanel />
      </div>,
      targetEl
    );
  }

  if (!appHost) return null;

  let finalIframeUrl = appHost;
  const pathPrefix = '?path=';
  const pIdx = currentHash.indexOf(pathPrefix);
  let subPath = '/';
  if (pIdx !== -1) {
    const rawPath = currentHash.substring(pIdx + pathPrefix.length);
    try {
      subPath = decodeURIComponent(rawPath);
    } catch {
      subPath = rawPath;
    }
  }

  try {
    const baseUrl = appHost.endsWith('/') ? appHost : appHost + '/';
    const cleanSubPath = subPath.startsWith('/') ? subPath.slice(1) : subPath;
    const targetUrl = new URL(cleanSubPath, baseUrl);
    targetUrl.searchParams.set('embed', 'true');
    targetUrl.searchParams.set('theme', currentTheme);
    const cachedToken =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('jy_online_token')
        : null;
    if (cachedToken) {
      targetUrl.searchParams.set('token', cachedToken);
    }
    finalIframeUrl = targetUrl.toString();
  } catch {
    const cleanHost = appHost.endsWith('/') ? appHost.slice(0, -1) : appHost;
    const cleanSubPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
    finalIframeUrl = `${cleanHost}${cleanSubPath}${cleanSubPath.includes('?') ? '&' : '?'}embed=true&theme=${currentTheme}`;
  }

  return createPortal(
    <div className="jy-workspace-overlay">
      <iframe
        key={finalIframeUrl}
        src={finalIframeUrl}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-downloads allow-modals"
        allow="camera; microphone; clipboard-read; clipboard-write; display-capture; autoplay; fullscreen"
      />
    </div>,
    targetEl
  );
}

export function openLoginModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jy_open_login_modal'));
  }
}

export function openUpgradeModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jy_open_upgrade_modal'));
  }
}

export function openRechargeModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jy_open_recharge_modal'));
  }
}

export function openCardActivateModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jy_open_card_activate_modal'));
  }
}

function checkIsTauri() {
  if (typeof window === 'undefined') return false;
  return !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;
}
