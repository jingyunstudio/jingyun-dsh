import {
  Menu,
  IconChevronDownOutline14,
} from '@deepseek-ai/dsh-client-ui-primitives';
import React, { useState, useEffect } from 'react';

interface MarketplaceItem {
  id: string;
  name: string;
  status: 'installed' | 'not_installed' | 'locked';
  price: number;
  description: string;
}

// 1. MarketplaceAgentsTab: Renders the Real Local Agents List under settings.plugins.tab
export const MarketplaceAgentsTab = () => {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agents, setAgents] = useState<
    Array<{
      id: string;
      name: string;
      description: string;
      skills?: string[];
      tools?: string[];
      source?: string;
      author?: string;
      path?: string;
    }>
  >([]);

  const loadLocalAgents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/jingyun/installed-assets');
      const json = await res.json();
      if (json.success && json.data) {
        setAgents(json.data.agentsDetail || json.data.expertsDetail || []);
      }
    } catch (err) {
      console.error('[UIBranding] Failed to load local agents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLocalAgents();
  }, []);

  const filteredItems = agents.filter(
    (item) =>
      item.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(query.trim().toLowerCase())) ||
      item.id.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="jy-marketplace-wrapper" style={{ width: '100%' }}>
      <div className="catalog">
        {/* Search Bar */}
        <label className="search">
          <svg
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.8"
            style={{
              position: 'absolute',
              left: '12px',
              pointerEvents: 'none',
            }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            value={query}
            placeholder="搜索智能体模板..."
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        {/* Heading & count info */}
        <div className="catalogHeading">
          <h3>智能体列表</h3>
          <span>{isLoading ? '加载中...' : filteredItems.length}</span>
        </div>

        {isLoading ? (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              fontSize: '13px',
              color: 'var(--dsw-alias-label-tertiary)',
            }}
          >
            正在扫描已安装智能体列表...
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              padding: '32px 0',
              textAlign: 'center',
              fontSize: '12px',
              color: 'var(--dsw-alias-label-tertiary)',
            }}
          >
            暂无已安装的智能体模块。
          </div>
        ) : (
          <ul className="cards">
            {filteredItems.map((item) => {
              const open = expanded === item.id;

              return (
                <li
                  className="card"
                  key={item.id}
                  data-open={open ? 'true' : undefined}
                >
                  <button
                    className="cardContent"
                    type="button"
                    onClick={() =>
                      setExpanded((current) =>
                        current === item.id ? null : item.id
                      )
                    }
                  >
                    <strong className="cardTitle">{item.name}</strong>
                    <span className="cardTrailing">
                      <span className="statusDot" data-phase="active" />
                      <span className="configTag" data-enabled="true">
                        已启用
                      </span>
                      <svg
                        className="chevron"
                        width="12"
                        height="12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        style={{
                          transition: 'transform 0.2s',
                          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </span>
                  </button>
                  {open && (
                    <div className="cardDetails">
                      <div className="descriptionText">
                        {item.description || '暂无智能体详细描述'}
                      </div>

                      {Array.isArray(item.skills) && item.skills.length > 0 && (
                        <div
                          style={{
                            marginTop: '10px',
                            fontSize: '11px',
                            color: 'var(--dsw-alias-label-secondary)',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '4px',
                            alignItems: 'center',
                          }}
                        >
                          <span>包含技能:</span>
                          {item.skills.map((s, sIdx) => (
                            <span
                              key={sIdx}
                              style={{
                                padding: '2px 7px',
                                background: 'rgba(0,0,0,0.05)',
                                borderRadius: '4px',
                                fontSize: '11px',
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

// 2. MarketplaceSkillsTab: Renders the Skills List under settings.plugins.tab
export const MarketplaceSkillsTab = () => {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [installingSlug, setInstallingSlug] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'enabled'>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [skills, setSkills] = useState<MarketplaceItem[]>([]);
  const [nextMarker, setNextMarker] = useState<string>('');
  const [hasMore, setHasMore] = useState(false);

  const loadSkills = async (keyword = '', marker = '', isAppend = false) => {
    if (isAppend) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      let url = `/api/jingyun/skills?limit=30`;
      if (keyword.trim())
        url += `&keyword=${encodeURIComponent(keyword.trim())}`;
      if (marker) url += `&marker=${encodeURIComponent(marker)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        if (isAppend) {
          setSkills((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const newItems = data.data.filter(
              (s: any) => !existingIds.has(s.id)
            );
            return [...prev, ...newItems];
          });
        } else {
          setSkills(data.data);
        }
        setHasMore(Boolean(data.hasMore));
        setNextMarker(data.nextMarker || '');
      }
    } catch (err) {
      console.error('[UIBranding] Failed to fetch ClawHub skills:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (filterType !== 'all') return;

    const timer = setTimeout(() => {
      loadSkills(query, '', false);
    }, 350);

    return () => clearTimeout(timer);
  }, [query, filterType]);

  useEffect(() => {
    if (skills.length === 0) {
      loadSkills('', '', false);
    }
  }, []);

  const handleLoadMoreSkills = () => {
    if (isLoadingMore || !hasMore || !nextMarker) return;
    loadSkills(query, nextMarker, true);
  };

  const handleInstallItem = async (id: string) => {
    setInstallingSlug(id);
    try {
      const res = await fetch('/api/jingyun/skills/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: id }),
      });
      const data = await res.json();
      if (data.success) {
        await loadSkills(query, '', false);
        alert(`已成功从 ClawHub 镜像站同步解压并加载了技能: ${id}`);
      } else {
        alert(`安装失败: ${data.error || '未知错误'}`);
      }
    } catch (err: any) {
      alert(`网络异常: ${err.message}`);
    } finally {
      setInstallingSlug(null);
    }
  };

  const menuItems = [
    { id: 'all', label: '全部' },
    { id: 'enabled', label: '已启用' },
  ];

  const activeLabel =
    menuItems.find((m) => m.id === filterType)?.label || '全部';

  const filteredItems = skills.filter((item) => {
    if (filterType === 'enabled') {
      if (item.status !== 'installed') return false;
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.id && item.id.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="jy-marketplace-wrapper" style={{ width: '100%' }}>
      <div className="catalog">
        {/* Search & Filter Container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
          }}
        >
          <label className="search" style={{ flex: 1 }}>
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.8"
              style={{
                position: 'absolute',
                left: '12px',
                pointerEvents: 'none',
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              value={query}
              placeholder="搜索镜像站技能..."
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <Menu
            open={dropdownOpen}
            onClose={() => setDropdownOpen(false)}
            items={menuItems}
            selectedId={filterType}
            onSelect={(id) => {
              setDropdownOpen(false);
              setFilterType(id as string);
              setExpanded(null);
            }}
            align="end"
            portal
            anchor={
              <button
                type="button"
                className="jy-select-trigger"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {activeLabel}
                <IconChevronDownOutline14 className="jy-select-chevron" />
              </button>
            }
          />
        </div>

        {/* Heading */}
        <div className="catalogHeading">
          <h3>
            {filterType === 'all' ? 'ClawHub 技能列表' : '已启用技能列表'}
          </h3>
          <span>{isLoading ? '加载中...' : filteredItems.length}</span>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              fontSize: '13px',
              color: 'var(--dsw-alias-label-tertiary)',
            }}
          >
            正在拉取 ClawHub 镜像站最新数据，请稍候...
          </div>
        )}

        {/* Cards Grid */}
        {!isLoading && (
          <>
            <ul className="cards">
              {filteredItems.length === 0 ? (
                <div
                  style={{
                    gridColumn: 'span 2',
                    padding: '24px 0',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: 'var(--dsw-alias-label-tertiary)',
                  }}
                >
                  {filterType === 'enabled'
                    ? '暂无本地已下载启用的技能模块。'
                    : '未检索到匹配该关键字的技能。'}
                </div>
              ) : (
                filteredItems.map((item) => {
                  const open = expanded === item.id;
                  const isInstalled = item.status === 'installed';
                  const configuration = isInstalled ? '已启用' : '待同步';
                  const isCurrentInstalling = installingSlug === item.id;

                  return (
                    <li
                      className="card"
                      key={item.id}
                      data-open={open ? 'true' : undefined}
                    >
                      <button
                        className="cardContent"
                        type="button"
                        onClick={() =>
                          setExpanded((current) =>
                            current === item.id ? null : item.id
                          )
                        }
                      >
                        <strong className="cardTitle">{item.name}</strong>
                        <span className="cardTrailing">
                          <span
                            className="statusDot"
                            data-phase={isInstalled ? 'active' : 'unobserved'}
                          />
                          <span
                            className="configTag"
                            data-enabled={isInstalled ? 'true' : 'false'}
                          >
                            {configuration}
                          </span>
                          <svg
                            className="chevron"
                            width="12"
                            height="12"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            style={{
                              transition: 'transform 0.2s',
                              transform: open
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                            }}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </span>
                      </button>
                      {open && (
                        <div className="cardDetails">
                          <div className="descriptionText">
                            {item.description}
                          </div>
                          <div className="actionContainer">
                            {item.status === 'not_installed' && (
                              <button
                                type="button"
                                disabled={isCurrentInstalling}
                                onClick={() => handleInstallItem(item.id)}
                                className="actionBtn primary"
                              >
                                {isCurrentInstalling
                                  ? '同步中...'
                                  : '同步到本地环境'}
                              </button>
                            )}
                            {isInstalled && (
                              <span className="infoText">
                                ✓ 该技能已加载到本地环境运行时中。
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })
              )}
            </ul>

            {/* Load More Button */}
            {hasMore && filterType === 'all' && (
              <div
                style={{
                  marginTop: '20px',
                  marginBottom: '8px',
                  textAlign: 'center',
                }}
              >
                <button
                  type="button"
                  disabled={isLoadingMore}
                  onClick={handleLoadMoreSkills}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 24px',
                    fontSize: '13px',
                    fontWeight: 500,
                    borderRadius: '8px',
                    border:
                      '1px solid var(--dsw-alias-border-secondary, rgba(0,0,0,0.08))',
                    background: 'var(--dsw-alias-bg-secondary, #ffffff)',
                    color: 'var(--dsw-alias-label-primary, #333333)',
                    cursor: isLoadingMore ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  <span>{isLoadingMore ? '加载中...' : '加载更多'}</span>
                  {!isLoadingMore && (
                    <svg
                      width="12"
                      height="12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      style={{ color: 'var(--dsw-alias-label-tertiary, #888)' }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// 3. MarketplaceCommunityPluginsTab: Renders GitHub dsh-plugin Community List
export const MarketplaceCommunityPluginsTab = () => {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [installingRepo, setInstallingRepo] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'stars' | 'updated'>('stars');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [installedPlugins, setInstalledPlugins] = useState<Set<string>>(
    new Set()
  );
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [plugins, setPlugins] = useState<
    Array<{
      id: string;
      name: string;
      fullName: string;
      owner: string;
      avatar: string;
      description: string;
      stars: number;
      forks: number;
      url: string;
      updatedAt: string;
      topics: string[];
      status: 'installed' | 'not_installed';
    }>
  >([]);

  const [installedItems, setInstalledItems] = useState<any[]>([]);

  // 加载本地已安装的插件以标记状态并组装已安装列表
  const checkInstalledPlugins = async () => {
    try {
      const res = await fetch('/api/jingyun/plugins');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const names = new Set<string>();
          const mappedInstalled: any[] = [];

          json.data.forEach((p: any) => {
            const rawSlug = (p.slug || '').toLowerCase();
            const rawName = (p.name || '').toLowerCase();
            if (rawSlug) names.add(rawSlug);
            if (rawName) names.add(rawName);

            // 通用提取：去除 @scope 前缀的路径名
            const withoutAt = rawSlug.replace(/^@/, '');
            if (withoutAt) names.add(withoutAt);

            // 通用提取：末尾短名称
            const shortName = rawSlug.split('/').pop();
            if (shortName) names.add(shortName);

            // 组装真实的已安装插件条目（严格排除官方核心底座与系统内置服务，杜绝被误删）
            const isOfficial =
              p.is_builtin === true ||
              p.source === 'builtin' ||
              (typeof p.author === 'string' && p.author.includes('官方')) ||
              rawSlug.startsWith('@deepseek-ai/') ||
              rawSlug.startsWith('@jingyun-ai/') ||
              rawName.startsWith('@deepseek-ai/') ||
              rawName.startsWith('@jingyun-ai/') ||
              (typeof p.id === 'string' &&
                (p.id.startsWith('dsh-core-') || p.id.startsWith('builtin-')));

            if (!isOfficial && (p.source === 'community' || p.is_installed)) {
              mappedInstalled.push({
                id: p.id || p.slug || p.name,
                name: p.name || p.slug,
                fullName: p.slug || p.name,
                npm: p.slug || p.name,
                owner: p.author || '社区插件',
                avatar: '',
                description:
                  p.description_zh || p.description || '本地已安装社区插件',
                stars: 999,
                forks: 0,
                url: `https://www.npmjs.com/package/${p.slug || p.name}`,
                updatedAt: '已启用',
                topics: p.tags || ['已安装插件'],
                status: 'installed' as const,
              });
            }
          });

          setInstalledPlugins(names);
          setInstalledItems(mappedInstalled);
        }
      }
    } catch (e) {}
  };

  const loadCommunityNpmPlugins = async (
    targetPage = 1,
    searchQuery = '',
    isAppend = false
  ) => {
    if (targetPage === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      let url = `/api/jingyun/plugins/community?page=${targetPage}&limit=30`;
      if (searchQuery.trim()) {
        url += `&keyword=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const mapped = data.data.map((item: any) => ({
            id: item.npm || item.name,
            name: item.title || item.name,
            fullName: item.npm || item.name,
            npm: item.npm || item.name,
            owner: item.owner || 'Community',
            avatar: '',
            description: item.description || '暂无描述',
            stars: item.stars || 0,
            forks: 0,
            url: `https://www.npmjs.com/package/${item.npm || item.name}`,
            updatedAt: item.updatedAt || '',
            topics: item.topics || ['npm-package'],
            status: 'not_installed' as const,
          }));

          if (isAppend) {
            setPlugins((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const newItems = mapped.filter(
                (p: any) => !existingIds.has(p.id)
              );
              return [...prev, ...newItems];
            });
          } else {
            setPlugins(mapped);
          }

          setTotalCount(data.total || mapped.length);
          setHasMore(Boolean(data.hasMore));
          setPage(targetPage);
          setIsLoading(false);
          setIsLoadingMore(false);
          return;
        }
      }
    } catch (err) {
      console.warn('[UIBranding] Failed to fetch community NPM plugins:', err);
    }

    if (!isAppend) {
      setPlugins([]);
      setTotalCount(0);
      setHasMore(false);
    }
    setIsLoading(false);
    setIsLoadingMore(false);
  };

  const [uninstallingRepo, setUninstallingRepo] = useState<string | null>(null);

  const handleUninstallPlugin = async (
    targetPkg: string,
    pluginName: string
  ) => {
    if (!confirm(`确定要从底座卸载插件【${pluginName}】吗？`)) return;

    setUninstallingRepo(targetPkg);
    try {
      const res = await fetch('/api/jingyun/plugins/uninstall-community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npm: targetPkg,
          name: pluginName,
          repo: targetPkg,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInstalledPlugins((prev) => {
          const next = new Set(prev);
          next.delete(pluginName.toLowerCase());
          next.delete(targetPkg.toLowerCase());
          const shortName = targetPkg.split('/').pop()?.toLowerCase();
          if (shortName) next.delete(shortName);
          return next;
        });
        setInstalledItems((prev) =>
          prev.filter(
            (p) =>
              p.name?.toLowerCase() !== pluginName.toLowerCase() &&
              p.fullName?.toLowerCase() !== targetPkg.toLowerCase() &&
              p.npm?.toLowerCase() !== targetPkg.toLowerCase()
          )
        );

        await checkInstalledPlugins();
        alert(`✓ 插件【${pluginName}】已成功从底座卸载并即时生效！`);
      } else {
        alert(`卸载失败: ${data.error || '未知错误'}`);
      }
    } catch (err: any) {
      alert(`卸载请求异常: ${err.message}`);
    } finally {
      setUninstallingRepo(null);
    }
  };

  const handleInstallPlugin = async (
    repoFullName: string,
    pluginName: string
  ) => {
    setInstallingRepo(repoFullName);
    try {
      const res = await fetch('/api/jingyun/plugins/install-community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: repoFullName,
          name: pluginName,
          npm: repoFullName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInstalledPlugins((prev) => {
          const next = new Set(prev);
          next.add(pluginName.toLowerCase());
          next.add(repoFullName.toLowerCase());
          const shortName = repoFullName.split('/').pop()?.toLowerCase();
          if (shortName) next.add(shortName);
          return next;
        });
        alert(`✓ 插件【${pluginName}】安装成功！已自动生效。`);
        await checkInstalledPlugins();
      } else {
        alert(
          `安装遇到问题: ${data.error || '未知错误'}\n请检查网络连接或稍后重试。`
        );
      }
    } catch (err: any) {
      alert(`安装请求异常: ${err.message}`);
    } finally {
      setInstallingRepo(null);
    }
  };

  useEffect(() => {
    checkInstalledPlugins();
  }, []);

  // 监听搜索词输入 (防抖 300ms) 与 排序切换
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCommunityNpmPlugins(1, query, false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, sortBy]);

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    loadCommunityNpmPlugins(nextPage, query, true);
  };

  const [filterType, setFilterType] = useState<'all' | 'installed'>('all');

  const filterMenuItems = [
    { id: 'all', label: '全部' },
    { id: 'installed', label: '已安装' },
  ];

  const activeFilterLabel =
    filterMenuItems.find((m) => m.id === filterType)?.label || '全部';

  const sourceList = filterType === 'installed' ? installedItems : plugins;

  const filteredItems = sourceList.filter((item) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.owner && item.owner.toLowerCase().includes(q)) ||
      (item.fullName && item.fullName.toLowerCase().includes(q)) ||
      (item.npm && item.npm.toLowerCase().includes(q)) ||
      (Array.isArray(item.topics) &&
        item.topics.some((t: string) => t.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="jy-marketplace-wrapper" style={{ width: '100%' }}>
      <div className="catalog">
        {/* Search & Status Filter Container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
          }}
        >
          <label className="search" style={{ flex: 1 }}>
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.8"
              style={{
                position: 'absolute',
                left: '12px',
                pointerEvents: 'none',
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              value={query}
              placeholder="搜索开源社区插件 (NPM)..."
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <Menu
            open={dropdownOpen}
            onClose={() => setDropdownOpen(false)}
            items={filterMenuItems}
            selectedId={filterType}
            onSelect={(id) => {
              setDropdownOpen(false);
              setFilterType(id as 'all' | 'installed');
            }}
            align="end"
            portal
            anchor={
              <button
                type="button"
                className="jy-select-trigger"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {activeFilterLabel}
                <IconChevronDownOutline14 className="jy-select-chevron" />
              </button>
            }
          />
        </div>

        {/* Heading */}
        <div className="catalogHeading">
          <h3>开源社区</h3>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              fontSize: '13px',
              color: 'var(--dsw-alias-label-tertiary)',
            }}
          >
            正在检索 GitHub 社区 (topic:dsh-plugin) 最新开源插件，请稍候...
          </div>
        )}

        {/* Cards Grid */}
        {!isLoading && (
          <>
            <ul className="cards">
              {filteredItems.length === 0 ? (
                <div
                  style={{
                    gridColumn: 'span 2',
                    padding: '24px 0',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: 'var(--dsw-alias-label-tertiary)',
                  }}
                >
                  未检索到匹配该关键字的开源社区插件。
                </div>
              ) : (
                filteredItems.map((item) => {
                  const open = expanded === item.id;
                  const isInstalled =
                    item.status === 'installed' ||
                    installedPlugins.has(item.name.toLowerCase()) ||
                    installedPlugins.has(item.fullName.toLowerCase());
                  const isCurrentInstalling = installingRepo === item.fullName;

                  return (
                    <li
                      className="card"
                      key={item.id}
                      data-open={open ? 'true' : undefined}
                    >
                      <button
                        className="cardContent"
                        type="button"
                        onClick={() =>
                          setExpanded((current) =>
                            current === item.id ? null : item.id
                          )
                        }
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            overflow: 'hidden',
                          }}
                        >
                          {item.avatar ? (
                            <img
                              src={item.avatar}
                              alt={item.owner}
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: 'rgba(0,0,0,0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                              }}
                            >
                              🔌
                            </div>
                          )}
                          <strong
                            className="cardTitle"
                            style={{
                              maxWidth: '160px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.name}
                          </strong>
                        </div>

                        <span className="cardTrailing">
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--dsw-alias-label-tertiary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              marginRight: '4px',
                            }}
                          >
                            ⭐ {item.stars}
                          </span>
                          <span
                            className="statusDot"
                            data-phase={isInstalled ? 'active' : 'unobserved'}
                          />
                          <span
                            className="configTag"
                            data-enabled={isInstalled ? 'true' : 'false'}
                          >
                            {isInstalled ? '已安装' : '社区'}
                          </span>
                          <svg
                            className="chevron"
                            width="12"
                            height="12"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            style={{
                              transition: 'transform 0.2s',
                              transform: open
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                            }}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </span>
                      </button>

                      {open && (
                        <div className="cardDetails">
                          <div className="descriptionText">
                            {item.description}
                          </div>

                          {/* Repository Meta Info */}
                          <div
                            style={{
                              marginTop: '8px',
                              fontSize: '11px',
                              color: 'var(--dsw-alias-label-tertiary)',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '10px',
                              alignItems: 'center',
                            }}
                          >
                            <span>
                              作者: <strong>{item.owner}</strong>
                            </span>
                            {item.updatedAt && (
                              <span>更新时间: {item.updatedAt}</span>
                            )}
                            <span>Forks: {item.forks}</span>
                          </div>

                          {/* Topics */}
                          {Array.isArray(item.topics) &&
                            item.topics.length > 0 && (
                              <div
                                style={{
                                  marginTop: '8px',
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '4px',
                                }}
                              >
                                {item.topics.slice(0, 6).map((t, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      padding: '1px 6px',
                                      background: 'rgba(0,0,0,0.04)',
                                      borderRadius: '3px',
                                      fontSize: '10px',
                                      color: 'var(--dsw-alias-label-secondary)',
                                    }}
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}

                          <div
                            className="actionContainer"
                            style={{
                              marginTop: '12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            {item.url ? (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '11px',
                                  color:
                                    'var(--dsw-alias-color-primary, #3b82f6)',
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span>在 NPM / 仓库查看</span>
                                <svg
                                  width="10"
                                  height="10"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </a>
                            ) : (
                              <div />
                            )}

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              {!isInstalled ? (
                                <button
                                  type="button"
                                  disabled={isCurrentInstalling}
                                  onClick={() =>
                                    handleInstallPlugin(
                                      item.fullName || item.name,
                                      item.name
                                    )
                                  }
                                  className="actionBtn primary"
                                >
                                  {isCurrentInstalling
                                    ? '正在安装到底座...'
                                    : '一键安装到底座'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={Boolean(
                                    uninstallingRepo &&
                                    (uninstallingRepo === item.fullName ||
                                      uninstallingRepo === item.npm)
                                  )}
                                  onClick={() =>
                                    handleUninstallPlugin(
                                      item.npm || item.fullName || item.name,
                                      item.name
                                    )
                                  }
                                  className="actionBtn secondary"
                                  style={{
                                    color: '#ef4444',
                                    borderColor: 'rgba(239, 68, 68, 0.3)',
                                    padding: '4px 12px',
                                    fontSize: '12px',
                                  }}
                                >
                                  {uninstallingRepo &&
                                  (uninstallingRepo === item.fullName ||
                                    uninstallingRepo === item.npm)
                                    ? '正在卸载...'
                                    : '卸载'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })
              )}
            </ul>

            {/* Load More Button */}
            {hasMore && filteredItems.length > 0 && !query.trim() && (
              <div
                style={{
                  marginTop: '20px',
                  marginBottom: '8px',
                  textAlign: 'center',
                }}
              >
                <button
                  type="button"
                  disabled={isLoadingMore}
                  onClick={handleLoadMore}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 24px',
                    fontSize: '13px',
                    fontWeight: 500,
                    borderRadius: '8px',
                    border:
                      '1px solid var(--dsw-alias-border-secondary, rgba(0,0,0,0.08))',
                    background: 'var(--dsw-alias-bg-secondary, #ffffff)',
                    color: 'var(--dsw-alias-label-primary, #333333)',
                    cursor: isLoadingMore ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  <span>{isLoadingMore ? '加载中...' : '加载更多'}</span>
                  {!isLoadingMore && (
                    <svg
                      width="12"
                      height="12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      style={{ color: 'var(--dsw-alias-label-tertiary, #888)' }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
