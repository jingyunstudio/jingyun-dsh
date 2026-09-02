import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import React from 'react';

import { AgentSelectorBtn } from './components/AgentSelectorBtn';
// 1. 导入解耦的 UI 组件
import {
  CustomBrandMark,
  CustomBrandName,
  HeroSlotAutoHider,
  brandingManager,
} from './components/BrandBranding';
import { CustomLoginSettingBtn } from './components/CustomLoginSettingBtn';
import { JYTopDragBar } from './components/JYTopDragBar';
import { JYWindowControls } from './components/JYWindowControls';
import { NavigationRows } from './components/NavigationRows';
import { OnlineWorkspaceOverlay } from './components/OnlineWorkspaceOverlay';
import { initClientBrandingDOM } from './dom-helper';
import { JYCardActivateModal } from './modals/JYCardActivateModal';
// 3. 导入解耦的商业化 Modal 弹窗
import { JYLoginModal } from './modals/JYLoginModal';
import { JYRechargeModal } from './modals/JYRechargeModal';
import { JYUpgradeModal } from './modals/JYUpgradeModal';
// 2. 导入解耦的业务交互面板
import { ArtifactInspectorPanel } from './pages/ArtifactInspectorPanel';
import {
  MarketplaceAgentsTab,
  MarketplaceSkillsTab,
  MarketplaceCommunityPluginsTab,
} from './pages/MarketplaceSection';

export const inject = ['slots', 'sessions'];

export function apply(ctx: ClientContext) {
  console.log('[UIBranding] Launching client brand interfaces mount...');

  // ==========================================
  // 一、对齐官方 DSH 插槽注册规范：Generator+Yield 嵌套批量原子注入
  // ==========================================
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', () =>
      ctx.slots.inject('conversation.hero.brand.mark', function* () {
        // 1. 注册侧边栏 Logo 资源插槽
        yield ctx.slots.register(
          {
            name: 'sidebar.brand.mark',
            priority: -100,
          },
          (props: any) =>
            React.createElement(CustomBrandMark, { size: props?.size || 24 })
        );

        // 2. 注册侧边栏产品名称
        yield ctx.slots.register(
          {
            name: 'sidebar.brand.name',
            priority: -100,
          },
          () => React.createElement(CustomBrandName)
        );

        // 3. 注册对话区域 Hero 标题隐藏定位插槽
        yield ctx.slots.register(
          {
            name: 'conversation.hero.brand.mark',
            priority: -100,
          },
          () => React.createElement(HeroSlotAutoHider)
        );
      })
    )
  );

  // ==========================================
  // 二、注册侧边栏底部挂载与弹窗控制组件
  // ==========================================
  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register(
      {
        name: 'sidebar.footer.action',
        id: 'jy-sidebar-nav-actions',
        order: -100,
      },
      (props: any) =>
        React.createElement(
          React.Fragment,
          null,
          React.createElement(NavigationRows, { wide: props?.wide }),
          React.createElement(OnlineWorkspaceOverlay),
          React.createElement(ArtifactInspectorPanel, { ctx }),
          React.createElement(JYLoginModal),
          React.createElement(JYUpgradeModal),
          React.createElement(JYRechargeModal),
          React.createElement(JYCardActivateModal),
          React.createElement(JYWindowControls),
          React.createElement(JYTopDragBar)
        )
    )
  );

  // ==========================================
  // 三、替换侧边栏自带设置按钮
  // ==========================================
  ctx.slots.inject('settings.trigger', () =>
    ctx.slots.register(
      {
        id: 'jingyun.settings.trigger',
        name: 'settings.trigger',
        priority: -100,
      },
      (props: any) => React.createElement(CustomLoginSettingBtn, props)
    )
  );

  // ==========================================
  // 四、应用市场 & 技能列表 Tab 栏商城注入
  // ==========================================
  ctx.slots.inject('settings.plugins.tab', () =>
    ctx.slots.register(
      {
        name: 'settings.plugins.tab',
        id: 'agents',
        order: 30,
        label: '智能体列表',
      },
      () => React.createElement(MarketplaceAgentsTab)
    )
  );

  ctx.slots.inject('settings.plugins.tab', () =>
    ctx.slots.register(
      {
        name: 'settings.plugins.tab',
        id: 'skills',
        order: 40,
        label: '技能列表',
      },
      () => React.createElement(MarketplaceSkillsTab)
    )
  );

  ctx.slots.inject('settings.plugins.tab', () =>
    ctx.slots.register(
      {
        name: 'settings.plugins.tab',
        id: 'community-plugins',
        order: 50,
        label: '开源社区',
      },
      () => React.createElement(MarketplaceCommunityPluginsTab)
    )
  );

  // ==========================================
  // 五、注册会话输入框左侧智能体下拉选择按钮
  // ==========================================
  ctx.slots.inject('conversation.input.left', () =>
    ctx.slots.register(
      {
        name: 'conversation.input.left',
        id: 'jy-agent-select',
        order: 10,
      },
      (props: any) => React.createElement(AgentSelectorBtn, props)
    )
  );

  // ==========================================
  // 六、应用网页 Title、Favicon、以及全局动态遮罩与自愈自隐
  // ==========================================
  initClientBrandingDOM();
}
export { brandingManager };
