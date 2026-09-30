import React, { useEffect, useState } from 'react';

import { sessionAgentMemory } from '../components/AgentSelectorBtn';
import { brandingManager } from '../components/BrandBranding';
import { sendPromptToComposer } from '../dom-helper';
import { globalClientContext } from '../index';

interface OnlineWorkspaceMainViewProps {
  subPath?: string;
}

export function OnlineWorkspaceMainView({
  subPath = '/',
}: OnlineWorkspaceMainViewProps) {
  const [appHost, setAppHost] = useState('');
  const [currentTheme, setCurrentTheme] = useState(() => {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem('jy_theme_mode') || 'light'
      : 'light';
  });
  useEffect(() => {
    brandingManager.fetch().then((data) => {
      const host = (data && data.appHost) || '';
      setAppHost(host);
    });

    const handleThemeChange = (e: CustomEvent<string>) => {
      const newTheme =
        e.detail ||
        (typeof localStorage !== 'undefined'
          ? localStorage.getItem('jy_theme_mode') || 'light'
          : 'light');
      if (newTheme) {
        setCurrentTheme(newTheme);
        const iframeEl = document.querySelector(
          '.jy-online-workspace-iframe'
        ) as HTMLIFrameElement | null;
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

    window.addEventListener(
      'jy_theme_change',
      handleThemeChange as EventListener
    );
    return () =>
      window.removeEventListener(
        'jy_theme_change',
        handleThemeChange as EventListener
      );
  }, []);

  // 监听来自 iframe 的跨域消息通信
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const { type, payload } = event.data || {};

      if (type === 'JY_LOGIN_SUCCESS') {
        const { token, user } = payload || {};
        if (token && typeof localStorage !== 'undefined') {
          localStorage.setItem('jy_online_token', token);
          if (user) {
            localStorage.setItem('jy_online_user', JSON.stringify(user));
          }
          window.dispatchEvent(
            new CustomEvent('jy_auth_changed', { detail: { token, user } })
          );
        }
      }

      if (type === 'JY_CREATE_AGENT_ACTION') {
        const promptText = payload?.prompt;
        if (!promptText) return;
        sendPromptToComposer(promptText);
      }

      if (type === 'JY_START_CHAT_AGENT') {
        const agentId = payload?.agentId || 'none';
        // 1. 关闭主面板返回会话视图
        globalClientContext?.layout?.selectPanel?.(null);

        // 2. 触发新建任务
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
          }) as HTMLElement | undefined;

          if (newChatBtn) {
            newChatBtn.click();
          }

          let timerCount = 0;
          const emitAgent = () => {
            if (typeof window !== 'undefined') {
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
              typeof (event.source as Window).postMessage === 'function'
            ) {
              (event.source as Window).postMessage(respData, '*');
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

  if (!appHost) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--dsw-alias-label-secondary, #666)',
          fontSize: '14px',
        }}
      >
        未配置线上服务域名，请在桌面端设置中配置 app_host
      </div>
    );
  }

  let finalIframeUrl = appHost;
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
    finalIframeUrl = `${cleanHost}${cleanSubPath}${
      cleanSubPath.includes('?') ? '&' : '?'
    }embed=true&theme=${currentTheme}`;
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--dsh-boot-bg, #ffffff)',
        overflow: 'hidden',
      }}
    >
      <iframe
        key={finalIframeUrl}
        className="jy-online-workspace-iframe"
        src={finalIframeUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-downloads allow-modals"
        allow="camera; microphone; clipboard-read; clipboard-write; display-capture; autoplay; fullscreen"
      />
    </div>
  );
}
