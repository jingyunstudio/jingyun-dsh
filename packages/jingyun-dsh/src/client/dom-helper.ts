import { brandingManager } from './components/BrandBranding';
import { styleSheetContent } from './styles';

export function applyThemeMode(mode: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  try {
    localStorage.setItem('jy_theme_mode', mode);
    localStorage.setItem('dsw_theme', mode);
    localStorage.setItem('theme', mode);
  } catch {}

  if (mode === 'dark') {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    document.body.setAttribute('data-ds-dark-theme', 'true');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    document.body.removeAttribute('data-ds-dark-theme');
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.style.colorScheme = 'light';
  }

  // 广播给 iframe 和其它监听器
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('jy_theme_change', { detail: mode })
      );
    } catch {}
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage(
          { type: 'JY_THEME_CHANGE', theme: mode },
          '*'
        );
      } catch {}
    });
    for (let i = 0; i < window.frames.length; i++) {
      try {
        window.frames[i].postMessage(
          { type: 'JY_THEME_CHANGE', theme: mode },
          '*'
        );
      } catch {}
    }
  }
}

export function initClientBrandingDOM() {
  if (typeof document !== 'undefined') {
    // 1. 无论是否定制品牌，首先注入我们自定义按钮与面板的基础样式，防止排版错乱
    let styleEl = document.getElementById(
      'jy-custom-branding-style'
    ) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'jy-custom-branding-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = styleSheetContent;

    // 初始化深浅主题 (持久化优先 -> 租户默认配置后备 -> 默认浅色)
    const savedTheme = localStorage.getItem('jy_theme_mode') as
      | 'light'
      | 'dark'
      | null;
    if (savedTheme) {
      applyThemeMode(savedTheme);
    } else {
      brandingManager.fetch().then((data: unknown) => {
        const d = data as {
          default_theme?: string;
          theme_mode?: string;
        } | null;
        const defaultTheme = d?.default_theme || d?.theme_mode || 'light';
        applyThemeMode(defaultTheme === 'dark' ? 'dark' : 'light');
      });
    }

    brandingManager.fetch().then((raw: unknown) => {
      const data = raw as { site_name?: string; site_logo?: string } | null;
      const siteTitle = data?.site_name || 'AI Studio';
      document.title = siteTitle;
      if (data?.site_logo) {
        let link = document.querySelector(
          'link[rel*="icon"]'
        ) as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        if (link.href !== data.site_logo) {
          link.href = data.site_logo;
        }
      }

      // 【三保险机制之二：MutationObserver 动态响应式捕获隐藏】
      const hideUnwantedElements = () => {
        document
          .querySelectorAll('button, a, div[role="button"]')
          .forEach((el) => {
            if (el.textContent && el.textContent.includes('Session log')) {
              (el as HTMLElement).style.display = 'none';
            }
          });

        document
          .querySelectorAll(
            'h1, h2, h3, [class*="leadTitle"], [class*="LeadTitle"], [class*="HeroTitle"], [class*="previewBadge"]'
          )
          .forEach((el) => {
            if (
              el.textContent &&
              (el.textContent.includes('探索未至之境') ||
                el.textContent.includes('预览版') ||
                el.textContent.includes('Explore the uncharted'))
            ) {
              (el as HTMLElement).style.display = 'none';
            }
          });
      };

      hideUnwantedElements();
      const observer = new MutationObserver(hideUnwantedElements);
      observer.observe(document.body, { childList: true, subtree: true });

      // 追加注入隐藏官方原生标语与按钮的覆盖样式
      styleEl.textContent =
        styleSheetContent +
        `
        /* 隐藏 Session log 按钮 */
        button[title*="Session log"],
        button[aria-label*="Session log"],
        [data-action*="session-log"] {
          display: none !important;
        }

        /* 隐藏 Hero 标语容器 */
        div:has(> [class*="heroBrandMark"]),
        div:has(> #jy-hero-hide-anchor) {
          display: none !important;
        }

        /* 【三保险机制之三：全局 CSS 条件强制隐藏】 */
        /* 隐藏空白会话中间的原生大引导语与官方标语区域，提供最快的首屏静态规则强稳覆盖 */
        [class*="EmptyHero-module_headline"],
        [class*="EmptyHero_headline"],
        [class*="headlineText"],
        [class*="previewBadge"] {
          display: none !important;
        }
      `;
    });
  }
}

/**
 * 切换回主会话页，新建会话并向 DSH 原生 Lexical Composer 输入框填充指定提示词
 */
export function sendPromptToComposer(promptText: string) {
  if (typeof window === 'undefined' || !promptText) return;

  // 1. 退出任何自定义面板/遮罩层，切回根会话页
  window.location.hash = '#/';

  setTimeout(() => {
    // 2. 模拟点击侧边栏的新建会话按钮
    const newChatBtn = Array.from(document.querySelectorAll('button')).find(
      (b) =>
        (b.textContent || '').includes('新建') ||
        b.className.includes('newSession')
    ) as HTMLElement | null;
    newChatBtn?.click();

    // 3. 轮询等待可编辑输入框就绪并写入文本
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      const el = (document.querySelector(
        '[data-composer-input][contenteditable="true"]'
      ) ||
        document.querySelector('[data-composer-input]') ||
        document.querySelector('textarea')) as HTMLElement | null;

      if (el) {
        el.focus();
        if (el.tagName === 'TEXTAREA') {
          const inputEl = el as HTMLTextAreaElement;
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
          )?.set;
          setter?.call(inputEl, promptText);
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          document.execCommand('selectAll', false);
          document.execCommand('insertText', false, promptText);
        }
        clearInterval(timer);
      } else if (attempts > 20) {
        clearInterval(timer);
      }
    }, 100);
  }, 150);
}
