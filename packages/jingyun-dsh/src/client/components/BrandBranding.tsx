import { FishLogo, BrandWordmark } from '@deepseek-ai/dsh-client-ui-primitives';
import React from 'react';

// Single source of truth for front-end branding configuration states
export const brandingManager = {
  cached: null as any,
  promise: null as Promise<any> | null,

  fetch(): Promise<any> {
    if (this.cached) return Promise.resolve(this.cached);
    if (this.promise) return this.promise;
    this.promise = fetch('/api/jingyun/branding')
      .then((r) => r.json())
      .then((data) => {
        this.cached = data;
        this.promise = null;
        return data;
      })
      .catch((err) => {
        console.error('[UIBranding] Failed to fetch branding config:', err);
        this.promise = null;
        return null;
      });
    return this.promise;
  },

  clear() {
    this.cached = null;
    this.promise = null;
  },

  updateCache(logo: string, name: string) {
    this.cached = { ...this.cached, site_logo: logo, site_name: name };
  },
};

export function CustomBrandMark({ size = 24 }: { size?: number }) {
  const [logo, setLogo] = React.useState('');
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    brandingManager.fetch().then((data) => {
      if (data?.site_logo) setLogo(data.site_logo);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return null;

  if (!logo) {
    return <FishLogo size={size} />;
  }

  return (
    <img
      src={logo}
      alt="Logo"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        borderRadius: '4px',
        pointerEvents: 'none',
      }}
    />
  );
}

export function CustomBrandName() {
  const [name, setName] = React.useState('');
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    brandingManager.fetch().then((data) => {
      if (data?.site_name) setName(data.site_name);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return null;

  if (!name) {
    return <BrandWordmark includeMark={false} />;
  }

  return (
    <span
      style={{
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--dsw-alias-label-primary)',
        whiteSpace: 'nowrap',
      }}
    >
      {name}
    </span>
  );
}

export function HeroSlotAutoHider(props: any) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [hasCustom, setHasCustom] = React.useState(true);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    brandingManager.fetch().then((data) => {
      const custom = !!(data?.site_logo || data?.site_name);
      setHasCustom(custom);
      setLoaded(true);
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!loaded || !hasCustom) return;
    if (ref.current) {
      // 【三保险机制之一：JS DOM树级别主动隐藏】
      // 宿主（DSH底座）的 EmptyHero 等标语元素是由其客户端内部动态生成的。为了彻底防范
      // 首屏渲染时序不一致而产生的官方标语“闪现/抖动”现象，此处采用 DOM 遍历强行将父级容器隐藏。

      // 1. 隐藏父级 FishHitbox
      if (ref.current.parentElement) {
        ref.current.parentElement.style.display = 'none';
        // 2. 隐藏爷爷级 headline 容器
        if (ref.current.parentElement.parentElement) {
          ref.current.parentElement.parentElement.style.display = 'none';
        }
      }
      // 3. 递归向上匹配带有 headline/EmptyHero 的容器以防嵌套结构变化
      let current: HTMLElement | null = ref.current;
      for (let i = 0; i < 5 && current; i++) {
        const cls = current.className || '';
        if (cls.includes('headline') || cls.includes('EmptyHero')) {
          current.style.display = 'none';
          break;
        }
        current = current.parentElement;
      }
    }
  }, [loaded, hasCustom]);

  if (!loaded) return null;

  if (!hasCustom) {
    // 如果没有自定义配置，回退显示底座默认的鱼标
    return <FishLogo size={props?.size || 64} className={props?.className} />;
  }

  return React.createElement('span', {
    ref,
    id: 'jy-hero-hide-anchor',
    style: { display: 'none' },
  });
}

export function showToast(message: string) {
  if (typeof document === 'undefined') return;
  let toast = document.querySelector(
    '.jy-custom-toast'
  ) as HTMLDivElement | null;
  if (toast) {
    toast.remove();
  }

  toast = document.createElement('div');
  toast.className = 'jy-custom-toast';
  toast.textContent = message;

  if (!document.getElementById('jy-toast-style')) {
    const style = document.createElement('style');
    style.id = 'jy-toast-style';
    style.textContent = `
      .jy-custom-toast {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: rgba(24, 24, 27, 0.9) !important;
        backdrop-filter: blur(8px);
        color: #ffffff !important;
        padding: 8px 16px;
        border-radius: 9999px;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 99999;
        opacity: 0;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
        pointer-events: none;
        -webkit-font-smoothing: antialiased;
      }
      .jy-custom-toast.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    if (toast) toast.classList.add('show');
  });

  setTimeout(() => {
    if (toast) {
      toast.classList.remove('show');
      const t = toast;
      setTimeout(() => t.remove(), 200);
    }
  }, 3000);
}
