import React from 'react';
import { createPortal } from 'react-dom';

import { AutomationPanel } from '../pages/AutomationPanel';
import { ConnectorPanel } from '../pages/ConnectorPanel';
import { sessionAgentMemory } from './AgentSelectorBtn';
import { brandingManager } from './BrandBranding';

function checkIsTauri() {
  if (typeof window === 'undefined') return false;
  return !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;
}

export function OnlineWorkspaceOverlay() {
  const [appHost, setAppHost] = React.useState('');
  const [currentHash, setCurrentHash] = React.useState(
    typeof window !== 'undefined' ? window.location.hash || '' : ''
  );
  const [targetEl, setTargetEl] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    brandingManager.fetch().then((data) => {
      const host = (data && data.appHost) || 'https://demo.jingyun.online/';
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

      // 过滤我们自定义的菜单链接与头像弹窗，避免误触
      const isMoreControl =
        target.closest('.jy-sidebar-custom-links') ||
        target.closest('.jy-sidebar-link-more') ||
        target.closest('.jy-more-dropdown') ||
        target.closest('.jy-workspace-overlay') ||
        target.closest('[ref*="containerRef"]') || // 自定义头像按钮外层容器
        target.closest('#jy-sidebar-nav-actions') ||
        target.closest('.jy-popover-menu');

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
    document.addEventListener('click', handleGlobalClick, true);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

  // 动态锁定官方 Layout 中的 iframe 挂载点容器 (优先排除侧边栏，避免全屏遮挡)
  React.useEffect(() => {
    const locateTarget = () => {
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
      } else {
        const chatWrapper =
          document.querySelector('[class*="chatWrapper"]') ||
          document.querySelector('[class*="mainContent"]') ||
          document.querySelector('main') ||
          document.querySelector('#root');
        setTargetEl(chatWrapper as HTMLElement);
      }
    };
    locateTarget();
    const observer = new MutationObserver(locateTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const isOverlayActive =
    currentHash.startsWith('#/jingyun/more') ||
    currentHash === '#/jingyun/connectors' ||
    currentHash === '#/jingyun/automation';

  const isConnectorsRoute = currentHash === '#/jingyun/connectors';
  const isAutomationRoute = currentHash === '#/jingyun/automation';

  React.useEffect(() => {
    if (isOverlayActive) {
      document.body.classList.add('jy-route-more');
    } else {
      document.body.classList.remove('jy-route-more');
    }
    return () => {
      document.body.classList.remove('jy-route-more');
    };
  }, [isOverlayActive]);

  // 同步主应用主题和 iframe 内联样式
  const [currentTheme, setCurrentTheme] = React.useState('light');
  React.useEffect(() => {
    const handleThemeChange = (e: CustomEvent) => {
      const newTheme =
        e.detail ||
        (typeof localStorage !== 'undefined'
          ? localStorage.getItem('jy_theme_mode')
          : 'light');
      if (newTheme) {
        setCurrentTheme(newTheme);
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

      if (type === 'JY_CREATE_AGENT_ACTION') {
        const prompt = payload?.prompt;
        window.location.hash = '#/';
        setCurrentHash('#/');

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
      if (type === 'JY_START_CHAT_AGENT') {
        const agentId = payload?.agentId || 'none';
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

          // 3. 异步多次广播并劫持智能体映射，以克服新会话生成的时序滞后
          let timerCount = 0;
          const emitAgent = () => {
            if (typeof window !== 'undefined') {
              // 默认广播（新版智能体变更事件）
              window.dispatchEvent(
                new CustomEvent('jy_agent_changed', {
                  detail: { agent: agentId },
                })
              );

              try {
                const activeSessionEl =
                  document.querySelector(
                    '[class*="sessionItem"][class*="active"]'
                  ) || document.querySelector('[class*="active"]');
                if (activeSessionEl) {
                  const sessId =
                    activeSessionEl.getAttribute('data-session-id') ||
                    activeSessionEl.id ||
                    'default';
                  if (sessId && sessId !== 'default') {
                    sessionAgentMemory[sessId] = agentId;

                    // 动态携带刚截获的新 sessionId 广播智能体变更事件，驱动下拉框组件执行同步激活
                    window.dispatchEvent(
                      new CustomEvent('jy_agent_changed', {
                        detail: { agent: agentId, sessionId: sessId },
                      })
                    );
                  }
                }
              } catch {}
            }

            timerCount++;
            if (timerCount < 8) {
              setTimeout(emitAgent, 250);
            }
          };
          emitAgent();
        }, 150);
      }

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

            if (
              event.source &&
              typeof (event.source as any).postMessage === 'function'
            ) {
              (event.source as any).postMessage(respData, '*');
            }

            const iframes = document.querySelectorAll('iframe');
            iframes.forEach((iframe) => {
              iframe.contentWindow?.postMessage(respData, '*');
            });
          }
        } catch (e) {
          console.warn('[DSH] Failed to query installed assets:', e);
        }
      }

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

      if (type === 'JY_DELETE_ASSET') {
        try {
          const res = await fetch('/api/jingyun/assets/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload || {}),
          });
          const json = await res.json();
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

      if (type === 'JY_LAUNCH_PLUGIN' || type === 'JY_INSTALL_ASSET') {
        try {
          const res = await fetch('/api/jingyun/assets/install', {
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
