import { FishLogo } from '@deepseek-ai/dsh-client-ui-primitives';
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

  const displayName = name || 'AI Studio';
  return (
    <span
      style={{
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--dsw-alias-label-primary)',
        whiteSpace: 'nowrap',
      }}
    >
      {displayName}
    </span>
  );
}

export function HeroSlotAutoHider(_props?: {
  size?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    brandingManager.fetch().then(() => {
      setLoaded(true);
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!loaded) return;
    if (ref.current) {
      if (ref.current.parentElement) {
        ref.current.parentElement.style.display = 'none';
        if (ref.current.parentElement.parentElement) {
          ref.current.parentElement.parentElement.style.display = 'none';
        }
      }
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
  }, [loaded]);

  if (!loaded) return null;

  return React.createElement('span', {
    ref,
    id: 'hero-hide-anchor',
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

export function normalizeUrl(url?: string, defaultUrl = ''): string {
  if (!url || typeof url !== 'string') return defaultUrl;
  let trimmed = url.trim();
  if (!trimmed) return defaultUrl;
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed.replace(/\/+$/, '');
}

export function openExternalUrl(url: string) {
  if (!url) return;
  const target = normalizeUrl(url);
  try {
    const winWithTauri =
      typeof window !== 'undefined'
        ? (window as Window & {
            __TAURI__?: {
              opener?: { openUrl: (url: string) => Promise<void> };
              core?: {
                invoke: (
                  cmd: string,
                  args?: Record<string, unknown>
                ) => Promise<unknown>;
              };
            };
          })
        : undefined;
    const tauri = winWithTauri?.__TAURI__;
    if (tauri?.opener?.openUrl) {
      tauri.opener.openUrl(target).catch(() => {
        window.open(target, '_blank', 'noopener,noreferrer');
      });
      return;
    }
    if (tauri?.core?.invoke) {
      tauri.core
        .invoke('plugin:opener|open_url', {
          rule: { type: 'open', url: target },
        })
        .catch(() => {
          window.open(target, '_blank', 'noopener,noreferrer');
        });
      return;
    }
  } catch {}
  if (typeof window !== 'undefined') {
    window.open(target, '_blank', 'noopener,noreferrer');
  }
}
