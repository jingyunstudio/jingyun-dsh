// This file is auto-generated. Contains styles extracted from client/index.tsx for modularity.
export const styleSheetContent = `
@keyframes jyMenuFadeIn {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.jy-popover-menu {
  background-color: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-elevated, #ffffff)) !important;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.08)) !important;
  color: var(--dsw-alias-label-primary, #09090b) !important;
  box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.18), 0 6px 16px -2px rgba(0, 0, 0, 0.08) !important;
}

.jy-menu-divider {
  height: 1px;
  background-color: var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.06));
  margin: 2px 0;
}

.jy-menu-subtext {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary, #a1a1aa);
}

.jy-menu-item {
  transition: background-color 0.15s ease, color 0.15s ease;
  color: var(--dsw-alias-label-primary, #09090b);
}

.jy-menu-item:hover {
  background-color: var(--dsw-alias-interactive-bg-hover, rgba(9, 9, 11, 0.05)) !important;
}

.jy-upgrade-btn {
  border: none;
  background-color: #09090b;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.jy-segment-container {
  display: flex;
  background-color: var(--dsw-alias-interactive-bg-hover, rgba(9, 9, 11, 0.06));
  padding: 2px;
  border-radius: 8px;
}

.jy-segment-btn {
  border: none;
  background-color: transparent;
  color: var(--dsw-alias-label-tertiary, #71717a);
  font-size: 11px;
  font-weight: 400;
  padding: 3px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.jy-segment-btn-active {
  background-color: #ffffff !important;
  color: #09090b !important;
  font-weight: 600 !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12) !important;
}

/* 官方暗黑模式完全响应 (.dark / [data-ds-dark-theme] / [data-theme="dark"]) */
.dark .jy-popover-menu,
[data-ds-dark-theme] .jy-popover-menu,
[data-theme="dark"] .jy-popover-menu {
  background-color: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-elevated, #18181b)) !important;
  border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12)) !important;
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
  box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.5), 0 6px 16px -2px rgba(0, 0, 0, 0.3) !important;
}

.dark .jy-menu-item,
[data-ds-dark-theme] .jy-menu-item,
[data-theme="dark"] .jy-menu-item {
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
}

.dark .jy-menu-divider,
[data-ds-dark-theme] .jy-menu-divider,
[data-theme="dark"] .jy-menu-divider {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.dark .jy-menu-subtext,
[data-ds-dark-theme] .jy-menu-subtext,
[data-theme="dark"] .jy-menu-subtext {
  color: #a1a1aa !important;
}

.dark .jy-menu-item:hover,
[data-ds-dark-theme] .jy-menu-item:hover,
[data-theme="dark"] .jy-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
}

.dark .jy-upgrade-btn,
[data-ds-dark-theme] .jy-upgrade-btn,
[data-theme="dark"] .jy-upgrade-btn {
  background-color: #f4f4f5 !important;
  color: #09090b !important;
}

.dark .jy-segment-container,
[data-ds-dark-theme] .jy-segment-container,
[data-theme="dark"] .jy-segment-container {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.dark .jy-segment-btn,
[data-ds-dark-theme] .jy-segment-btn,
[data-theme="dark"] .jy-segment-btn {
  color: #a1a1aa !important;
}

.dark .jy-segment-btn-active,
[data-ds-dark-theme] .jy-segment-btn-active,
[data-theme="dark"] .jy-segment-btn-active {
  background-color: rgba(255, 255, 255, 0.22) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
}

/* ---------------------------------------------------- */
/* 强制屏蔽/隐藏任何开发或代理环境下的 Next.js Dev Error Overlay 弹窗 */
/* ---------------------------------------------------- */
nextjs-portal,
[data-nextjs-dialog-overlay],
[data-nextjs-toast],
#next-app-router-error-container,
div[class*="nextjs-toast-errors-parent"] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  opacity: 0 !important;
}

/* ---------------------------------------------------- */
/* 像素级对齐官方插件列表的 CSS 规则 */
/* ---------------------------------------------------- */
.jy-marketplace-wrapper {
  width: 100%;
  color: var(--dsw-alias-label-primary);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.jy-marketplace-wrapper .heading {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #09090b);
}

.jy-marketplace-wrapper .intro {
  margin: 0;
  font-size: 13px;
  color: var(--dsw-alias-label-tertiary, #a1a1aa);
}

.jy-marketplace-wrapper .jy-tabs {
  display: flex;
  align-items: flex-end;
  gap: 22px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, #e4e4e7);
  margin-top: 4px;
  margin-bottom: 4px;
}

.jy-marketplace-wrapper .jy-tab {
  position: relative;
  border: 0;
  padding: 7px 1px 9px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #a1a1aa);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
  outline: none;
  transition: color 0.2s;
}

.jy-marketplace-wrapper .jy-tab:hover,
.jy-marketplace-wrapper .jy-tab[data-active='true'] {
  color: var(--dsw-alias-label-primary, #09090b);
}

.jy-marketplace-wrapper .jy-tab[data-active='true']::after {
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--dsw-alias-label-primary, #09090b);
  content: '';
}

.jy-marketplace-wrapper .catalog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.jy-marketplace-wrapper .search {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  color: var(--dsw-alias-label-tertiary);
}

.jy-marketplace-wrapper .search input {
  box-sizing: border-box;
  width: 100%;
  height: 36px;
  border: 1px solid var(--dsw-alias-border-l2, #e4e4e7);
  border-radius: 8px;
  padding: 0 34px 0 36px;
  outline: none;
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  transition: border-color 0.2s;
}

.jy-marketplace-wrapper .search input:focus {
  border-color: var(--dsw-alias-state-business-primary, #3b82f6);
}

/* 官方复刻 Dropdown 触发按钮 */
.jy-marketplace-wrapper .jy-select-trigger {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 36px;
  min-width: 92px;
  padding: 0 14px;
  border: none;
  border-radius: 18px;
  background: var(--dsw-alias-bg-module-platform, rgba(0,0,0,0.04));
  font: inherit;
  font-size: 13px;
  line-height: 22px;
  color: var(--dsw-alias-label-primary, #09090b);
  cursor: pointer;
  white-space: nowrap;
  outline: none;
  transition: background 0.2s;
}

.jy-marketplace-wrapper .jy-select-trigger:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.08));
}

.jy-marketplace-wrapper .jy-select-chevron {
  flex: none;
  color: var(--dsw-alias-label-tertiary, #a1a1aa);
}

.jy-marketplace-wrapper .catalogHeading {
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding: 0 2px;
  margin-top: 4px;
}

.jy-marketplace-wrapper .catalogHeading h3 {
  font-size: 13px;
  line-height: 20px;
  font-weight: 600;
  margin: 0;
}

.jy-marketplace-wrapper .catalogHeading span {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}

.jy-marketplace-wrapper .cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 380px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .jy-marketplace-wrapper .cards {
    grid-template-columns: 1fr;
  }
}

.jy-marketplace-wrapper .card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l2, #e4e4e7);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-3, #ffffff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.jy-marketplace-wrapper .card[data-open='true'] {
  border-color: var(--dsw-alias-border-l1, #d4d4d8);
  box-shadow: var(--dsw-shadow-lv1);
}

.jy-marketplace-wrapper .cardContent {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  border: 0;
  padding: 12px 14px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  outline: none;
}

.jy-marketplace-wrapper .cardContent:hover,
.jy-marketplace-wrapper .card[data-open='true'] > .cardContent {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.02));
}

.jy-marketplace-wrapper .cardTitle {
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  line-height: 20px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jy-marketplace-wrapper .cardTrailing {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 7px;
  color: var(--dsw-alias-label-tertiary);
}

.jy-marketplace-wrapper .statusDot {
  display: inline-block;
  width: 7px;
  height: 7px;
  flex: none;
  border-radius: 999px;
  background: var(--dsw-alias-label-tertiary, #a1a1aa);
}

.jy-marketplace-wrapper .statusDot[data-phase='active'] {
  background: var(--dsw-alias-state-success-primary, #10b981);
}

.jy-marketplace-wrapper .configTag {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  border-radius: 5px;
  padding: 1px 6px;
  background: var(--dsw-alias-bg-layer-1, #f4f4f5);
  color: var(--dsw-alias-label-secondary, #71717a);
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
}

.jy-marketplace-wrapper .configTag[data-enabled='true'] {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #10b981) 10%, transparent);
  color: var(--dsw-alias-state-success-primary, #10b981);
}

.jy-marketplace-wrapper .chevron {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
}

.jy-marketplace-wrapper .card[data-open='true'] .chevron {
  transform: rotate(180deg);
}

.jy-marketplace-wrapper .cardDetails {
  border-top: 1px solid var(--dsw-alias-border-l2, #e4e4e7);
  padding: 12px 14px 14px;
  background: var(--dsw-alias-bg-module-platform, #fafafa);
}

.jy-marketplace-wrapper .descriptionText {
  font-size: 12px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary, #71717a);
  margin-bottom: 12px;
}

.jy-marketplace-wrapper .actionContainer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.jy-marketplace-wrapper .actionBtn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
  user-select: none;
}

.jy-marketplace-wrapper .actionBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.jy-marketplace-wrapper .actionBtn.primary {
  background-color: var(--dsw-alias-label-primary, #09090b);
  color: var(--dsw-alias-bg-layer-2, #ffffff);
  border-color: var(--dsw-alias-label-primary, #09090b);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.jy-marketplace-wrapper .actionBtn.primary:hover:not(:disabled) {
  opacity: 0.85;
}

.jy-marketplace-wrapper .actionBtn.secondary {
  background-color: var(--dsw-alias-bg-layer-2, #ffffff);
  color: var(--dsw-alias-label-primary, #09090b);
  border-color: var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.12));
}

.jy-marketplace-wrapper .actionBtn.secondary:hover:not(:disabled) {
  background-color: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.04));
}

.jy-marketplace-wrapper .actionBtn.amber {
  background-color: var(--dsw-alias-label-primary, #09090b);
  color: #ffffff;
}

.jy-marketplace-wrapper .infoText {
  font-size: 12px;
  color: var(--dsw-alias-state-success-primary, #10b981);
  font-weight: 500;
}

.jy-marketplace-wrapper .jy-badge-amber {
  font-size: 9px;
  background-color: rgba(245, 158, 11, 0.1);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.2);
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 500;
}




/* ---------------------------------------------------- */
/* 井云品牌配置卡片专属像素级对齐样式 */
/* ---------------------------------------------------- */
.jy-card {
  list-style: none;
  border: 1px solid var(--dsw-alias-border-l2, #e4e4e7);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-3, #ffffff);
  transition: border-color .16s, background .16s;
  margin-bottom: 12px;
  width: 100%;
}
.jy-card:hover {
  border-color: var(--dsw-alias-label-dimmed, #71717a);
}
.jy-card-open {
  background: var(--dsw-alias-bg-layer-2, #f4f4f5) !important;
  border-color: var(--dsw-alias-label-dimmed, #71717a) !important;
}
.jy-card-header {
  box-sizing: border-box;
  width: 100%;
  appearance: none;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  outline: none;
}
.jy-card-headText {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.jy-card-name {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary, #09090b);
}
.jy-card-description {
  font-size: 13px;
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary, #a1a1aa);
}
.jy-card-pending {
  flex: none;
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  line-height: 17px;
  font-weight: 500;
  white-space: nowrap;
  background: var(--dsw-alias-bg-module-platform, rgba(0,0,0,0.04));
  color: var(--dsw-alias-label-secondary, #71717a);
}
.jy-card-chevron {
  flex: none;
  color: var(--dsw-alias-label-tertiary, #a1a1aa);
  transition: transform .16s;
}
.jy-card-chevron-open {
  transform: rotate(180deg);
}
.jy-card-body {
  border-top: 1px solid var(--dsw-alias-border-l2, #e4e4e7);
  margin: 0 16px;
  padding-bottom: 8px;
}
.jy-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
}
.jy-field-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.jy-field-label {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--dsw-alias-label-primary, #09090b);
}
.jy-field-input {
  box-sizing: border-box;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l2, #e4e4e7);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-3, #ffffff);
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dsw-alias-label-primary, #09090b);
  outline: none;
  transition: border-color .16s;
}
.jy-field-input:focus {
  border-color: var(--dsw-alias-brand-primary, #3b82f6);
}
.jy-field-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary, #a1a1aa);
}
.jy-card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 0 4px;
  border-top: 1px solid var(--dsw-alias-border-l2, #e4e4e7);
}
.jy-card-discard,
.jy-card-save {
  appearance: none;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 5px 14px;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  cursor: pointer;
  outline: none;
}
.jy-card-discard {
  border-color: var(--dsw-alias-border-l2, #e4e4e7);
  background: none;
  color: var(--dsw-alias-label-secondary, #71717a);
  transition: border-color .16s, color .16s;
}
.jy-card-discard:hover:not(:disabled) {
  color: var(--dsw-alias-label-primary, #09090b);
  border-color: var(--dsw-alias-label-dimmed, #71717a);
}
.jy-card-save {
  background: var(--dsw-alias-label-primary, #09090b);
  color: var(--dsw-alias-bg-layer-3, #ffffff);
  transition: opacity .16s;
}
.jy-card-save:hover:not(:disabled) {
  opacity: 0.9;
}
.jy-card-discard:disabled,
.jy-card-save:disabled {
  opacity: 0.4;
  cursor: default;
}
/* 容器布局基本 Flex 及 Margin */
.jy-sidebar-custom-links {
  display: flex;
  flex-direction: column;
  gap: 2px; /* 间距改小 */
  width: 100%;
  box-sizing: border-box;
  padding: 0;
  margin-top: 1px;
  margin-bottom: 4px;
}
[class*="root"][class*="collapsed"] .jy-sidebar-custom-links,
[class*="root_"][class*="collapsed"] .jy-sidebar-custom-links,
.root.collapsed .jy-sidebar-custom-links {
  align-items: center !important;
  gap: 0 !important;
  margin-top: 0 !important;
  margin-bottom: 8px !important;
}

/* 图标 size 适配 */
.jy-sidebar-link-btn .link-icon {
  width: 14px !important;
  height: 14px !important;
  flex-shrink: 0;
}
[class*="root"][class*="collapsed"] .jy-sidebar-link-btn .link-icon,
[class*="root_"][class*="collapsed"] .jy-sidebar-link-btn .link-icon,
.root.collapsed .jy-sidebar-link-btn .link-icon {
  width: 18px !important;
  height: 18px !important;
}

/* 悬停态图标 opacity 修正，防被宿主 override 变淡 */
.jy-sidebar-link-btn:hover .link-icon {
  opacity: 1 !important;
}

/* ---------------------------------------------------- */
/* 统一的灰色轻按钮样式 (对齐设置按钮与新会话按钮样式) */
/* ---------------------------------------------------- */
.jy-sidebar-btn,
button[class*="newSession"] {
  box-sizing: border-box !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 12px !important;
  width: 100% !important;
  margin: 1px 0 !important; /* 缩小间距，每个按钮外边距设为 1px */
  height: 32px !important; /* 对齐设置的高度，更紧凑 */
  padding: 0 12px !important;
  border: none !important;
  border-radius: 8px !important;
  background-color: transparent !important; /* 默认未选中时无背景 */
  color: var(--dsw-alias-label-primary, #18181b) !important; /* 未激活时也使用主色文字 */
  font-size: 13px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  text-align: left !important;
  transition: background-color 0.16s !important;
  outline: none !important;
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
  box-shadow: none !important;
}

.jy-sidebar-btn:hover,
button[class*="newSession"]:hover {
  background-color: var(--dsw-alias-interactive-bg-hover, rgba(9, 9, 11, 0.05)) !important;
}

.jy-sidebar-btn.jy-active,
button[class*="newSession"].jy-active {
  background-color: var(--dsw-alias-interactive-bg-hover, rgba(9, 9, 11, 0.05)) !important;
}

.jy-sidebar-btn svg,
button[class*="newSession"] svg {
  width: 16px !important;
  height: 16px !important;
  color: var(--dsw-alias-label-primary, #18181b) !important; /* 未激活时保持与原生一致的图标深色 */
  opacity: 1 !important; /* 保持原色不褪色 */
  flex-shrink: 0 !important;
}

/* ---------------------------------------------------- */
/* 折叠态 (Collapsed) 侧边栏样式覆盖 */
/* ---------------------------------------------------- */
[class*="root"][class*="collapsed"] .jy-sidebar-btn,
[class*="root_"][class*="collapsed"] .jy-sidebar-btn,
.root.collapsed .jy-sidebar-btn,
[class*="root"][class*="collapsed"] button[class*="newSession"],
[class*="root_"][class*="collapsed"] button[class*="newSession"],
.root.collapsed button[class*="newSession"] {
  width: 36px !important;
  height: 36px !important;
  padding: 0 !important;
  justify-content: center !important;
  background-color: transparent !important;
  margin: 3px 0 !important;
}

[class*="root"][class*="collapsed"] .jy-sidebar-btn:hover,
[class*="root_"][class*="collapsed"] .jy-sidebar-btn:hover,
.root.collapsed .jy-sidebar-btn:hover,
[class*="root"][class*="collapsed"] button[class*="newSession"]:hover,
[class*="root_"][class*="collapsed"] button[class*="newSession"]:hover,
.root.collapsed button[class*="newSession"]:hover {
  background-color: var(--dsw-alias-interactive-bg-hover, rgba(9, 9, 11, 0.05)) !important;
}

/* 高端 SaaS 树状导轨与极简悬浮菜单样式 */
.jy-more-dropdown {
  background-color: var(--dsw-alias-bg-popover, var(--dsw-alias-bg-layer-3, #ffffff)) !important;
  border: 1px solid var(--dsw-alias-border, var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.08))) !important;
  color: var(--dsw-alias-label-primary, #09090b) !important;
  box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.04) !important;
  backdrop-filter: blur(12px);
}

.dark .jy-more-dropdown,
[data-theme='dark'] .jy-more-dropdown,
.dark-theme .jy-more-dropdown {
  background-color: var(--dsw-alias-bg-popover, #1c1c1e) !important;
  border-color: var(--dsw-alias-border, rgba(255, 255, 255, 0.08)) !important;
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
  box-shadow: 0 16px 32px -4px rgba(0, 0, 0, 0.5), 0 6px 12px -2px rgba(0, 0, 0, 0.3) !important;
}

/* 分组标题：极简小字号区分 */
.jy-dropdown-header {
  padding: 6px 10px 2px 10px;
  font-size: 10px;
  font-weight: 500;
  color: var(--dsw-alias-label-tertiary, #919196);
  letter-spacing: 0.04em;
  margin-top: 4px;
}

.jy-dropdown-header:first-child {
  margin-top: 0;
}

.dark .jy-dropdown-header,
[data-theme='dark'] .jy-dropdown-header,
.dark-theme .jy-dropdown-header {
  color: var(--dsw-alias-label-tertiary, #71717a);
}

/* 菜单项基础 */
.jy-dropdown-item {
  width: 100%;
  padding: 6px 10px;
  text-align: left;
  font-size: 12.5px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--dsw-alias-label-secondary, #3f3f46) !important;
  background: transparent !important;
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.dark .jy-dropdown-item,
[data-theme='dark'] .jy-dropdown-item,
.dark-theme .jy-dropdown-item {
  color: var(--dsw-alias-label-secondary, #a1a1aa) !important;
}

.jy-dropdown-item:hover {
  background-color: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.04)) !important;
  color: var(--dsw-alias-label-primary, #09090b) !important;
}

.dark .jy-dropdown-item:hover,
[data-theme='dark'] .jy-dropdown-item:hover,
.dark-theme .jy-dropdown-item:hover {
  background-color: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08)) !important;
  color: #ffffff !important;
}

.jy-dropdown-item.jy-selected {
  font-weight: 600;
  background-color: var(--dsw-alias-interactive-bg-hover, rgba(59, 130, 246, 0.08)) !important;
  color: var(--dsw-alias-brand-primary, #2563eb) !important;
}

.dark .jy-dropdown-item.jy-selected,
[data-theme='dark'] .jy-dropdown-item.jy-selected,
.dark-theme .jy-dropdown-item.jy-selected {
  background-color: var(--dsw-alias-interactive-bg-hover, rgba(59, 130, 246, 0.16)) !important;
  color: #60a5fa !important;
}

/* 树状连线子菜单 */
.jy-dropdown-sub-container {
  margin-left: 14px;
  padding-left: 8px;
  border-left: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.08));
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
  margin-bottom: 2px;
}

.dark .jy-dropdown-sub-container,
[data-theme='dark'] .jy-dropdown-sub-container,
.dark-theme .jy-dropdown-sub-container {
  border-left-color: rgba(255, 255, 255, 0.08);
}

/* 线上资源工作区全屏遮盖视图容器 (仅将遮罩层级调低为 1，避免挡住侧边栏与浮层) */
.jy-workspace-overlay {
  position: absolute !important;
  inset: 0 !important;
  z-index: 1 !important;
  background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
  overflow: hidden !important;
}

.jy-workspace-overlay iframe {
  width: 100% !important;
  height: 100% !important;
  border: none !important;
  display: block !important;
}

/* ---------------------------------------------------- */
/* 线上资源独立新页面路由隔离：仅隐藏右侧 CenterColumn 内的原生对话、输入框与底部状态栏，绝对保留左侧侧边栏历史任务记录 */
/* ---------------------------------------------------- */
body.jy-route-more [class*="centerCol"] {
  position: relative !important;
}

body.jy-route-more [class*="centerCol"] > *:not(.jy-workspace-overlay) {
  display: none !important;
}

body.jy-route-more .jy-artifact-side-panel,
body.jy-route-more [class*="centerCol"] {
  margin-right: 0 !important;
}

/* ---------------------------------------------------- */
/* 1:1 对齐产物工作区/预览器全套像素级样式 (支持拖拽调整宽度) */
/* ---------------------------------------------------- */
body.jy-artifact-split-open [class*="centerCol"] {
  min-width: 480px !important;
  margin-right: var(--jy-artifact-panel-width, 580px) !important;
  transition: margin-right 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

body.jy-resizing-artifact [class*="centerCol"],
body.jy-resizing-artifact .jy-artifact-side-panel {
  transition: none !important;
}

.jy-artifact-side-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--jy-artifact-panel-width, 580px);
  background-color: var(--dsw-alias-bg-layer-2, #ffffff);
  border-left: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.08));
  z-index: 90;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--dsw-alias-label-primary, #09090b);
  box-shadow: -6px 0 24px rgba(0, 0, 0, 0.04);
  animation: jySlideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  transition: width 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

/* 左右分屏无缝拖拽调节手柄 (精致 2px 细线指示器) */
.jy-artifact-resize-handle {
  position: absolute;
  left: -4px;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  z-index: 100;
  user-select: none;
  background: transparent;
}

.jy-artifact-resize-handle::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: transparent;
  transition: background-color 0.15s ease;
}

.jy-artifact-resize-handle:hover::after,
body.jy-resizing-artifact .jy-artifact-resize-handle::after {
  background-color: #2563eb;
}

body.jy-resizing-artifact {
  cursor: col-resize !important;
  user-select: none !important;
}

body.jy-resizing-artifact iframe {
  pointer-events: none !important;
}

.jy-artifact-side-panel.jy-fullscreen {
  width: 100vw !important;
  height: 100vh !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 999999 !important;
}

@keyframes jySlideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

/* 顶部 WorkSpace Tab 栏 */
.jy-artifact-workspace-topbar {
  height: 75px;
  min-height: 75px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 12px 6px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.08));
  background-color: var(--dsw-alias-bg-layer-1, #f4f4f5);
  flex-shrink: 0;
  box-sizing: border-box;
  user-select: none;
}

.jy-topbar-menu-toggle {
  border: none;
  background: transparent;
  width: 34px;
  height: 34px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-secondary, #52525b);
  cursor: pointer;
  margin-right: 4px;
  margin-bottom: 2px;
  transition: background-color 0.15s;
}

.jy-topbar-menu-toggle:hover,
.jy-topbar-menu-toggle.jy-active {
  background-color: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.06));
  color: var(--dsw-alias-label-primary, #09090b);
}

.jy-topbar-tabs-scroll {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  min-width: 0;
  padding: 0 4px;
  margin-bottom: 2px;
}

.jy-topbar-tabs-scroll::-webkit-scrollbar {
  display: none;
}

.jy-topbar-tab {
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: transparent;
  color: var(--dsw-alias-label-tertiary, #71717a);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}

.jy-topbar-tab:hover {
  background-color: rgba(0, 0, 0, 0.04);
  color: var(--dsw-alias-label-primary, #09090b);
}

.jy-topbar-tab.jy-active {
  background-color: var(--dsw-alias-bg-layer-3, #ffffff);
  color: var(--dsw-alias-label-primary, #09090b);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.jy-tab-type-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.jy-tab-icon-html {
  color: #2563eb;
}

.jy-tab-icon-md {
  background-color: #0284c7;
  color: #ffffff;
  font-size: 9px;
  font-weight: 700;
  border-radius: 3px;
  width: 14px;
  height: 14px;
}

.jy-tab-icon-img {
  color: #0284c7;
}

.jy-tab-icon-file {
  color: #64748b;
}


.jy-tab-name {
  white-space: nowrap;
}

.jy-tab-close-btn {
  border: none;
  background: transparent;
  font-size: 10px;
  color: var(--dsw-alias-label-tertiary, #a1a1aa);
  border-radius: 4px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.7;
}

.jy-topbar-tab:hover .jy-tab-close-btn {
  opacity: 1;
}

.jy-tab-close-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
  color: #09090b;
}

.jy-topbar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  margin-left: 8px;
  margin-bottom: 2px;
}

.jy-topbar-btn {
  border: none;
  background: transparent;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-tertiary, #71717a);
  cursor: pointer;
  transition: all 0.15s;
}

.jy-topbar-btn:hover {
  background-color: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.05));
  color: var(--dsw-alias-label-primary, #09090b);
}

/* 工作区主体容器 */
.jy-artifact-workspace-body {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
  overflow: hidden;
  background-color: var(--dsw-alias-bg-layer-2, #ffffff);
}

/* 1:1 对齐 Popover 悬浮弹窗 (绝对定位，默认完全不占用水平视口宽度) */
.jy-topbar-menu-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.jy-artifact-popover-dropdown {
  position: absolute;
  top: 42px;
  left: 0;
  width: 240px;
  background-color: var(--dsw-alias-bg-layer-3, #ffffff);
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.08));
  border-radius: 12px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 8px 6px;
  z-index: 9999;
  animation: jyPopoverFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes jyPopoverFadeIn {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.jy-artifact-popover-dropdown.jy-pinned-mode {
  position: relative;
  top: 0;
  left: 0;
  box-shadow: none;
  border-radius: 0;
  border-top: none;
  border-bottom: none;
  border-left: none;
  height: 100%;
}

.jy-minimal-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 6px;
}

.jy-minimal-selector-btn {
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #09090b);
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 6px;
}

.jy-minimal-selector-btn:hover {
  background-color: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.04));
}

.jy-chevron-down {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary, #a1a1aa);
}

.jy-minimal-pin-btn {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #71717a);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.jy-minimal-pin-btn:hover,
.jy-minimal-pin-btn.jy-pinned {
  color: var(--dsw-alias-label-primary, #09090b);
  background-color: rgba(0, 0, 0, 0.05);
}

.jy-minimal-divider {
  height: 1px;
  background-color: var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.06));
  margin: 4px 6px 8px;
}

.jy-minimal-drawer-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.jy-minimal-group-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--dsw-alias-label-tertiary, #71717a);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  cursor: pointer;
  user-select: none;
}

.jy-minimal-group-title:hover {
  color: var(--dsw-alias-label-primary, #09090b);
}

.jy-minimal-artifact-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 0;
}

/* 产物列表项 (1:1 匹配左侧会话列表风格：克制、中性、无刺眼背景色) */
.jy-minimal-artifact-item {
  height: 32px;
  padding: 0 10px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--dsw-alias-label-secondary, #3f3f46);
  font-size: 13px;
  font-weight: 400;
  transition: background-color 0.15s, color 0.15s;
}

.jy-minimal-artifact-item:hover {
  background-color: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.04));
  color: var(--dsw-alias-label-primary, #09090b);
}

.jy-minimal-artifact-item.jy-active {
  background-color: var(--dsw-alias-interactive-bg-active, rgba(0, 0, 0, 0.06));
  color: var(--dsw-alias-label-primary, #09090b);
  font-weight: 500;
}

.jy-minimal-file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jy-icon-blue-file {
  background-color: #64748b;
  color: #ffffff;
}

.jy-minimal-file-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


.jy-artifact-file-card {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 8px 10px !important;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.08)) !important;
  border-radius: 8px !important;
  background-color: var(--dsw-alias-bg-layer-3, #ffffff) !important;
  cursor: pointer !important;
  box-sizing: border-box !important;
  width: 100% !important;
  min-width: 0 !important;
  transition: all 0.15s ease !important;
}

.jy-artifact-file-card:hover {
  border-color: var(--dsw-alias-border-focus, #3b82f6) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
}

.jy-file-card-left {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 8px !important;
  min-width: 0 !important;
  flex: 1 !important;
}

.jy-file-card-meta {
  display: flex !important;
  flex-direction: column !important;
  min-width: 0 !important;
  flex: 1 !important;
  justify-content: center !important;
}

.jy-file-card-name {
  font-size: 12.5px !important;
  font-weight: 500 !important;
  color: var(--dsw-alias-label-primary, #09090b) !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  display: block !important;
}

.jy-file-card-size {
  font-size: 11px !important;
  color: var(--dsw-alias-label-tertiary, #71717a) !important;
  display: block !important;
}

.jy-file-card-action {
  color: var(--dsw-alias-label-tertiary, #a1a1aa) !important;
  font-size: 12px !important;
  flex-shrink: 0 !important;
  margin-left: 4px !important;
}

/* 右侧主渲染区 */
.jy-artifact-main-viewer {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background-color: var(--dsw-alias-bg-layer-3, #ffffff);
}


/* A. Markdown 阅读器模式 (1:1 参考图1 复刻) */
.jy-markdown-viewer-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 24px 32px;
  background-color: var(--dsw-alias-bg-layer-3, #ffffff);
}

.jy-simple-html-canvas {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%);
  border-radius: 12px;
}

.jy-simple-card {
  max-width: 500px;
  width: 100%;
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  padding: 36px 28px;
  text-align: center;
  color: #ffffff;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}

.jy-simple-avatar {
  font-size: 54px;
  margin-bottom: 16px;
}

.jy-simple-title {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(90deg, #f43f5e, #ec4899, #8b5cf6, #3b82f6, #10b981);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 12px;
}

.jy-simple-desc {
  font-size: 14px;
  color: #cbd5e1;
  line-height: 1.6;
  margin-bottom: 24px;
}

.jy-simple-btn-group {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.jy-btn-rainbow {
  background: linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6);
  border: none;
  color: #ffffff;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
}

.jy-btn-glass {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
}

.jy-viewer-sub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.06));
}


.jy-viewer-file-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  color: var(--dsw-alias-label-primary, #09090b);
}

.jy-viewer-sub-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.jy-viewer-sub-actions button {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #71717a);
  cursor: pointer;
  padding: 4px;
}

.jy-markdown-article-body {
  max-width: 760px;
  margin: 0 auto;
  width: 100%;
}

.jy-article-h1 {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.4;
  margin-top: 8px;
  margin-bottom: 16px;
  color: var(--dsw-alias-label-primary, #09090b);
}

.jy-article-lead {
  font-size: 15px;
  color: var(--dsw-alias-label-secondary, #52525b);
  margin-bottom: 24px;
}

.jy-article-p {
  font-size: 14.5px;
  line-height: 1.8;
  color: var(--dsw-alias-label-primary, #18181b);
  margin-bottom: 16px;
}

.jy-article-h2 {
  font-size: 18px;
  font-weight: 600;
  margin-top: 32px;
  margin-bottom: 16px;
  color: var(--dsw-alias-label-primary, #09090b);
}

.jy-article-blockquote {
  background-color: var(--dsw-alias-bg-module-platform, rgba(0, 0, 0, 0.03));
  border-left: 3px solid var(--dsw-alias-border-focus, #3b82f6);
  border-radius: 6px;
  padding: 14px 18px;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--dsw-alias-label-secondary, #52525b);
  margin: 20px 0;
}

.jy-article-banner {
  background-color: rgba(59, 130, 246, 0.06);
  border: 1px solid rgba(59, 130, 246, 0.15);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
}

.jy-banner-tag {
  background-color: #2563eb;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.jy-banner-text {
  font-size: 13px;
  color: var(--dsw-alias-label-primary, #09090b);
}

/* B. HTML 浏览器沙盒视图 (DeepSeek 极简原生底座风格) */
.jy-html-browser-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--dsw-alias-bg-layer-2, #fafafa);
}

.jy-browser-address-bar {
  height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  background-color: var(--dsw-alias-bg-layer-3, #ffffff);
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.08));
}

.jy-ds-clean-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  max-width: 480px;
  margin: 0 auto;
}

.jy-ds-preview-badge {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--dsw-alias-border-focus, #3b82f6);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
  margin-bottom: 14px;
}

.jy-ds-preview-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #09090b);
  margin-bottom: 8px;
}

.jy-ds-preview-desc {
  font-size: 13px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary, #52525b);
}


.jy-browser-nav-btn {
  border: none;
  background: transparent;
  color: #71717a;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
}

.jy-browser-url-input {
  flex: 1;
  height: 26px;
  background-color: #f4f4f5;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  font-size: 12px;
  color: #3f3f46;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jy-html-preview-frame {
  flex: 1;
  overflow-y: auto;
  padding: 40px 20px;
  display: flex;
  justify-content: center;
}

.jy-html-demo-page {
  max-width: 600px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 24px;
}

.jy-avatar-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  box-shadow: 0 10px 30px rgba(249, 115, 22, 0.3);
}

.jy-user-greeting {
  font-size: 32px;
  font-weight: 800;
  color: #18181b;
  margin: 0;
}

.jy-highlight-name {
  color: #ea580c;
}

.jy-user-tagline {
  font-size: 14px;
  color: #71717a;
  letter-spacing: 0.1em;
  margin-top: -16px;
}

.jy-preview-card {
  width: 100%;
  background-color: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  text-align: left;
}

.jy-card-subtitle {
  font-size: 11px;
  font-weight: 700;
  color: #c2410c;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
}

.jy-card-text {
  font-size: 13.5px;
  line-height: 1.7;
  color: #52525b;
  margin: 0;
}

.jy-snapshot-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.jy-snapshot-item {
  background-color: #fff7ed;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.jy-snapshot-num {
  font-size: 24px;
  font-weight: 800;
  color: #18181b;
}

.jy-snapshot-label {
  font-size: 10px;
  color: #9a3412;
  margin-top: 4px;
}

.jy-skills-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.jy-skills-pills span {
  background-color: #fff7ed;
  color: #9a3412;
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 20px;
}

/* C. 图片 视图 */
.jy-image-viewer-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.jy-image-preview-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.jy-image-placeholder-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  border: 2px dashed rgba(59, 130, 246, 0.3);
  border-radius: 16px;
  background-color: rgba(59, 130, 246, 0.03);
  color: var(--dsw-alias-label-secondary, #52525b);
  font-size: 14px;
}

/* 1:1 暗黑模式悬浮 Popover 适配 (对齐暗黑模式参考截图) */
.dark .jy-artifact-popover-dropdown,
[data-ds-dark-theme] .jy-artifact-popover-dropdown,
[data-theme="dark"] .jy-artifact-popover-dropdown {
  background-color: #1f1f21 !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
  color: #f4f4f5 !important;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6) !important;
}

.dark .jy-minimal-artifact-item,
[data-ds-dark-theme] .jy-minimal-artifact-item,
[data-theme="dark"] .jy-minimal-artifact-item {
  color: #d4d4d8 !important;
}

.dark .jy-minimal-artifact-item:hover,
[data-ds-dark-theme] .jy-minimal-artifact-item:hover,
[data-theme="dark"] .jy-minimal-artifact-item:hover {
  background-color: rgba(255, 255, 255, 0.06) !important;
  color: #ffffff !important;
}

.dark .jy-minimal-artifact-item.jy-active,
[data-ds-dark-theme] .jy-minimal-artifact-item.jy-active,
[data-theme="dark"] .jy-minimal-artifact-item.jy-active {
  background-color: rgba(37, 99, 235, 0.22) !important;
  color: #60a5fa !important;
}

.dark .jy-minimal-selector-btn,
[data-ds-dark-theme] .jy-minimal-selector-btn,
[data-theme="dark"] .jy-minimal-selector-btn {
  color: #f4f4f5 !important;
}

/* ==================================================== */
/* 连接器页面 (ConnectorPanel) 暗黑模式规则 */
/* ==================================================== */
.jy-connector-panel {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background-color: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #09090b);
  overflow-y: auto;
  position: relative;
}

.dark .jy-connector-panel,
[data-ds-dark-theme] .jy-connector-panel,
[data-theme="dark"] .jy-connector-panel,
.dark-theme .jy-connector-panel {
  background-color: var(--dsw-alias-bg-layer-1, #18181b) !important;
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
}

.dark .jy-connector-card,
[data-ds-dark-theme] .jy-connector-card,
[data-theme="dark"] .jy-connector-card,
.dark-theme .jy-connector-card {
  background-color: var(--dsw-alias-bg-layer-2, #27272a) !important;
  border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.1)) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4) !important;
}

.dark .jy-connector-card:hover,
[data-ds-dark-theme] .jy-connector-card:hover,
[data-theme="dark"] .jy-connector-card:hover,
.dark-theme .jy-connector-card:hover {
  background-color: var(--dsw-alias-interactive-bg-hover, #2e2e32) !important;
  border-color: var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.2)) !important;
}

.dark .jy-card-icon-box,
[data-ds-dark-theme] .jy-card-icon-box,
[data-theme="dark"] .jy-card-icon-box,
.dark-theme .jy-card-icon-box {
  background-color: var(--dsw-alias-bg-layer-3, rgba(255, 255, 255, 0.06)) !important;
  border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08)) !important;
}

.dark .jy-badge-gray,
[data-ds-dark-theme] .jy-badge-gray,
[data-theme="dark"] .jy-badge-gray,
.dark-theme .jy-badge-gray {
  background-color: rgba(255, 255, 255, 0.08) !important;
  color: #a1a1aa !important;
}

.dark .jy-btn-secondary,
[data-ds-dark-theme] .jy-btn-secondary,
[data-theme="dark"] .jy-btn-secondary,
.dark-theme .jy-btn-secondary {
  background-color: var(--dsw-alias-bg-layer-3, #27272a) !important;
  border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.15)) !important;
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
}

.dark .jy-btn-secondary:hover,
[data-ds-dark-theme] .jy-btn-secondary:hover,
[data-theme="dark"] .jy-btn-secondary:hover,
.dark-theme .jy-btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.dark .jy-btn-primary,
[data-ds-dark-theme] .jy-btn-primary,
[data-theme="dark"] .jy-btn-primary,
.dark-theme .jy-btn-primary {
  background-color: var(--dsw-alias-bg-button-primary, #f4f4f5) !important;
  color: var(--dsw-alias-label-inverse, #09090b) !important;
}

/* 连接器详情与扫码弹窗暗黑模式 */
.dark .jy-detail-modal,
[data-ds-dark-theme] .jy-detail-modal,
[data-theme="dark"] .jy-detail-modal,
.dark-theme .jy-detail-modal {
  background-color: var(--dsw-alias-bg-layer-2, #1f1f22) !important;
  border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12)) !important;
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
  box-shadow: 0 20px 30px rgba(0, 0, 0, 0.6) !important;
}

.dark .jy-detail-desc-box,
[data-ds-dark-theme] .jy-detail-desc-box,
[data-theme="dark"] .jy-detail-desc-box,
.dark-theme .jy-detail-desc-box {
  background-color: var(--dsw-alias-bg-layer-3, #27272a) !important;
  border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08)) !important;
  color: var(--dsw-alias-label-secondary, #a1a1aa) !important;
}

.dark .jy-prompt-suggestion-item,
[data-ds-dark-theme] .jy-prompt-suggestion-item,
[data-theme="dark"] .jy-prompt-suggestion-item,
.dark-theme .jy-prompt-suggestion-item {
  background-color: var(--dsw-alias-bg-layer-3, #27272a) !important;
  border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.06)) !important;
  color: var(--dsw-alias-label-secondary, #d4d4d8) !important;
}

.dark .jy-prompt-suggestion-item:hover,
[data-ds-dark-theme] .jy-prompt-suggestion-item:hover,
[data-theme="dark"] .jy-prompt-suggestion-item:hover,
.dark-theme .jy-prompt-suggestion-item:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
}

/* ==================================================== */
/* 自动化页面 (AutomationPanel) 暗黑模式规则 */
/* ==================================================== */
.jy-automation-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #09090b);
  overflow-y: auto;
}

.dark .jy-automation-panel,
[data-ds-dark-theme] .jy-automation-panel,
[data-theme="dark"] .jy-automation-panel,
.dark-theme .jy-automation-panel {
  background-color: var(--dsw-alias-bg-layer-1, #18181b) !important;
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
}

/* 保持唤醒通知条暗黑 */
.dark .jy-keep-awake-bar,
[data-ds-dark-theme] .jy-keep-awake-bar,
[data-theme="dark"] .jy-keep-awake-bar,
.dark-theme .jy-keep-awake-bar {
  background-color: rgba(59, 130, 246, 0.12) !important;
  border-color: rgba(59, 130, 246, 0.25) !important;
  color: #93c5fd !important;
}

.dark .jy-keep-awake-bar span,
[data-ds-dark-theme] .jy-keep-awake-bar span,
[data-theme="dark"] .jy-keep-awake-bar span,
.dark-theme .jy-keep-awake-bar span {
  color: #bfdbfe !important;
}

/* 自动化任务卡片 */
.dark .jy-auto-task-card,
[data-ds-dark-theme] .jy-auto-task-card,
[data-theme="dark"] .jy-auto-task-card,
.dark-theme .jy-auto-task-card {
  background-color: var(--dsw-alias-bg-layer-2, #27272a) !important;
  border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.1)) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4) !important;
}

.dark .jy-auto-task-card:hover,
[data-ds-dark-theme] .jy-auto-task-card:hover,
[data-theme="dark"] .jy-auto-task-card:hover,
.dark-theme .jy-auto-task-card:hover {
  border-color: var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.2)) !important;
}

/* 自动化操作浮层菜单 Popover */
.dark .jy-auto-menu-popover,
[data-ds-dark-theme] .jy-auto-menu-popover,
[data-theme="dark"] .jy-auto-menu-popover,
.dark-theme .jy-auto-menu-popover {
  background-color: var(--dsw-alias-bg-layer-2, #202023) !important;
  border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12)) !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5) !important;
}

.dark .jy-auto-menu-item,
[data-ds-dark-theme] .jy-auto-menu-item,
[data-theme="dark"] .jy-auto-menu-item,
.dark-theme .jy-auto-menu-item {
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
}

.dark .jy-auto-menu-item:hover,
[data-ds-dark-theme] .jy-auto-menu-item:hover,
[data-theme="dark"] .jy-auto-menu-item:hover,
.dark-theme .jy-auto-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
}

/* 执行历史表格暗黑模式 */
.dark .jy-history-table-wrapper,
[data-ds-dark-theme] .jy-history-table-wrapper,
[data-theme="dark"] .jy-history-table-wrapper,
.dark-theme .jy-history-table-wrapper {
  background-color: var(--dsw-alias-bg-layer-2, #27272a) !important;
  border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.1)) !important;
}

.dark .jy-history-table-wrapper thead tr,
[data-ds-dark-theme] .jy-history-table-wrapper thead tr,
[data-theme="dark"] .jy-history-table-wrapper thead tr,
.dark-theme .jy-history-table-wrapper thead tr {
  background-color: var(--dsw-alias-bg-layer-3, #202024) !important;
  border-bottom-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.1)) !important;
}

.dark .jy-history-table-wrapper tbody tr,
[data-ds-dark-theme] .jy-history-table-wrapper tbody tr,
[data-theme="dark"] .jy-history-table-wrapper tbody tr,
.dark-theme .jy-history-table-wrapper tbody tr {
  border-bottom-color: rgba(255, 255, 255, 0.06) !important;
}

/* 新建/编辑任务抽屉弹窗 (Drawer) 暗黑模式 */
.dark .jy-drawer-modal,
[data-ds-dark-theme] .jy-drawer-modal,
[data-theme="dark"] .jy-drawer-modal,
.dark-theme .jy-drawer-modal {
  background-color: var(--dsw-alias-bg-layer-2, #1c1c1f) !important;
  border-left-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12)) !important;
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
  box-shadow: -6px 0 30px rgba(0, 0, 0, 0.6) !important;
}

.dark .jy-drawer-header,
.dark .jy-drawer-footer,
[data-ds-dark-theme] .jy-drawer-header,
[data-ds-dark-theme] .jy-drawer-footer,
[data-theme="dark"] .jy-drawer-header,
[data-theme="dark"] .jy-drawer-footer,
.dark-theme .jy-drawer-header,
.dark-theme .jy-drawer-footer {
  border-color: rgba(255, 255, 255, 0.08) !important;
}

.dark .jy-form-label,
[data-ds-dark-theme] .jy-form-label,
[data-theme="dark"] .jy-form-label,
.dark-theme .jy-form-label {
  color: var(--dsw-alias-label-secondary, #d4d4d8) !important;
}

.dark .jy-form-input,
.dark .jy-form-textarea,
.dark .jy-form-select,
[data-ds-dark-theme] .jy-form-input,
[data-ds-dark-theme] .jy-form-textarea,
[data-ds-dark-theme] .jy-form-select,
[data-theme="dark"] .jy-form-input,
[data-theme="dark"] .jy-form-textarea,
[data-theme="dark"] .jy-form-select,
.dark-theme .jy-form-input,
.dark-theme .jy-form-textarea,
.dark-theme .jy-form-select {
  background-color: var(--dsw-alias-bg-layer-3, #27272a) !important;
  border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.15)) !important;
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
}

.dark .jy-form-input:focus,
.dark .jy-form-textarea:focus,
.dark .jy-form-select:focus,
[data-ds-dark-theme] .jy-form-input:focus,
[data-ds-dark-theme] .jy-form-textarea:focus,
[data-ds-dark-theme] .jy-form-select:focus,
[data-theme="dark"] .jy-form-input:focus,
[data-theme="dark"] .jy-form-textarea:focus,
[data-theme="dark"] .jy-form-select:focus {
  border-color: var(--dsw-alias-brand-primary, #3b82f6) !important;
}

.dark .jy-prompt-toolbar,
[data-ds-dark-theme] .jy-prompt-toolbar,
[data-theme="dark"] .jy-prompt-toolbar,
.dark-theme .jy-prompt-toolbar {
  background-color: var(--dsw-alias-bg-layer-3, #222226) !important;
  border-top-color: rgba(255, 255, 255, 0.08) !important;
  color: var(--dsw-alias-label-tertiary, #a1a1aa) !important;
}

.dark .jy-freq-segment,
[data-ds-dark-theme] .jy-freq-segment,
[data-theme="dark"] .jy-freq-segment,
.dark-theme .jy-freq-segment {
  background-color: rgba(255, 255, 255, 0.08) !important;
}

.dark .jy-freq-segment-active,
[data-ds-dark-theme] .jy-freq-segment-active,
[data-theme="dark"] .jy-freq-segment-active,
.dark-theme .jy-freq-segment-active {
  background-color: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
}
`;

