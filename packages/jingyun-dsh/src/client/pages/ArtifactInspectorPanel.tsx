import React from 'react';

export interface SaveTextSpill {
  owner?: { sessionId: string };
  source?: { toolName: string };
  suggestedName?: string;
  name?: string;
  id?: string;
  content?: string;
  path?: string;
  type?: 'markdown' | 'html' | 'image' | 'file';
}

export interface ArtifactTabItem {
  id: string;
  name: string;
  type: 'markdown' | 'html' | 'image' | 'file';
  content?: string;
  path?: string;
}

// 真实产物内容渲染器：100% 数据驱动，绝不盲抓 DOM 或伪造内容
function RealArtifactRenderer({
  file,
  showCode,
}: {
  file: ArtifactTabItem;
  showCode: boolean;
}) {
  const content = file.content || '';

  // 1. HTML 网页产物渲染
  if (file.type === 'html') {
    if (showCode) {
      return (
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            height: '100%',
            backgroundColor: 'var(--dsw-alias-bg-layer-3, #ffffff)',
          }}
        >
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              fontFamily: 'SFMono-Regular, Consolas, Monaco, monospace',
              fontSize: '13.5px',
              lineHeight: '1.65',
              margin: 0,
              color: 'var(--dsw-alias-label-primary, #09090b)',
            }}
          >
            {content ||
              `<!-- 真实产物: ${file.name} 正在读取或暂无文本内容 -->`}
          </pre>
        </div>
      );
    }

    return (
      <iframe
        key={`${file.id}_${file.content ? file.content.length : 0}_${file.path || ''}`}
        srcDoc={
          content ||
          `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:30px;color:#666;text-align:center;"><h3>${file.name}</h3><p>正在读取物理文件真实内容...</p></body></html>`
        }
        title={file.name}
        style={{
          width: '100%',
          height: '100%',
          flex: 1,
          border: 'none',
          backgroundColor: '#ffffff',
        }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    );
  }

  // 2. Markdown / 纯文本代码产物渲染
  if (file.type === 'markdown' || file.type === 'file') {
    return (
      <div
        style={{
          padding: '24px',
          overflowY: 'auto',
          height: '100%',
          backgroundColor: 'var(--dsw-alias-bg-layer-3, #ffffff)',
        }}
      >
        {content ? (
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              fontFamily: 'SFMono-Regular, Consolas, Monaco, monospace',
              fontSize: '13.5px',
              lineHeight: '1.65',
              margin: 0,
              color: 'var(--dsw-alias-label-primary, #09090b)',
            }}
          >
            {content}
          </pre>
        ) : (
          <div
            style={{
              color: 'var(--dsw-alias-label-secondary, #52525b)',
              fontSize: '13px',
            }}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 600,
                margin: '0 0 8px 0',
                color: 'var(--dsw-alias-label-primary, #09090b)',
              }}
            >
              {file.name}
            </h3>
            <p style={{ margin: 0 }}>未读取到真实文件内容。</p>
          </div>
        )}
      </div>
    );
  }

  // 3. 图像产物渲染
  if (file.type === 'image') {
    const imgSrc = file.path || file.content || file.name;
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '24px',
        }}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={file.name}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
          />
        ) : (
          <div
            style={{
              color: 'var(--dsw-alias-label-secondary, #52525b)',
              fontSize: '13px',
            }}
          >
            暂无有效图片源
          </div>
        )}
      </div>
    );
  }

  return null;
}

export function ArtifactInspectorPanel({ ctx }: { ctx?: any }) {
  const [open, setOpen] = React.useState<boolean>(false);
  const [currentSessionId, setCurrentSessionId] = React.useState<
    string | undefined
  >(() => {
    try {
      return ctx?.sessions?.list?.getSnapshot()?.current;
    } catch (e) {
      console.warn('[ArtifactPanel] Failed to resolve sessions snapshot:', e);
      return undefined;
    }
  });
  const [popoverOpen, setPopoverOpen] = React.useState<boolean>(false);
  const [pinned, setPinned] = React.useState<boolean>(false);
  const [fullscreen, setFullscreen] = React.useState<boolean>(false);
  const [artifactsExpanded, setArtifactsExpanded] =
    React.useState<boolean>(true);
  const [showCodePreview, setShowCodePreview] = React.useState<boolean>(false);

  // 计算左右 50% / 50% 完美均分宽度
  const getDefaultSplitWidth = () => {
    if (typeof window !== 'undefined') {
      const sidebarEl = document.querySelector(
        '[class*="sidebar"], [class*="SideBar"]'
      ) as HTMLElement | null;
      const sidebarWidth = sidebarEl
        ? sidebarEl.getBoundingClientRect().width
        : 260;
      const availableWidth = window.innerWidth - sidebarWidth;
      return Math.max(380, Math.round(availableWidth * 0.5));
    }
    return 600;
  };

  // 左右分屏宽度状态 (默认 50/50 均分，支持拖拽调整 & LocalStorage 记住宽度)
  const [panelWidth, setPanelWidth] = React.useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jy_artifact_panel_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (
          !isNaN(parsed) &&
          parsed >= 320 &&
          parsed <= window.innerWidth - 320
        ) {
          return parsed;
        }
      }
      return getDefaultSplitWidth();
    }
    return 600;
  });

  const isResizingRef = React.useRef<boolean>(false);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    document.body.classList.add('jy-resizing-artifact');

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = startX - moveEvent.clientX;
      const sidebarEl = document.querySelector(
        '[class*="sidebar"], [class*="SideBar"]'
      ) as HTMLElement | null;
      const sidebarWidth = sidebarEl
        ? sidebarEl.getBoundingClientRect().width
        : 260;
      const minChatWidth = 480; // 核心铁律：对话区必须至少保留 480px 宽度，杜绝过度挤压
      const minArtifactWidth = 360;
      const maxAllowed = Math.max(
        minArtifactWidth,
        window.innerWidth - sidebarWidth - minChatWidth
      );
      const newWidth = Math.max(
        minArtifactWidth,
        Math.min(maxAllowed, startWidth + deltaX)
      );
      setPanelWidth(newWidth);
      document.documentElement.style.setProperty(
        '--jy-artifact-panel-width',
        `${newWidth}px`
      );
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.classList.remove('jy-resizing-artifact');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  React.useEffect(() => {
    if (open && !fullscreen) {
      document.documentElement.style.setProperty(
        '--jy-artifact-panel-width',
        `${panelWidth}px`
      );
      localStorage.setItem('jy_artifact_panel_width', String(panelWidth));
    }
  }, [panelWidth, open, fullscreen]);

  // 窗口大小变化时自适应保护左侧对话区不被挤压
  React.useEffect(() => {
    const handleWindowResize = () => {
      if (fullscreen) return;
      setPanelWidth((prev) => {
        const sidebarEl = document.querySelector(
          '[class*="sidebar"], [class*="SideBar"]'
        ) as HTMLElement | null;
        const sidebarWidth = sidebarEl
          ? sidebarEl.getBoundingClientRect().width
          : 260;
        const minChatWidth = 480;
        const minArtifactWidth = 360;
        const maxAllowed = Math.max(
          minArtifactWidth,
          window.innerWidth - sidebarWidth - minChatWidth
        );
        if (prev > maxAllowed) {
          const clamped = Math.max(minArtifactWidth, maxAllowed);
          document.documentElement.style.setProperty(
            '--jy-artifact-panel-width',
            `${clamped}px`
          );
          return clamped;
        }
        return prev;
      });
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [fullscreen]);

  // 全屏状态类绑定与安全切换
  React.useEffect(() => {
    if (fullscreen && open) {
      document.body.classList.add('jy-artifact-fullscreen-active');
    } else {
      document.body.classList.remove('jy-artifact-fullscreen-active');
    }
  }, [fullscreen, open]);

  const handleToggleFullscreen = () => {
    if (fullscreen) {
      // 退出全屏时，强制约束到安全边界内，绝不保留满屏宽度
      const sidebarEl = document.querySelector(
        '[class*="sidebar"], [class*="SideBar"]'
      ) as HTMLElement | null;
      const sidebarWidth = sidebarEl
        ? sidebarEl.getBoundingClientRect().width
        : 260;
      const maxAllowed = Math.max(360, window.innerWidth - sidebarWidth - 480);
      const validWidth =
        panelWidth > maxAllowed || panelWidth >= window.innerWidth - 300
          ? getDefaultSplitWidth()
          : panelWidth;
      setPanelWidth(validWidth);
      document.documentElement.style.setProperty(
        '--jy-artifact-panel-width',
        `${validWidth}px`
      );
      setFullscreen(false);
    } else {
      setFullscreen(true);
    }
  };

  const [openTabs, setOpenTabs] = React.useState<ArtifactTabItem[]>([]);
  const [activeTabId, setActiveTabId] = React.useState<string>('');
  const [artifactList, setArtifactList] = React.useState<ArtifactTabItem[]>([]);

  const ctxRef = React.useRef(ctx);
  React.useEffect(() => {
    ctxRef.current = ctx;
  }, [ctx]);

  const activeTabItem =
    openTabs.find((t) => t.id === activeTabId) || openTabs[0];

  React.useEffect(() => {
    // 从后端 API 读取真实物理文件 (Single Source of Truth)
    const fetchPhysicalArtifact = async (fileName: string) => {
      try {
        let sessionId = '';
        try {
          if (ctx?.sessions?.list) {
            sessionId = ctx.sessions.list.getSnapshot()?.current || '';
          }
        } catch (e) {
          console.warn('[ArtifactPanel] Failed to read current session ID:', e);
        }

        const res = await fetch(
          `/api/jingyun/artifact/read?file=${encodeURIComponent(fileName)}&sessionId=${encodeURIComponent(sessionId)}`
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (data.success && data.content) {
          return data;
        }
      } catch (e) {
        console.warn(
          '[ArtifactPanel] Failed to fetch physical file from API:',
          e
        );
      }
      return null;
    };

    // 基于磁盘真实文件的产物打开与数据填充函数（直接解析真实物理路径，绝不使用假占位）
    const openArtifactFile = async (
      fileName: string,
      rawContent?: string,
      filePath?: string,
      explicitType?: ArtifactTabItem['type']
    ) => {
      let fileType: ArtifactTabItem['type'] = explicitType || 'file';
      if (!explicitType) {
        if (/\.html$/i.test(fileName)) fileType = 'html';
        else if (/\.md$/i.test(fileName)) fileType = 'markdown';
        else if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fileName))
          fileType = 'image';
      }

      let resolvedContent = rawContent || '';
      let resolvedPath = filePath || '';

      // 立即从后端物理 API 优先获取真实物理路径与内容
      const diskData = await fetchPhysicalArtifact(resolvedPath || fileName);
      if (diskData) {
        if (diskData.content) resolvedContent = diskData.content;
        if (diskData.path) resolvedPath = diskData.path;
      }

      const newItem: ArtifactTabItem = {
        id: fileName,
        name: fileName,
        type: fileType,
        content: resolvedContent,
        path: resolvedPath || fileName,
      };

      setOpenTabs((prev) => {
        const existingIdx = prev.findIndex((t) => t.id === fileName);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            content: resolvedContent || updated[existingIdx].content,
            path: resolvedPath || updated[existingIdx].path,
          };
          return updated;
        }
        return [...prev, newItem];
      });

      setArtifactList((prev) => {
        const existingIdx = prev.findIndex((t) => t.id === fileName);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            content: resolvedContent || updated[existingIdx].content,
            path: resolvedPath || updated[existingIdx].path,
          };
          return updated;
        }
        return [...prev, newItem];
      });

      setActiveTabId(fileName);
      setOpen(true);
      document.body.classList.add('jy-artifact-split-open');
    };

    const handleSpillArtifact = (e: CustomEvent<SaveTextSpill | any>) => {
      const detail = e.detail || {};
      const fileName =
        detail.suggestedName || detail.name || detail.id || '产物文件';
      // 优先从 Spill 事件的 detail 获取真实 content, path
      openArtifactFile(fileName, detail.content, detail.path, detail.type);
    };

    const handleToggle = () => {
      setOpen((prev) => {
        const next = !prev;
        if (next) {
          document.body.classList.add('jy-artifact-split-open');
        } else {
          document.body.classList.remove('jy-artifact-split-open');
        }
        return next;
      });
    };

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.jy-artifact-side-panel')) return;

      const text = target.textContent?.trim() || '';
      const title =
        target.getAttribute('title') ||
        target.closest('button, code, a')?.getAttribute('title') ||
        '';
      const rawText = title || text;
      const match = rawText.match(
        /[a-zA-Z0-9_\u4e00-\u9fa5\-]+\.(html|md|png|jpg|jpeg|json|js|ts|css|py|vue|tsx|jsx)/i
      );
      const isProducedContext =
        Boolean(
          target.closest(
            '[data-produced-files-row], [class*="turnTail"], [class*="produced"], [class*="deliverable"], [class*="Write"], [class*="artifact"]'
          )
        ) ||
        text.includes('产物') ||
        Boolean(target.closest('div')?.textContent?.includes('产物')) ||
        (target.previousElementSibling?.textContent?.includes('产物') ?? false);

      // 切换其他页面 / 点击导航栏 / 切换会话时，自动收起产物分屏面板
      const sidebarOrNavClick = target.closest(
        '[class*="sidebar"], [class*="SideBar"], nav, [class*="nav"], .jy-nav-action-row, [data-action="new-session"], button, a'
      );
      if (sidebarOrNavClick && !isProducedContext) {
        const textLabel = (target.textContent || '').trim();
        const isSwitchPage =
          textLabel.includes('新建任务') ||
          textLabel.includes('应用市场') ||
          textLabel.includes('自动化') ||
          textLabel.includes('更多') ||
          textLabel.includes('新会话') ||
          Boolean(
            target.closest(
              '[class*="session"], [class*="Session"], [class*="history"], [class*="workspace-item"], [class*="navItem"]'
            )
          );

        if (isSwitchPage) {
          setOpen(false);
          document.body.classList.remove('jy-artifact-split-open');
          return;
        }
      }

      if (match && isProducedContext) {
        let fileName = match[0];
        fileName = fileName
          .replace(/^Write\s*/i, '')
          .replace(/^Edit\s*/i, '')
          .replace(/^产物\s*/, '')
          .trim();

        if (
          fileName &&
          /\.(html|md|png|jpg|jpeg|json|js|ts|css|py|vue|tsx|jsx)/i.test(
            fileName
          )
        ) {
          e.stopPropagation();
          e.preventDefault();

          // 尝试从节点 dataset 获取已绑定数据，若无则触发 API 异步读盘
          const containerNode = target.closest(
            '[data-artifact-content], [data-artifact-path]'
          ) as HTMLElement | null;
          const datasetContent = containerNode?.dataset?.artifactContent || '';
          let datasetPath = containerNode?.dataset?.artifactPath || '';

          // 官方把完整相对路径存放在 title 属性上。若 datasetPath 为空，尝试从 title 属性解析出包含文件夹的完整物理路径
          if (!datasetPath && title) {
            const cleanTitle = title.trim();
            if (cleanTitle.toLowerCase().endsWith(fileName.toLowerCase())) {
              datasetPath = cleanTitle;
            }
          }

          openArtifactFile(fileName, datasetContent, datasetPath);
        }
      }
    };

    const handleAutoClose = () => {
      setOpen(false);
      document.body.classList.remove('jy-artifact-split-open');
    };

    window.addEventListener(
      'jy_open_artifact_inspector' as any,
      handleSpillArtifact
    );
    window.addEventListener('dsh_spill_artifact' as any, handleSpillArtifact);
    window.addEventListener(
      'jy_toggle_artifact_inspector' as any,
      handleToggle
    );
    window.addEventListener(
      'jy_close_artifact_inspector' as any,
      handleAutoClose
    );
    window.addEventListener('popstate', handleAutoClose);
    document.addEventListener('click', handleGlobalClick, true);

    return () => {
      window.removeEventListener(
        'jy_open_artifact_inspector' as any,
        handleSpillArtifact
      );
      window.removeEventListener(
        'dsh_spill_artifact' as any,
        handleSpillArtifact
      );
      window.removeEventListener(
        'jy_toggle_artifact_inspector' as any,
        handleToggle
      );
      window.removeEventListener(
        'jy_close_artifact_inspector' as any,
        handleAutoClose
      );
      window.removeEventListener('popstate', handleAutoClose);
      document.removeEventListener('click', handleGlobalClick, true);
      document.body.classList.remove('jy-artifact-split-open');
    };
  }, []);

  // 智能扫描 DOM 中的产物节点 (解决历史会话切换及产物库空白的交互 Bug)
  const scanDOMArtifacts = React.useCallback(() => {
    if (typeof document === 'undefined') return;
    const producedContainers = document.querySelectorAll(
      '[data-produced-files-row]'
    );
    const foundItems: ArtifactTabItem[] = [];
    const addedIds = new Set<string>();

    producedContainers.forEach((container) => {
      const buttons = container.querySelectorAll('button');
      buttons.forEach((btn) => {
        const titlePath = btn.getAttribute('title') || '';
        const textName = (btn.textContent || '').trim();

        if (
          textName &&
          /\.(html|md|png|jpg|jpeg|json|js|ts|css|py|vue|tsx|jsx)/i.test(
            textName
          )
        ) {
          const fileId = titlePath || textName;
          if (!addedIds.has(fileId)) {
            addedIds.add(fileId);

            let fileType: ArtifactTabItem['type'] = 'file';
            if (/\.html$/i.test(textName)) fileType = 'html';
            else if (/\.md$/i.test(textName)) fileType = 'markdown';
            else if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(textName))
              fileType = 'image';

            foundItems.push({
              id: fileId,
              name: textName,
              type: fileType,
              content: '', // 初始为空，点击时通过 read 接口懒加载
              path: titlePath || textName,
            });
          }
        }
      });
    });

    if (foundItems.length > 0) {
      setArtifactList((prev) => {
        const merged = [...prev];
        let changed = false;
        foundItems.forEach((item) => {
          if (!merged.some((t) => t.id === item.id)) {
            merged.push(item);
            changed = true;
          }
        });
        return changed ? merged : prev;
      });
    }
  }, []);

  React.useEffect(() => {
    try {
      if (!ctx?.sessions?.list) return;

      const handleSessionsUpdate = () => {
        try {
          const activeId = ctx.sessions.list.getSnapshot()?.current;
          setCurrentSessionId(activeId);
        } catch (err) {
          console.warn(
            '[ArtifactPanel] Failed to update session ID state:',
            err
          );
        }
      };

      // 订阅底座全局会话切换事件，并获取取消订阅的 Disposer 函数
      const unsubscribe = ctx.sessions.list.subscribe(handleSessionsUpdate);

      // 初始化同步对齐
      handleSessionsUpdate();

      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    } catch (e) {
      console.error('[ArtifactPanel] Subscription failed:', e);
    }
  }, [ctx]);

  const lastSessionIdRef = React.useRef<string | undefined>(currentSessionId);

  React.useEffect(() => {
    // 🔔 只有当会话 ID 确实发生了跨会话改变时，才去执行闭合与清空，防止首挂载和点击产物被误杀！
    if (
      currentSessionId &&
      lastSessionIdRef.current &&
      currentSessionId !== lastSessionIdRef.current
    ) {
      setOpen(false);
      setOpenTabs([]);
      setActiveTabId('');
      setArtifactList([]);
      document.body.classList.remove('jy-artifact-split-open');
    }
    // 实时同步最新的会话 ID 记录值
    lastSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  React.useEffect(() => {
    let observer: MutationObserver | null = null;
    let debounceTimer: NodeJS.Timeout | null = null;

    const handleMutations = () => {
      if (debounceTimer) clearTimeout(debounceTimer);

      // 防抖 150ms：在历史消息或新消息稳定渲染完毕的瞬间，执行一次性提取
      debounceTimer = setTimeout(() => {
        scanDOMArtifacts();
      }, 150);
    };

    if (typeof document !== 'undefined') {
      observer = new MutationObserver(handleMutations);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    // 挂载时立刻扫描一次
    scanDOMArtifacts();

    return () => {
      if (observer) observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [scanDOMArtifacts]);

  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

  const handleRefresh = async () => {
    if (!activeTabItem) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(
        `/api/jingyun/artifact/read?file=${encodeURIComponent(activeTabItem.path || activeTabItem.name)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.content) {
          setOpenTabs((prev) =>
            prev.map((t) =>
              t.id === activeTabItem.id
                ? { ...t, content: data.content, path: data.path || t.path }
                : t
            )
          );
          setArtifactList((prev) =>
            prev.map((t) =>
              t.id === activeTabItem.id
                ? { ...t, content: data.content, path: data.path || t.path }
                : t
            )
          );
        }
      }
    } catch (e) {
      console.warn('[ArtifactPanel] Refresh failed:', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const handleRevealFolder = async () => {
    if (!activeTabItem?.path) return;
    try {
      await fetch(
        `/api/jingyun/artifact/reveal?path=${encodeURIComponent(activeTabItem.path)}`
      );
    } catch (e) {
      console.warn('[ArtifactPanel] Reveal in folder failed:', e);
    }
  };

  const handleOpenExternal = async () => {
    if (!activeTabItem?.path) return;
    try {
      // 直接唤起系统默认浏览器打开真实本地物理文件
      await fetch(
        `/api/jingyun/artifact/open-external?path=${encodeURIComponent(activeTabItem.path)}`
      );
    } catch (e) {
      console.warn('[ArtifactPanel] Open in browser failed:', e);
    }
  };

  if (!open) return null;

  const handleClosePanel = () => {
    setOpen(false);
    document.body.classList.remove('jy-artifact-split-open');
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const remaining = openTabs.filter((t) => t.id !== tabId);
    if (remaining.length === 0) {
      handleClosePanel();
    } else {
      setOpenTabs(remaining);
      if (activeTabId === tabId) {
        setActiveTabId(remaining[remaining.length - 1].id);
      }
    }
  };

  const renderMinimalFileIcon = (type: ArtifactTabItem['type']) => {
    switch (type) {
      case 'html':
        return (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, opacity: 0.75 }}
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        );
      case 'markdown':
        return (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, opacity: 0.75 }}
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        );
      case 'image':
        return (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, opacity: 0.75 }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        );
      default:
        return (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, opacity: 0.75 }}
          >
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`jy-artifact-side-panel ${fullscreen ? 'jy-fullscreen' : ''}`}
      style={fullscreen ? {} : { width: `${panelWidth}px` }}
    >
      {/* 左右拖拽调节宽度的分界线手柄 */}
      {!fullscreen && (
        <div
          className="jy-artifact-resize-handle"
          title="按住左右拖拽调整分屏宽度，双击恢复默认"
          onMouseDown={handleResizeStart}
          onDoubleClick={() => {
            const defaultWidth = getDefaultSplitWidth();
            setPanelWidth(defaultWidth);
            document.documentElement.style.setProperty(
              '--jy-artifact-panel-width',
              `${defaultWidth}px`
            );
            localStorage.setItem(
              'jy_artifact_panel_width',
              String(defaultWidth)
            );
          }}
        />
      )}

      {/* 顶栏 TabStrip */}
      <div className="jy-artifact-workspace-topbar">
        {/* 左侧：≡ 汉堡菜单按钮 */}
        <div
          className="jy-topbar-menu-wrapper"
          onMouseEnter={() => !pinned && setPopoverOpen(true)}
          onMouseLeave={() => !pinned && setPopoverOpen(false)}
        >
          <button
            type="button"
            className={`jy-topbar-menu-toggle ${popoverOpen || pinned ? 'jy-active' : ''}`}
            title="查看产物列表"
            onClick={() => setPopoverOpen(!popoverOpen)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Popover 悬浮弹窗 */}
          {(popoverOpen || pinned) && (
            <div
              className={`jy-artifact-popover-dropdown ${pinned ? 'jy-pinned-mode' : ''}`}
              onMouseEnter={() => setPopoverOpen(true)}
              onMouseLeave={() => !pinned && setPopoverOpen(false)}
            >
              <div className="jy-minimal-drawer-header">
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--dsw-alias-label-primary, #09090b)',
                  }}
                >
                  产物资源库
                </span>
              </div>

              <div className="jy-minimal-divider" />

              <div className="jy-minimal-drawer-body">
                <div
                  className="jy-minimal-group-title"
                  onClick={() => setArtifactsExpanded(!artifactsExpanded)}
                >
                  <span>已接收产物 ({artifactList.length})</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: artifactsExpanded
                        ? 'rotate(0deg)'
                        : 'rotate(-90deg)',
                      transition:
                        'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      opacity: 0.65,
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {artifactsExpanded && (
                  <div className="jy-minimal-artifact-list">
                    {artifactList.length === 0 ? (
                      <div
                        style={{
                          padding: '8px 10px',
                          fontSize: '12px',
                          color: '#a1a1aa',
                        }}
                      >
                        暂无生成产物
                      </div>
                    ) : (
                      artifactList.map((item) => (
                        <div
                          key={item.id}
                          className={`jy-minimal-artifact-item ${activeTabId === item.id ? 'jy-active' : ''}`}
                          onClick={() => {
                            if (!openTabs.some((t) => t.id === item.id)) {
                              setOpenTabs((prev) => [...prev, item]);
                            }
                            setActiveTabId(item.id);
                            if (!pinned) setPopoverOpen(false);
                          }}
                        >
                          {renderMinimalFileIcon(item.type)}
                          <span className="jy-minimal-file-name">
                            {item.name}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 中间：文件 Tab 页签 */}
        <div className="jy-topbar-tabs-scroll">
          {openTabs.map((tab) => (
            <div
              key={tab.id}
              className={`jy-topbar-tab ${activeTabId === tab.id ? 'jy-active' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              {renderMinimalFileIcon(tab.type)}
              <span className="jy-tab-name">{tab.name}</span>
              <button
                type="button"
                className="jy-tab-close-btn"
                title="关闭页签"
                onClick={(e) => handleCloseTab(e, tab.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* 右侧：操作按钮组（全屏与关闭） */}
        <div className="jy-topbar-actions">
          <button
            type="button"
            className="jy-topbar-btn"
            title={fullscreen ? '退出全屏' : '全屏显示'}
            onClick={handleToggleFullscreen}
          >
            {fullscreen ? (
              // 退出全屏 / 收缩图标 (向内聚拢箭头)
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            ) : (
              // 全屏 / 展开图标 (向外扩散箭头)
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="jy-topbar-btn"
            title="关闭分屏"
            onClick={handleClosePanel}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>
        </div>
      </div>

      {/* 主体工作区容器 */}
      <div className="jy-artifact-workspace-body">
        {/* 右侧内容主渲染区 */}
        <div
          className="jy-artifact-main-viewer"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {activeTabItem ? (
            <div
              className="jy-html-browser-container"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
              }}
            >
              {/* 统一的顶部地址栏 & 操作按钮组 */}
              <div
                className="jy-browser-address-bar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderBottom:
                    '1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.08))',
                  backgroundColor: 'var(--dsw-alias-bg-layer-3, #ffffff)',
                  flexShrink: 0,
                }}
              >
                {/* 左侧前进/后退 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    opacity: 0.4,
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
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>

                {/* 中间地址胶囊栏 */}
                <div
                  className="jy-browser-url-input"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--dsw-alias-bg-layer-2, #f4f4f5)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    color: 'var(--dsw-alias-label-secondary, #52525b)',
                    overflow: 'hidden',
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ flexShrink: 0, opacity: 0.7 }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <span
                    style={{
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      userSelect: 'all',
                      fontFamily: 'SFMono-Regular, Consolas, monospace',
                    }}
                  >
                    {activeTabItem.path?.startsWith('file://')
                      ? activeTabItem.path
                      : activeTabItem.path
                        ? `file:///${activeTabItem.path.replace(/\\/g, '/')}`
                        : activeTabItem.name}
                  </span>
                </div>

                {/* 右侧操作图标组 */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {/* 1. 代码源码 / 网页渲染切换图标 */}
                  {activeTabItem.type === 'html' && (
                    <button
                      type="button"
                      className={`jy-topbar-btn ${showCodePreview ? 'jy-active' : ''}`}
                      title={
                        showCodePreview ? '切换到网页渲染' : '查看HTML源码'
                      }
                      onClick={() => setShowCodePreview(!showCodePreview)}
                      style={{
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        border: 'none',
                        background: showCodePreview
                          ? 'rgba(0, 0, 0, 0.08)'
                          : 'transparent',
                        cursor: 'pointer',
                        color: showCodePreview
                          ? 'var(--dsw-alias-label-primary, #09090b)'
                          : 'var(--dsw-alias-label-secondary, #71717a)',
                      }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                    </button>
                  )}

                  {/* 2. 刷新图标 */}
                  <button
                    type="button"
                    className="jy-topbar-btn"
                    title="刷新物理文件"
                    onClick={handleRefresh}
                    style={{
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'var(--dsw-alias-label-secondary, #71717a)',
                    }}
                  >
                    <svg
                      className={isRefreshing ? 'jy-spin' : ''}
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                  </button>

                  {/* 3. 打开文件夹图标 */}
                  <button
                    type="button"
                    className="jy-topbar-btn"
                    title="在系统文件夹中定位"
                    onClick={handleRevealFolder}
                    style={{
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'var(--dsw-alias-label-secondary, #71717a)',
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>

                  {/* 4. 在浏览器打开图标 */}
                  <button
                    type="button"
                    className="jy-topbar-btn"
                    title="在默认浏览器/程序中打开"
                    onClick={handleOpenExternal}
                    style={{
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'var(--dsw-alias-label-secondary, #71717a)',
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 内容主渲染区 */}
              <div
                style={{
                  flex: 1,
                  height: 'calc(100% - 42px)',
                  overflow: 'hidden',
                }}
              >
                <RealArtifactRenderer
                  file={activeTabItem}
                  showCode={showCodePreview && activeTabItem.type === 'html'}
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '32px',
                color: '#a1a1aa',
                fontSize: '13px',
                textAlign: 'center',
              }}
            >
              暂无打开的产物
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
