import React, { useEffect, useState } from 'react';

import { sendPromptToComposer } from '../../dom-helper';
import { AUTOMATION_TEMPLATES, type TemplateItem } from './constants';
import { DetailModal, HistoryTable } from './HistoryTable';
import { TaskCard, TaskEmptyState } from './TaskCard';
import { TaskDrawer } from './TaskDrawer';
import { TemplateCard } from './TemplateCard';
import type { AutoTask, FrequencyType, HistoryRecord } from './types';

export function AutomationPanel() {
  const [activeTab, setActiveTab] = useState<
    'configured' | 'history' | 'templates'
  >('configured');
  const [keepAwake, setKeepAwake] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<AutoTask | null>(null);
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);
  const [runningTaskIds, setRunningTaskIds] = useState<Set<string>>(new Set());
  const [detailRecord, setDetailRecord] = useState<HistoryRecord | null>(null);

  // 真实数据状态
  const [tasks, setTasks] = useState<AutoTask[]>([]);
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([]);

  // 提示气泡
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // 表单状态定义
  const [formName, setFormName] = useState('');
  const [formWorkspace, setFormWorkspace] = useState('自动化工作区 (默认)');
  const [formPrompt, setFormPrompt] = useState('');
  const [formConnectors, setFormConnectors] = useState<string[]>(['lark']);
  const [formModelMode, setFormModelMode] = useState<
    'auto' | 'deepthink' | 'fast'
  >('auto');
  const [formSkills, setFormSkills] = useState<string[]>([]);
  const [formAgentId, setFormAgentId] = useState<string>('none');
  const [formPermissionLevel, setFormPermissionLevel] = useState<
    'full' | 'standard' | 'readonly'
  >('full');
  const [formFreqType, setFormFreqType] = useState<FrequencyType>('cycle');
  const [formFreqCycle, setFormFreqCycle] = useState('everyday'); // everyday, everyweek, everymonth
  const [formCycleDay, setFormCycleDay] = useState<number>(1);
  const [formFreqTime, setFormFreqTime] = useState('08:30');
  const [formIntervalValue, setFormIntervalValue] = useState<number>(2);
  const [formIntervalUnit, setFormIntervalUnit] = useState<'minute' | 'hour'>(
    'hour'
  );
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/jingyun/automation/tasks');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTasks(json.data);
      }
    } catch (err) {
      console.error('[AutomationPanel] Failed to fetch tasks:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/jingyun/automation/history');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setHistoryList(json.data);
      }
    } catch (err) {
      console.error('[AutomationPanel] Failed to fetch history:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/jingyun/automation/settings');
      const json = await res.json();
      if (json.success && json.data) {
        setKeepAwake(Boolean(json.data.keepAwake));
      }
    } catch (err) {
      console.error('[AutomationPanel] Failed to fetch settings:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([fetchTasks(), fetchHistory(), fetchSettings()]);
    };
    loadAll();
    const timer = setInterval(() => {
      fetchTasks();
      fetchHistory();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // 切换保持电脑唤醒
  const handleToggleKeepAwake = async () => {
    const nextVal = !keepAwake;
    setKeepAwake(nextVal);
    try {
      await fetch('/api/jingyun/automation/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepAwake: nextVal }),
      });
      showToast(nextVal ? '⚡ 已开启电脑保持唤醒' : '💤 已关闭电脑保持唤醒');
    } catch {
      setKeepAwake(!nextVal);
      showToast('❌ 保存设置失败');
    }
  };

  // 处理拉起新建弹窗
  const handleOpenCreate = () => {
    setEditingTask(null);
    setFormName('');
    setFormWorkspace('自动化工作区 (默认)');
    setFormPrompt('');
    setFormConnectors(['lark']);
    setFormModelMode('auto');
    setFormSkills([]);
    setFormAgentId('none');
    setFormPermissionLevel('full');
    setFormFreqType('cycle');
    setFormFreqCycle('everyday');
    setFormCycleDay(1);
    setFormFreqTime('08:30');
    setFormIntervalValue(2);
    setFormIntervalUnit('hour');
    setFormStartDate('');
    setFormEndDate('');
    setShowModal(true);
  };

  // 处理拉起编辑弹窗
  const handleOpenEdit = (task: AutoTask) => {
    setEditingTask(task);
    setFormName(task.name);
    setFormWorkspace(task.workspace);
    setFormPrompt(task.prompt);
    setFormConnectors(task.connectors || []);
    setFormModelMode(task.modelMode || 'auto');
    setFormSkills(task.skills || []);
    setFormAgentId(task.agentId || 'none');
    setFormPermissionLevel(task.permissionLevel || 'full');
    setFormFreqType(task.frequencyType);
    const cfg = task.frequencyConfig;
    setFormFreqCycle(cfg?.cycleType || 'everyday');
    setFormCycleDay(cfg?.cycleDay ?? 1);
    setFormFreqTime(cfg?.cycleTime || cfg?.onceTime || '08:30');
    setFormIntervalValue(cfg?.intervalValue || 2);
    setFormIntervalUnit(cfg?.intervalUnit || 'hour');
    setFormStartDate(task.startDate || '');
    setFormEndDate(task.endDate || '');

    setShowModal(true);
  };

  // 处理点击模板一键预填新建
  const handleSelectTemplate = (tpl: TemplateItem) => {
    setEditingTask(null);
    setFormName(tpl.title);
    setFormWorkspace('自动化工作区 (默认)');
    setFormPrompt(tpl.prompt);
    setFormConnectors(['lark']);
    setFormModelMode('auto');
    setFormSkills([]);
    setFormAgentId('none');
    setFormPermissionLevel('full');
    setFormFreqType('cycle');
    setFormFreqCycle('everyday');
    setFormCycleDay(1);
    setFormFreqTime('08:30');
    setFormIntervalValue(2);
    setFormIntervalUnit('hour');
    setFormStartDate('');
    setFormEndDate('');
    setShowModal(true);
    showToast(`💡 已为您载入“${tpl.title}”模板，可根据需要配置！`);
  };

  // 保存任务
  const handleSaveTask = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!formName.trim()) return alert('请输入任务名称');
    if (!formPrompt.trim()) return alert('请输入提示词内容');

    let freqDetail = '';
    let frequencyConfig: Record<string, unknown> = {};
    if (formFreqType === 'cycle') {
      const weekLabels = [
        '周日',
        '周一',
        '周二',
        '周三',
        '周四',
        '周五',
        '周六',
      ];
      if (formFreqCycle === 'everyday') freqDetail = `每天 ${formFreqTime}`;
      else if (formFreqCycle === 'everyweek')
        freqDetail = `每${weekLabels[formCycleDay] || '周一'} ${formFreqTime}`;
      else freqDetail = `每月 ${formCycleDay || 1} 日 ${formFreqTime}`;
      frequencyConfig = {
        cycleType: formFreqCycle,
        cycleDay: formCycleDay,
        cycleTime: formFreqTime,
      };
    } else if (formFreqType === 'interval') {
      freqDetail = `每隔 ${formIntervalValue} ${formIntervalUnit === 'hour' ? '小时' : '分钟'}`;
      frequencyConfig = {
        intervalValue: Number(formIntervalValue),
        intervalUnit: formIntervalUnit,
      };
    } else {
      freqDetail = `单次 ${formFreqTime}`;
      frequencyConfig = { onceTime: formFreqTime };
    }

    const payload = {
      name: formName.trim(),
      workspace: formWorkspace.trim() || '自动化工作区 (默认)',
      prompt: formPrompt.trim(),
      connectors: formConnectors,
      modelMode: formModelMode,
      skills: formSkills,
      agentId: formAgentId,
      permissionLevel: formPermissionLevel,
      frequencyType: formFreqType,
      frequencyDetail: freqDetail,
      frequencyConfig,
      startDate: formStartDate,
      endDate: formEndDate,
      enabled: editingTask ? editingTask.enabled : true,
    };

    try {
      if (editingTask) {
        const res = await fetch(
          `/api/jingyun/automation/tasks/${editingTask.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        const data = await res.json();
        if (!data.success) throw new Error(data.error || '保存失败');
        showToast('✅ 任务修改保存成功！');
      } else {
        const res = await fetch('/api/jingyun/automation/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || '创建失败');
        showToast('🎉 新建自动化任务成功！');
      }
      setShowModal(false);
      setActiveTab('configured');
      await fetchTasks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`保存任务失败: ${msg}`);
    }
  };

  // 删除任务
  const handleDeleteTask = async (id: string) => {
    if (!confirm('确定要删除这个自动化任务吗？')) return;
    try {
      const res = await fetch(`/api/jingyun/automation/tasks/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '删除失败');
      setTasks((prev) => prev.filter((t) => t.id !== id));
      showToast('🗑️ 任务已被移除');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`删除失败: ${msg}`);
    }
  };

  // 切换任务状态
  const toggleTaskEnabled = async (id: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: nextEnabled } : t))
    );
    try {
      const res = await fetch(`/api/jingyun/automation/tasks/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, enabled: currentEnabled } : t))
      );
      showToast('❌ 切换状态失败');
    }
  };

  // 立即单次运行任务
  const handleRunTask = async (task: AutoTask) => {
    if (runningTaskIds.has(task.id)) return;
    setRunningTaskIds((prev) => new Set(prev).add(task.id));
    showToast(`🚀 已触发运行：“${task.name}”，Agent 正在执行...`);

    try {
      const res = await fetch(`/api/jingyun/automation/tasks/${task.id}/run`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ “${task.name}” ${json.data?.message || '执行成功'}`);
      } else {
        showToast(`❌ 执行失败: ${json.error || '未知错误'}`);
      }
      await Promise.all([fetchTasks(), fetchHistory()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`❌ 执行异常: ${msg}`);
    } finally {
      setRunningTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  // 清空执行历史
  const handleClearHistory = async () => {
    if (!confirm('确定要清空全部执行历史记录吗？')) return;
    try {
      const res = await fetch('/api/jingyun/automation/history', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setHistoryList([]);
      showToast('🧹 执行历史已清空');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`清空历史失败: ${msg}`);
    }
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

      {/* Tabs 页签选择 与 按钮控制组 */}
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
        <div style={{ display: 'flex', gap: '24px' }}>
          {[
            { id: 'configured', label: '已配置' },
            { id: 'history', label: '执行历史' },
            { id: 'templates', label: '任务模板' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(tab.id as 'configured' | 'history' | 'templates')
              }
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

        {/* 右侧动作按钮组 */}
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
              sendPromptToComposer('帮我创建一个自动化任务：');
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
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
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
                      onChange={handleToggleKeepAwake}
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
                    <TaskCard
                      key={task.id}
                      task={task}
                      activeMenuTaskId={activeMenuTaskId}
                      runningTaskIds={runningTaskIds}
                      onOpenEdit={handleOpenEdit}
                      onToggleMenu={setActiveMenuTaskId}
                      onToggleEnabled={toggleTaskEnabled}
                      onDelete={handleDeleteTask}
                      onRun={handleRunTask}
                    />
                  ))}
                </div>
              </>
            ) : (
              <TaskEmptyState
                onCreate={handleOpenCreate}
                onSelectTemplate={handleSelectTemplate}
              />
            )}
          </div>
        )}

        {/* Tab 2: 执行历史 */}
        {activeTab === 'history' && (
          <HistoryTable
            historyList={historyList}
            onClearHistory={handleClearHistory}
            onSelectDetail={setDetailRecord}
          />
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

      {/* 新建/编辑任务大抽屉 */}
      <TaskDrawer
        show={showModal}
        editingTask={editingTask}
        formName={formName}
        setFormName={setFormName}
        formWorkspace={formWorkspace}
        setFormWorkspace={setFormWorkspace}
        formPrompt={formPrompt}
        setFormPrompt={setFormPrompt}
        formModelMode={formModelMode}
        setFormModelMode={setFormModelMode}
        formSkills={formSkills}
        setFormSkills={setFormSkills}
        formAgentId={formAgentId}
        setFormAgentId={setFormAgentId}
        formPermissionLevel={formPermissionLevel}
        setFormPermissionLevel={setFormPermissionLevel}
        formConnectors={formConnectors}
        setFormConnectors={setFormConnectors}
        formFreqType={formFreqType}
        setFormFreqType={setFormFreqType}
        formFreqCycle={formFreqCycle}
        setFormFreqCycle={setFormFreqCycle}
        formCycleDay={formCycleDay}
        setFormCycleDay={setFormCycleDay}
        formFreqTime={formFreqTime}
        setFormFreqTime={setFormFreqTime}
        formIntervalValue={formIntervalValue}
        setFormIntervalValue={setFormIntervalValue}
        formIntervalUnit={formIntervalUnit}
        setFormIntervalUnit={setFormIntervalUnit}
        formStartDate={formStartDate}
        setFormStartDate={setFormStartDate}
        formEndDate={formEndDate}
        setFormEndDate={setFormEndDate}
        onClose={() => setShowModal(false)}
        onSave={handleSaveTask}
      />

      {/* 历史详情模态弹窗 */}
      {detailRecord && (
        <DetailModal
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
          onToast={showToast}
        />
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
