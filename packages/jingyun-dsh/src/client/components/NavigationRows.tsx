import {
  IconSkillOutline16,
  IconBranchOutline16,
  IconLinkOutline16,
  IconDataOutline16,
  IconProjectAddOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives';
import React from 'react';
import { createPortal } from 'react-dom';

import {
  ASSISTANT_SESSION_STORAGE_KEY,
  globalClientContext,
  openAssistantSession,
} from '../index';
import { brandingManager, showToast } from './BrandBranding';

const AssistantNavIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className="link-icon"
    style={{ flexShrink: 0 }}
  >
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="9.5" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M6.5 19c1.6-2.8 3.5-3.5 5.5-3.5s3.9.7 5.5 3.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

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
  const [isAssistantActive, setIsAssistantActive] = React.useState(false);

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
      const configured = !!data?.appHost;
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
      const handleNewChatClick = () => {
        setIsAssistantActive(false);
        if (window.location.hash && window.location.hash !== '#/') {
          window.location.hash = '#/';
        }
      };
      newChatBtn.addEventListener('click', handleNewChatClick);

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
        queueMicrotask(() => {
          setTopPortalTarget(portalDiv);
        });
      }
    }

    const checkState = () => {
      const hash = window.location.hash || '';
      setCurrentHash(hash);
      if (hash && hash.startsWith('#/jingyun/')) {
        setIsAssistantActive(false);
        return;
      }
      // 只能通过 sessionId 精准匹配激活状态，绝不爬取 DOM 或做文本模糊猜测
      const currentId =
        globalClientContext?.sessions?.list?.getSnapshot()?.current;
      const assistantId = localStorage.getItem(ASSISTANT_SESSION_STORAGE_KEY);

      setIsAssistantActive(
        Boolean(currentId && assistantId && currentId === assistantId)
      );
    };

    checkState();
    const timer = setInterval(checkState, 200);
    window.addEventListener('hashchange', checkState);
    const unsub = globalClientContext?.sessions?.list?.subscribe(checkState);

    return () => {
      clearInterval(timer);
      window.removeEventListener('hashchange', checkState);
      unsub?.();
    };
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
      {/* 0. 智能助理 (DSH Assistant) */}
      <button
        type="button"
        className={`jy-sidebar-btn jy-sidebar-link-assistant ${
          isAssistantActive ? 'jy-active' : ''
        }`}
        onClick={async (e) => {
          e.stopPropagation();
          await openAssistantSession();
        }}
      >
        <AssistantNavIcon size={16} />
        {!isCollapsed && <span>助理</span>}
      </button>
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
