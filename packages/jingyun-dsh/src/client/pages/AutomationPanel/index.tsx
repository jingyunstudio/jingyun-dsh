import React, { useState } from 'react';

import type { TemplateItem } from './constants';
import { AUTOMATION_TEMPLATES } from './constants';

// 自动化配置项定义
interface AutoTask {
  id: string;
  name: string;
  workspace: string;
  prompt: string;
  connectors: string[];
  frequencyType: 'cycle' | 'interval' | 'once';
  frequencyDetail: string; // 例如 "每天 07:45"
  cronExpression?: string;
  startDate?: string;
  endDate?: string;
  pushToWechatApp: boolean;
  pushToWechatBot: boolean;
  enabled: boolean;
}

// 模拟历史记录定义
interface HistoryRecord {
  id: string;
  taskName: string;
  time: string;
  status: 'success' | 'failed';
  duration: string;
  message: string;
}

export function AutomationPanel() {
  const [activeTab, setActiveTab] = useState<
    'configured' | 'history' | 'templates'
  >('configured');
  const [keepAwake, setKeepAwake] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<AutoTask | null>(null);
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);

  // 提示气泡
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // 初始 Mock 数据 (配置了一个“每日 AI 新闻简报”，高度还原图 2)
  const [tasks, setTasks] = useState<AutoTask[]>([
    {
      id: 'task_news',
      name: '每日 AI 新闻简报',
      workspace: 'Work',
      prompt: '关注当天 AI 领域的重要动态，侧重 AI coding 与具身智能进展...',
      connectors: ['lark'],
      frequencyType: 'cycle',
      frequencyDetail: '每月 1 日 00:00',
      pushToWechatApp: true,
      pushToWechatBot: false,
      enabled: true,
    },
  ]);

  // Mock 历史记录数据
  const [historyList] = useState<HistoryRecord[]>([
    {
      id: 'h_1',
      taskName: '每日 AI 新闻简报',
      time: '2026-08-26 00:00:12',
      status: 'success',
      duration: '4.2s',
      message: '已成功向飞书渠道推送消息',
    },
    {
      id: 'h_2',
      taskName: '面试准备提醒',
      time: '2026-08-26 16:00:01',
      status: 'success',
      duration: '1.8s',
      message: '面试模拟题已生成并推送到微信小程序',
    },
    {
      id: 'h_3',
      taskName: '父母联系提醒',
      time: '2026-08-24 10:00:03',
      status: 'success',
      duration: '0.9s',
      message: '提醒消息已触发',
    },
  ]);

  // 表单状态定义
  const [formName, setFormName] = useState('');
  const [formWorkspace, setFormWorkspace] = useState('Work');
  const [formPrompt, setFormPrompt] = useState('');
  const [formConnectors, setFormConnectors] = useState<string[]>(['lark']);
  const [formFreqType, setFormFreqType] = useState<
    'cycle' | 'interval' | 'once'
  >('cycle');
  const [formFreqCycle, setFormFreqCycle] = useState('everyday'); // everyday, everyweek, everymonth
  const [formFreqTime, setFormFreqTime] = useState('07:45');
  const [formPushApp, setFormPushApp] = useState(false);
  const [formPushBot, setFormPushBot] = useState(false);

  // 处理拉起新建弹窗
  const handleOpenCreate = () => {
    setEditingTask(null);
    setFormName('');
    setFormWorkspace('Work');
    setFormPrompt('');
    setFormConnectors(['lark']);
    setFormFreqType('cycle');
    setFormFreqCycle('everyday');
    setFormFreqTime('07:45');
    setFormPushApp(false);
    setFormPushBot(false);
    setShowModal(true);
  };

  // 处理拉起编辑弹窗
  const handleOpenEdit = (task: AutoTask) => {
    setEditingTask(task);
    setFormName(task.name);
    setFormWorkspace(task.workspace);
    setFormPrompt(task.prompt);
    setFormConnectors(task.connectors);
    setFormFreqType(task.frequencyType);
    setFormFreqCycle(
      task.frequencyDetail.includes('月')
        ? 'everymonth'
        : task.frequencyDetail.includes('周')
          ? 'everyweek'
          : 'everyday'
    );

    // 时间解析
    const timeMatch = task.frequencyDetail.match(/\d{2}:\d{2}/);
    setFormFreqTime(timeMatch ? timeMatch[0] : '07:45');

    setFormPushApp(task.pushToWechatApp);
    setFormPushBot(task.pushToWechatBot);
    setShowModal(true);
  };

  // 处理点击模板一键预填新建
  const handleSelectTemplate = (tpl: TemplateItem) => {
    setEditingTask(null);
    setFormName(tpl.title);
    setFormWorkspace('Work');
    setFormPrompt(tpl.prompt);
    setFormConnectors(['lark']);
    setFormFreqType('cycle');
    setFormFreqCycle('everyday');
    setFormFreqTime('07:45');
    setFormPushApp(tpl.prompt.includes('小程序') || tpl.title.includes('提醒'));
    setFormPushBot(false);
    setShowModal(true);
    showToast(`💡 已自动为您载入“${tpl.title}”模板！`);
  };

  // 保存任务
  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return alert('请输入任务名称');

    let freqDetail = '';
    if (formFreqType === 'cycle') {
      if (formFreqCycle === 'everyday') freqDetail = `每天 ${formFreqTime}`;
      else if (formFreqCycle === 'everyweek')
        freqDetail = `每周日 ${formFreqTime}`;
      else freqDetail = `每月 1 日 ${formFreqTime}`;
    } else if (formFreqType === 'interval') {
      freqDetail = '每隔 2 小时';
    } else {
      freqDetail = '单次运行';
    }

    if (editingTask) {
      // 更新
      setTasks(
        tasks.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                name: formName,
                workspace: formWorkspace,
                prompt: formPrompt,
                connectors: formConnectors,
                frequencyType: formFreqType,
                frequencyDetail: freqDetail,
                pushToWechatApp: formPushApp,
                pushToWechatBot: formPushBot,
              }
            : t
        )
      );
      showToast('✅ 任务修改保存成功！');
    } else {
      // 新建
      const newTask: AutoTask = {
        id: `task_${Date.now()}`,
        name: formName,
        workspace: formWorkspace,
        prompt: formPrompt,
        connectors: formConnectors,
        frequencyType: formFreqType,
        frequencyDetail: freqDetail,
        pushToWechatApp: formPushApp,
        pushToWechatBot: formPushBot,
        enabled: true,
      };
      setTasks([...tasks, newTask]);
      showToast('🎉 新建自动化任务成功！');
    }
    setShowModal(false);
    // 强制切回已配置页
    setActiveTab('configured');
  };

  // 删除任务
  const handleDeleteTask = (id: string) => {
    if (!confirm('确定要删除这个自动化任务吗？')) return;
    setTasks(tasks.filter((t) => t.id !== id));
    showToast('🗑️ 任务已被移除');
  };

  // 切换任务状态
  const toggleTaskEnabled = (id: string) => {
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  return (
    <div
      className="jy-automation-panel"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 32px',
        boxSizing: 'border-box',
        background:
          'var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-main, #ffffff))',
        color: 'var(--dsw-alias-label-primary, #0f172a)',
        overflowY: 'auto',
      }}
    >
      {/* 顶部标题栏 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          marginBottom: '16px',
          width: '100%',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--dsw-alias-label-primary, #0f172a)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          自动化
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: '12.5px',
            color: 'var(--dsw-alias-label-secondary, #64748b)',
          }}
        >
          配置和管理自动化任务，按计划自动执行工作流。
        </p>
      </div>

      {/* Tabs 页签选择 与 按钮控制组 在同一行 (对齐应用市场) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '20px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* 左侧页签 */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
          }}
        >
          {[
            { id: 'configured', label: '已配置' },
            { id: 'history', label: '执行历史' },
            { id: 'templates', label: '任务模板' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '8px 4px 12px 4px',
                background: 'transparent',
                border: 'none',
                borderBottom:
                  activeTab === tab.id
                    ? '2px solid var(--dsw-alias-label-primary, #0f172a)'
                    : '2px solid transparent',
                color:
                  activeTab === tab.id
                    ? 'var(--dsw-alias-label-primary, #0f172a)'
                    : 'var(--dsw-alias-label-tertiary, #64748b)',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 右侧动作按钮组 (向上浮动以与页签视觉对齐，且不贴死底线) */}
        <div style={{ display: 'flex', gap: '10px', paddingBottom: '8px' }}>
          <button
            className="jy-btn-secondary"
            onClick={handleOpenCreate}
            style={{
              height: '32px',
              padding: '0 16px',
              borderRadius: '8px',
              border:
                '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
              background:
                'var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-card, #ffffff))',
              color: 'var(--dsw-alias-label-primary, #0f172a)',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
            }}
          >
            手动新建
          </button>

          <button
            className="jy-btn-primary"
            onClick={() => {
              window.location.hash = '#/';
              setTimeout(() => {
                const textarea: any = document.querySelector('textarea');
                if (textarea) {
                  const setter = Object.getOwnPropertyDescriptor(
                    HTMLTextAreaElement.prototype,
                    'value'
                  )?.set;
                  setter?.call(textarea, '帮我创建一个自动化任务：');
                  textarea.dispatchEvent(new Event('input', { bubbles: true }));
                  textarea.focus();
                }
              }, 250);
            }}
            style={{
              height: '32px',
              padding: '0 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--dsw-alias-bg-button-primary, #0f172a)',
              color: 'var(--dsw-alias-label-inverse, #ffffff)',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            在对话中创建
          </button>
        </div>
      </div>

      {/* Tab 内容区 */}
      <div style={{ flex: 1, width: '100%', boxSizing: 'border-box' }}>
        {/* Tab 1: 已配置 */}
        {activeTab === 'configured' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              width: '100%',
            }}
          >
            {tasks.length > 0 ? (
              <>
                {/* 电脑保持唤醒通知条 */}
                <div
                  className="jy-keep-awake-bar"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    fontSize: '12px',
                    color: '#2563eb',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0 }}
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <span>本地任务仅在「电脑保持唤醒」时运行</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--dsw-alias-label-secondary, #475569)',
                      }}
                    >
                      保持电脑唤醒
                    </span>
                    <input
                      type="checkbox"
                      checked={keepAwake}
                      onChange={() => setKeepAwake(!keepAwake)}
                      style={{
                        width: '28px',
                        height: '16px',
                        cursor: 'pointer',
                        accentColor: '#1e40af',
                      }}
                    />
                  </div>
                </div>

                {/* 任务列表容器 */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="jy-auto-task-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        borderRadius: '12px',
                        border:
                          '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
                        background:
                          'var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-card, #ffffff))',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                      }}
                    >
                      {/* 左侧信息 */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <div
                          className="jy-card-icon-box"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'var(--dsw-alias-bg-layer-3, #f8fafc)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border:
                              '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
                          }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--dsw-alias-label-secondary, #64748b)"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                          </svg>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <span
                              onClick={() => handleOpenEdit(task)}
                              style={{
                                fontSize: '13.5px',
                                fontWeight: 600,
                                color:
                                  'var(--dsw-alias-label-primary, #0f172a)',
                                cursor: 'pointer',
                              }}
                            >
                              {task.name}
                            </span>
                            {task.workspace && (
                              <span
                                className="jy-badge-gray"
                                style={{
                                  fontSize: '10px',
                                  color:
                                    'var(--dsw-alias-label-tertiary, #64748b)',
                                  background:
                                    'var(--dsw-alias-bg-layer-3, #f1f5f9)',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 500,
                                }}
                              >
                                {task.workspace}
                              </span>
                            )}
                          </div>

                          <span
                            style={{
                              fontSize: '11.5px',
                              color: 'var(--dsw-alias-label-tertiary, #64748b)',
                            }}
                          >
                            {task.frequencyDetail}
                          </span>
                        </div>
                      </div>

                      {/* 右侧动作按钮 */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          flexShrink: 0,
                          position: 'relative',
                        }}
                      >
                        {/* 更多操作 三点按钮 ... */}
                        <div style={{ position: 'relative' }}>
                          <button
                            title="更多操作"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuTaskId(
                                activeMenuTaskId === task.id ? null : task.id
                              );
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: 'var(--dsw-alias-label-tertiary, #64748b)',
                              padding: '6px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="1.5"></circle>
                              <circle cx="19" cy="12" r="1.5"></circle>
                              <circle cx="5" cy="12" r="1.5"></circle>
                            </svg>
                          </button>

                          {/* 三点更多操作的 Popover 气泡浮层 */}
                          {activeMenuTaskId === task.id && (
                            <>
                              {/* 遮罩背景，用于点击空白处自动关闭 */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuTaskId(null);
                                }}
                                style={{
                                  position: 'fixed',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  zIndex: 998,
                                  background: 'transparent',
                                }}
                              />
                              <div
                                className="jy-auto-menu-popover"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: 'absolute',
                                  right: '0px',
                                  top: '32px',
                                  background:
                                    'var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-card, #ffffff))',
                                  borderRadius: '12px',
                                  border:
                                    '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.06))',
                                  boxShadow:
                                    '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                                  padding: '6px',
                                  zIndex: 999,
                                  minWidth: '120px',
                                  boxSizing: 'border-box',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                }}
                              >
                                {/* 暂停 / 启用选项 */}
                                <div
                                  className="jy-auto-menu-item"
                                  onClick={() => {
                                    toggleTaskEnabled(task.id);
                                    setActiveMenuTaskId(null);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color:
                                      'var(--dsw-alias-label-primary, #334155)',
                                    padding: '8px 12px',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    transition: 'background 0.15s ease',
                                    fontWeight: 500,
                                  }}
                                >
                                  {task.enabled ? (
                                    <>
                                      <svg
                                        width="13"
                                        height="13"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <rect
                                          x="6"
                                          y="4"
                                          width="4"
                                          height="16"
                                        ></rect>
                                        <rect
                                          x="14"
                                          y="4"
                                          width="4"
                                          height="16"
                                        ></rect>
                                      </svg>
                                      暂停
                                    </>
                                  ) : (
                                    <>
                                      <svg
                                        width="13"
                                        height="13"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <polygon
                                          points="5 3 19 12 5 21 5 3"
                                          fill="currentColor"
                                        ></polygon>
                                      </svg>
                                      启用
                                    </>
                                  )}
                                </div>

                                {/* 删除选项 */}
                                <div
                                  className="jy-auto-menu-item"
                                  onClick={() => {
                                    handleDeleteTask(task.id);
                                    setActiveMenuTaskId(null);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color:
                                      'var(--dsw-alias-label-primary, #334155)',
                                    padding: '8px 12px',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    transition: 'background 0.15s ease',
                                    fontWeight: 500,
                                  }}
                                >
                                  <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                  删除
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* 立即单次运行 */}
                        <button
                          title="立即单次触发运行"
                          onClick={() => {
                            showToast(`🚀 已触发单次运行任务：“${task.name}”`);
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color:
                              'var(--dsw-alias-label-secondary, #334155)',
                            padding: '4px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.15s ease',
                          }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                            <polygon
                              points="10 8 16 12 10 16 10 8"
                              fill="currentColor"
                            ></polygon>
                          </svg>
                        </button>

                        {/* 启用 Toggle 滑动 Switch 开关 */}
                        <div
                          onClick={() => toggleTaskEnabled(task.id)}
                          style={{
                            width: '34px',
                            height: '20px',
                            borderRadius: '9999px',
                            background: task.enabled
                              ? '#0fa968'
                              : 'var(--dsw-alias-border-l2, #e2e8f0)',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              background: '#ffffff',
                              position: 'absolute',
                              top: '3px',
                              left: task.enabled ? '17px' : '3px',
                              transition:
                                'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* 空状态 */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '60px 0 40px 0',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  className="jy-card-icon-box"
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--dsw-alias-bg-layer-3, #f8fafc)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    border:
                      '1px dashed var(--dsw-alias-border-l2, var(--dsw-alias-border, #cbd5e1))',
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--dsw-alias-label-tertiary, #94a3b8)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <p
                  style={{
                    margin: '0 0 20px 0',
                    fontSize: '13px',
                    color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                  }}
                >
                  开启你的第一个自动化任务吧
                </p>

                <button
                  className="jy-btn-primary"
                  onClick={handleOpenCreate}
                  style={{
                    height: '34px',
                    padding: '0 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--dsw-alias-bg-button-primary, #0f172a)',
                    color: 'var(--dsw-alias-label-inverse, #ffffff)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'opacity 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  ＋ 添加自动化
                </button>

                {/* 任务模板区 */}
                <div style={{ width: '100%', marginTop: '60px' }}>
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--dsw-alias-label-primary, #0f172a)',
                      marginBottom: '16px',
                      textAlign: 'left',
                    }}
                  >
                    自动化任务模版
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: '12px',
                      width: '100%',
                    }}
                  >
                    {AUTOMATION_TEMPLATES.map((tpl) => (
                      <TemplateCard
                        key={tpl.id}
                        tpl={tpl}
                        onClick={() => handleSelectTemplate(tpl)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: 执行历史 */}
        {activeTab === 'history' && (
          <div
            className="jy-history-table-wrapper"
            style={{
              background: 'var(--dsw-alias-bg-layer-2, #ffffff)',
              borderRadius: '12px',
              border:
                '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
              overflow: 'hidden',
              width: '100%',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: 'var(--dsw-alias-bg-layer-3, #f8fafc)',
                    borderBottom:
                      '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
                  }}
                >
                  <th
                    style={{
                      padding: '12px 16px',
                      color: 'var(--dsw-alias-label-secondary, #64748b)',
                      fontWeight: 600,
                    }}
                  >
                    运行时间
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      color: 'var(--dsw-alias-label-secondary, #64748b)',
                      fontWeight: 600,
                    }}
                  >
                    自动化任务
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      color: 'var(--dsw-alias-label-secondary, #64748b)',
                      fontWeight: 600,
                    }}
                  >
                    耗时
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      color: 'var(--dsw-alias-label-secondary, #64748b)',
                      fontWeight: 600,
                    }}
                  >
                    执行状态
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      color: 'var(--dsw-alias-label-secondary, #64748b)',
                      fontWeight: 600,
                    }}
                  >
                    日志详情
                  </th>
                </tr>
              </thead>
              <tbody>
                {historyList.map((item, idx) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom:
                        idx < historyList.length - 1
                          ? '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #f1f5f9))'
                          : 'none',
                    }}
                  >
                    <td
                      style={{
                        padding: '14px 16px',
                        color: 'var(--dsw-alias-label-tertiary, #64748b)',
                      }}
                    >
                      {item.time}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        color: 'var(--dsw-alias-label-primary, #0f172a)',
                        fontWeight: 500,
                      }}
                    >
                      {item.taskName}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        color: 'var(--dsw-alias-label-tertiary, #64748b)',
                      }}
                    >
                      {item.duration}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          color:
                            item.status === 'success' ? '#16a34a' : '#dc2626',
                          background:
                            item.status === 'success'
                              ? 'rgba(34, 197, 94, 0.1)'
                              : 'rgba(239, 68, 68, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 500,
                        }}
                      >
                        {item.status === 'success' ? '成功' : '失败'}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        color: 'var(--dsw-alias-label-tertiary, #64748b)',
                      }}
                    >
                      {item.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: 任务模板 */}
        {activeTab === 'templates' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '12px',
              width: '100%',
            }}
          >
            {AUTOMATION_TEMPLATES.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                tpl={tpl}
                onClick={() => handleSelectTemplate(tpl)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 新建/编辑自动化大抽屉弹窗 (完全还原图 3) */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 999,
            backdropFilter: 'blur(3px)',
            animation: 'fade-in 0.15s ease',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="jy-drawer-modal"
            style={{
              width: '560px',
              height: '100%',
              background:
                'var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-card, #ffffff))',
              borderLeft:
                '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
              boxShadow: '-4px 0 25px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slide-left 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="jy-drawer-header"
              style={{
                padding: '18px 24px',
                borderBottom:
                  '1px solid var(--dsw-alias-border-l2, #f1f5f9)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxSizing: 'border-box',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--dsw-alias-label-primary, #0f172a)',
                }}
              >
                {editingTask ? '编辑自动化' : '新建自动化'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                  padding: '4px',
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Scroll Form Body */}
            <form
              onSubmit={handleSaveTask}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                boxSizing: 'border-box',
              }}
            >
              {/*名称 */}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <label
                  className="jy-form-label"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--dsw-alias-label-secondary, #334155)',
                  }}
                >
                  名称
                </label>
                <input
                  type="text"
                  className="jy-form-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="请输入自动化任务名称"
                  style={{
                    height: '34px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border:
                      '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                    fontSize: '13px',
                    outline: 'none',
                    background:
                      'var(--dsw-alias-bg-layer-3, #ffffff)',
                    color: 'var(--dsw-alias-label-primary, #0f172a)',
                  }}
                />
              </div>

              {/*工作空间 */}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <label
                  className="jy-form-label"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--dsw-alias-label-secondary, #334155)',
                  }}
                >
                  工作空间{' '}
                  <span
                    style={{
                      fontWeight: 400,
                      color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                    }}
                  >
                    (可选)
                  </span>
                </label>
                <input
                  type="text"
                  className="jy-form-input"
                  value={formWorkspace}
                  onChange={(e) => setFormWorkspace(e.target.value)}
                  placeholder="选择工作空间"
                  style={{
                    height: '34px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border:
                      '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                    fontSize: '13px',
                    outline: 'none',
                    background:
                      'var(--dsw-alias-bg-layer-3, #ffffff)',
                    color: 'var(--dsw-alias-label-primary, #0f172a)',
                  }}
                />
              </div>

              {/*提示词 (带四个底部小微标标签) */}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <label
                  className="jy-form-label"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--dsw-alias-label-secondary, #334155)',
                  }}
                >
                  提示词
                </label>
                <div
                  style={{
                    border:
                      '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    background:
                      'var(--dsw-alias-bg-layer-3, #ffffff)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <textarea
                    className="jy-form-textarea"
                    value={formPrompt}
                    onChange={(e) => setFormPrompt(e.target.value)}
                    placeholder="请输入当自动化运行时，希望智能体执行的具体工作内容或流程..."
                    style={{
                      height: '110px',
                      padding: '12px',
                      border: 'none',
                      outline: 'none',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      resize: 'none',
                      fontFamily: 'inherit',
                      background: 'transparent',
                      color: 'var(--dsw-alias-label-primary, #0f172a)',
                    }}
                  />
                  {/* 输入框底部小辅助条 */}
                  <div
                    className="jy-prompt-toolbar"
                    style={{
                      padding: '6px 12px',
                      background:
                        'var(--dsw-alias-bg-layer-3, #f8fafc)',
                      borderTop:
                        '1px solid var(--dsw-alias-border-l2, #f1f5f9)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '11.5px',
                      color: 'var(--dsw-alias-label-tertiary, #64748b)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        cursor: 'pointer',
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <polygon points="10 8 16 12 10 16 10 8"></polygon>
                      </svg>
                      Auto ▾
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        cursor: 'pointer',
                      }}
                    >
                      ⚙ 技能 ▾
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        cursor: 'pointer',
                      }}
                    >
                      🤖 召唤智能体 ▾
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        cursor: 'pointer',
                        color: '#ea580c',
                        fontWeight: 500,
                      }}
                    >
                      ⚠ 完全访问权限 ▾
                    </div>
                  </div>
                </div>
              </div>

              {/*连接器 (选择已授权) */}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <label
                  className="jy-form-label"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--dsw-alias-label-secondary, #334155)',
                  }}
                >
                  连接器{' '}
                  <span
                    style={{
                      fontWeight: 400,
                      color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                    }}
                  >
                    (勾选即授权该连接器在任务中免确认使用)
                  </span>
                </label>
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border:
                      '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                    background:
                      'var(--dsw-alias-bg-layer-3, #f8fafc)',
                    fontSize: '13px',
                    color: 'var(--dsw-alias-label-primary, #334155)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formConnectors.includes('lark')}
                    onChange={(e) => {
                      if (e.target.checked) setFormConnectors(['lark']);
                      else setFormConnectors([]);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>飞书 (Lark)</span>
                </div>
              </div>

              {/*执行频率 (Tab + 下拉) */}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <label
                  className="jy-form-label"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--dsw-alias-label-secondary, #334155)',
                  }}
                >
                  执行频率{' '}
                  <span
                    style={{
                      fontWeight: 400,
                      color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                    }}
                  >
                    (建议避开上午高峰时段，选择非高峰期执行更稳定)
                  </span>
                </label>

                {/* 频率 Tab 切换 */}
                <div
                  className="jy-freq-segment"
                  style={{
                    display: 'flex',
                    gap: '6px',
                    background:
                      'var(--dsw-alias-bg-layer-3, #f1f5f9)',
                    padding: '3px',
                    borderRadius: '8px',
                    width: 'fit-content',
                  }}
                >
                  {[
                    { id: 'cycle', label: '周期' },
                    { id: 'interval', label: '按间隔' },
                    { id: 'once', label: '单次' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={
                        formFreqType === f.id ? 'jy-freq-segment-active' : ''
                      }
                      onClick={() => setFormFreqType(f.id as any)}
                      style={{
                        padding: '4px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        background:
                          formFreqType === f.id
                            ? 'var(--dsw-alias-bg-layer-2, #ffffff)'
                            : 'transparent',
                        color:
                          formFreqType === f.id
                            ? 'var(--dsw-alias-label-primary, #0f172a)'
                            : 'var(--dsw-alias-label-tertiary, #64748b)',
                        fontSize: '12px',
                        fontWeight: formFreqType === f.id ? 600 : 500,
                        cursor: 'pointer',
                        boxShadow:
                          formFreqType === f.id
                            ? '0 1px 2px rgba(0,0,0,0.05)'
                            : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* 周期表单展开细节 */}
                {formFreqType === 'cycle' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '4px',
                    }}
                  >
                    <select
                      className="jy-form-select"
                      value={formFreqCycle}
                      onChange={(e) => setFormFreqCycle(e.target.value)}
                      style={{
                        height: '34px',
                        padding: '0 8px',
                        borderRadius: '6px',
                        border:
                          '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                        background:
                          'var(--dsw-alias-bg-layer-3, #ffffff)',
                        color: 'var(--dsw-alias-label-primary, #0f172a)',
                        fontSize: '12.5px',
                        width: '100px',
                      }}
                    >
                      <option value="everyday">每天</option>
                      <option value="everyweek">每周日</option>
                      <option value="everymonth">每月 1 日</option>
                    </select>

                    <input
                      type="time"
                      className="jy-form-input"
                      value={formFreqTime}
                      onChange={(e) => setFormFreqTime(e.target.value)}
                      style={{
                        height: '34px',
                        padding: '0 8px',
                        borderRadius: '6px',
                        border:
                          '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                        background:
                          'var(--dsw-alias-bg-layer-3, #ffffff)',
                        color: 'var(--dsw-alias-label-primary, #0f172a)',
                        fontSize: '12.5px',
                        width: '110px',
                      }}
                    />
                  </div>
                )}

                {/* 按间隔表单展开 */}
                {formFreqType === 'interval' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '4px',
                      fontSize: '13px',
                      color: 'var(--dsw-alias-label-secondary, #475569)',
                    }}
                  >
                    <span>每隔</span>
                    <input
                      type="number"
                      className="jy-form-input"
                      defaultValue={2}
                      style={{
                        height: '34px',
                        width: '70px',
                        padding: '0 8px',
                        borderRadius: '6px',
                        border:
                          '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                        background:
                          'var(--dsw-alias-bg-layer-3, #ffffff)',
                        color: 'var(--dsw-alias-label-primary, #0f172a)',
                        fontSize: '12.5px',
                      }}
                    />
                    <select
                      className="jy-form-select"
                      style={{
                        height: '34px',
                        padding: '0 8px',
                        borderRadius: '6px',
                        border:
                          '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                        background:
                          'var(--dsw-alias-bg-layer-3, #ffffff)',
                        color: 'var(--dsw-alias-label-primary, #0f172a)',
                        fontSize: '12.5px',
                      }}
                    >
                      <option>小时</option>
                      <option>分钟</option>
                    </select>
                  </div>
                )}

                {/* 单次表单展开 */}
                {formFreqType === 'once' && (
                  <div
                    style={{
                      marginTop: '4px',
                      fontSize: '12px',
                      color: 'var(--dsw-alias-label-tertiary, #64748b)',
                    }}
                  >
                    任务将仅被单次触发（您也可以随时在面板中点击“▶
                    运行”立即执行）。
                  </div>
                )}
              </div>

              {/* 生效日期区间 */}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <label
                  className="jy-form-label"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--dsw-alias-label-secondary, #334155)',
                  }}
                >
                  生效日期区间{' '}
                  <span
                    style={{
                      fontWeight: 400,
                      color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                    }}
                  >
                    (可选，留空表示始终生效)
                  </span>
                </label>
                <input
                  type="date"
                  className="jy-form-input"
                  placeholder="选择生效日期"
                  style={{
                    height: '34px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border:
                      '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                    fontSize: '13px',
                    outline: 'none',
                    background:
                      'var(--dsw-alias-bg-layer-3, #ffffff)',
                    color: 'var(--dsw-alias-label-primary, #0f172a)',
                  }}
                />
              </div>

              {/* 推送通道 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginTop: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12.5px',
                    color: 'var(--dsw-alias-label-secondary, #334155)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>推送到微信小程序</span>
                    <span
                      title="推送并接收微信推送卡片服务"
                      style={{
                        cursor: 'help',
                        color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                      }}
                    >
                      ⓘ
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formPushApp}
                    onChange={(e) => setFormPushApp(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12.5px',
                    color: 'var(--dsw-alias-label-secondary, #334155)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>推送到企业微信 bot</span>
                    <span
                      title="向绑定的企业微信机器人推送消息"
                      style={{
                        cursor: 'help',
                        color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                      }}
                    >
                      ⓘ
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formPushBot}
                    onChange={(e) => setFormPushBot(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              </div>
            </form>

            {/* Footer */}
            <div
              className="jy-drawer-footer"
              style={{
                padding: '18px 24px',
                borderTop:
                  '1px solid var(--dsw-alias-border-l2, #f1f5f9)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                boxSizing: 'border-box',
              }}
            >
              <button
                type="button"
                className="jy-btn-secondary"
                onClick={() => setShowModal(false)}
                style={{
                  height: '34px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border:
                    '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                  background:
                    'var(--dsw-alias-bg-layer-3, #ffffff)',
                  color: 'var(--dsw-alias-label-secondary, #334155)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                取消
              </button>
              <button
                className="jy-btn-primary"
                onClick={handleSaveTask}
                style={{
                  height: '34px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--dsw-alias-bg-button-primary, #0f172a)',
                  color: 'var(--dsw-alias-label-inverse, #ffffff)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 全局自定义 Toast 弹窗气泡 */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--dsw-alias-bg-button-primary, #0f172a)',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow:
              '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fade-in 0.15s ease',
          }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}

// 模板卡片排版组件 (100% 对齐截图 1 底部)
interface TplCardProps {
  tpl: TemplateItem;
  onClick: () => void;
}

const TemplateCard = ({ tpl, onClick }: TplCardProps) => {
  return (
    <div
      onClick={onClick}
      className="jy-auto-task-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 18px',
        borderRadius: '12px',
        border:
          '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
        background:
          'var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-card, #ffffff))',
        boxSizing: 'border-box',
        height: '88px',
        cursor: 'pointer',
        transition: 'all 0.2s ease-out',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor =
          'var(--dsw-alias-border-hover, rgba(255,255,255,0.2))';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor =
          'var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {/* Icon 容器 */}
      <div
        className="jy-card-icon-box"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          background: 'var(--dsw-alias-bg-layer-3, #f8fafc)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border:
            '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
          flexShrink: 0,
        }}
      >
        <TemplateIcon type={tpl.iconType} />
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--dsw-alias-label-primary, #0f172a)',
          }}
        >
          {tpl.title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '11.5px',
            color: 'var(--dsw-alias-label-secondary, #64748b)',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {tpl.desc}
        </p>
      </div>
    </div>
  );
};

// 模板各类 SVG Icon
const TemplateIcon = ({ type }: { type: string }) => {
  const strokeColor = 'var(--dsw-alias-label-secondary, #475569)';
  switch (type) {
    case 'news':
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <path d="M16 8h2M16 12h2M16 16h2M6 8h6v8H6z"></path>
        </svg>
      );
    case 'english':
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          <path d="M9 8h6M12 6v6"></path>
        </svg>
      );
    case 'story':
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      );
    case 'report':
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      );
    case 'movie':
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
          <line x1="7" y1="2" x2="7" y2="22"></line>
          <line x1="17" y1="2" x2="17" y2="22"></line>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <line x1="2" y1="7" x2="7" y2="7"></line>
          <line x1="2" y1="17" x2="7" y2="17"></line>
          <line x1="17" y1="17" x2="22" y2="17"></line>
          <line x1="17" y1="7" x2="22" y2="7"></line>
        </svg>
      );
    case 'history':
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      );
    case 'qa':
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
      );
    case 'family':
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      );
    case 'health':
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
        </svg>
      );
    case 'interview':
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
        </svg>
      );
    case 'meeting':
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <polyline points="16 11 18 13 22 9"></polyline>
        </svg>
      );
    case 'wallpaper':
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      );
    default:
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
        >
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
      );
  }
};
