import React, { useEffect, useState } from 'react';

import type { AutoTask, FrequencyType } from './types';

interface SkillOption {
  id: string;
  name: string;
  description?: string;
}

interface AgentOption {
  id: string;
  name: string;
  description?: string;
}

interface WorkspaceOption {
  id: string;
  name: string;
  path: string;
}

const MODEL_MODES: Array<{
  id: 'auto' | 'deepthink' | 'fast';
  label: string;
  shortLabel: string;
  desc: string;
}> = [
  {
    id: 'auto',
    label: 'Auto (自动模式)',
    shortLabel: 'Auto',
    desc: '根据任务复杂度自动匹配推理深度',
  },
  {
    id: 'deepthink',
    label: '深度思考 (DeepThink)',
    shortLabel: '深度思考',
    desc: '多维深度推理，适合周报分析与复杂规划',
  },
  {
    id: 'fast',
    label: '极速响应 (Fast)',
    shortLabel: '极速响应',
    desc: '快速输出精炼结论，适合定时提醒与播报',
  },
];

const PERMISSION_LEVELS: Array<{
  id: 'readonly' | 'standard' | 'full';
  label: string;
}> = [
  { id: 'readonly', label: '仅可查看' },
  { id: 'standard', label: '工作区内修改' },
  { id: 'full', label: '完全权限' },
];

const PermissionShieldIcon = ({
  type,
}: {
  type: 'readonly' | 'standard' | 'full';
}) => (
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
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    {type === 'readonly' && <polyline points="9 12 11 14 15 10" />}
    {type === 'standard' && (
      <>
        <line x1="9" y1="10" x2="14" y2="10" />
        <line x1="9" y1="13" x2="12" y2="13" />
        <path d="M14.5 15.5L17 13" />
      </>
    )}
    {type === 'full' && (
      <>
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    )}
  </svg>
);

interface TaskDrawerProps {
  show: boolean;
  editingTask: AutoTask | null;
  formName: string;
  setFormName: (val: string) => void;
  formWorkspace: string;
  setFormWorkspace: (val: string) => void;
  formPrompt: string;
  setFormPrompt: (val: string) => void;
  formModelMode: 'auto' | 'deepthink' | 'fast';
  setFormModelMode: (val: 'auto' | 'deepthink' | 'fast') => void;
  formSkills: string[];
  setFormSkills: (val: string[]) => void;
  formAgentId: string;
  setFormAgentId: (val: string) => void;
  formPermissionLevel: 'full' | 'standard' | 'readonly';
  setFormPermissionLevel: (val: 'full' | 'standard' | 'readonly') => void;
  formConnectors: string[];
  setFormConnectors: (val: string[]) => void;
  formFreqType: FrequencyType;
  setFormFreqType: (val: FrequencyType) => void;
  formFreqCycle: string;
  setFormFreqCycle: (val: string) => void;
  formCycleDay: number;
  setFormCycleDay: (val: number) => void;
  formFreqTime: string;
  setFormFreqTime: (val: string) => void;
  formIntervalValue: number;
  setFormIntervalValue: (val: number) => void;
  formIntervalUnit: 'minute' | 'hour';
  setFormIntervalUnit: (val: 'minute' | 'hour') => void;
  formStartDate: string;
  setFormStartDate: (val: string) => void;
  formEndDate: string;
  setFormEndDate: (val: string) => void;
  onClose: () => void;
  onSave: (e: React.SyntheticEvent) => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  show,
  editingTask,
  formName,
  setFormName,
  formWorkspace,
  setFormWorkspace,
  formPrompt,
  setFormPrompt,
  formModelMode,
  setFormModelMode,
  formSkills,
  setFormSkills,
  formAgentId,
  setFormAgentId,
  formPermissionLevel,
  setFormPermissionLevel,
  formConnectors,
  setFormConnectors,
  formFreqType,
  setFormFreqType,
  formFreqCycle,
  setFormFreqCycle,
  formCycleDay,
  setFormCycleDay,
  formFreqTime,
  setFormFreqTime,
  formIntervalValue,
  setFormIntervalValue,
  formIntervalUnit,
  setFormIntervalUnit,
  formStartDate,
  setFormStartDate,
  formEndDate,
  setFormEndDate,
  onClose,
  onSave,
}) => {
  const [activeDropdown, setActiveDropdown] = useState<
    'workspace' | 'mode' | 'skills' | 'agent' | 'permission' | null
  >(null);
  const [workspaceList, setWorkspaceList] = useState<WorkspaceOption[]>([
    { id: 'automation', name: '自动化工作区 (默认)', path: '' },
  ]);
  const [skillList, setSkillList] = useState<SkillOption[]>([]);
  const [agentList, setAgentList] = useState<AgentOption[]>([
    { id: 'none', name: '默认智能助理', description: '通用全能大模型助理' },
  ]);
  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    const loadInstalledAssets = async () => {
      try {
        const wsRes = await fetch('/api/jingyun/automation/workspaces');
        if (wsRes.ok) {
          const wsJson = await wsRes.json();
          if (
            !cancelled &&
            wsJson.success &&
            Array.isArray(wsJson.data) &&
            wsJson.data.length > 0
          ) {
            setWorkspaceList(wsJson.data);
          }
        }
      } catch (err) {
        console.warn('[TaskDrawer] 加载工作区失败:', err);
      }
      try {
        const res = await fetch('/api/jingyun/installed-assets');
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;

        const rawSkills = Array.isArray(json.data?.skillsDetail)
          ? json.data.skillsDetail
          : [];
        const loadedSkills: SkillOption[] = rawSkills
          .map((s: { id?: string; name?: string; description?: string }) => ({
            id: s.id || '',
            name: s.name || s.id || '',
            description: s.description || '',
          }))
          .filter((s: SkillOption) => Boolean(s.id));
        setSkillList(loadedSkills);

        const rawAgents = Array.isArray(json.data?.agentsDetail)
          ? json.data.agentsDetail
          : [];
        const dynamicAgents: AgentOption[] = rawAgents.map(
          (ag: Record<string, unknown>) => ({
            id: String(ag.id || ''),
            name: String(ag.name || ag.id || ''),
            description: String(ag.description || ''),
          })
        );
        setAgentList([
          {
            id: 'none',
            name: '默认智能助理',
            description: '通用全能大模型助理',
          },
          ...dynamicAgents,
        ]);
      } catch (err) {
        console.warn('[TaskDrawer] 加载已安装资产失败:', err);
      }
    };
    loadInstalledAssets();
    return () => {
      cancelled = true;
    };
  }, [show]);

  if (!show) return null;

  const currentModeObj =
    MODEL_MODES.find((m) => m.id === formModelMode) || MODEL_MODES[0];
  const currentPermObj =
    PERMISSION_LEVELS.find((p) => p.id === formPermissionLevel) ||
    PERMISSION_LEVELS[0];
  const currentAgentObj =
    agentList.find((a) => a.id === formAgentId) || agentList[0];

  const toggleSkill = (id: string) => {
    if (formSkills.includes(id)) {
      setFormSkills(formSkills.filter((s) => s !== id));
    } else {
      setFormSkills([...formSkills, id]);
    }
  };

  return (
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
      onClick={onClose}
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
        onClick={(e) => {
          e.stopPropagation();
          setActiveDropdown(null);
        }}
      >
        {/* Header */}
        <div
          className="jy-drawer-header"
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--dsw-alias-border-l2, #f1f5f9)',
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
            type="button"
            onClick={onClose}
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scroll Form Body */}
        <form
          onSubmit={onSave}
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
          {/* 名称 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                fontSize: '13px',
                outline: 'none',
                background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
                color: 'var(--dsw-alias-label-primary, #0f172a)',
              }}
            />
          </div>

          {/* 工作空间 (下拉选择真实工作区) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
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
                (选择任务运行的本地工作区目录)
              </span>
            </label>
            <div
              onClick={() =>
                setActiveDropdown(
                  activeDropdown === 'workspace' ? null : 'workspace'
                )
              }
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                fontSize: '13px',
                background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
                color: 'var(--dsw-alias-label-primary, #0f172a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--dsw-alias-label-secondary, #64748b)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span
                  style={{
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formWorkspace || '自动化工作区 (默认)'}
                </span>
                {(() => {
                  const matched = workspaceList.find(
                    (w) => w.name === formWorkspace || w.id === formWorkspace
                  );
                  if (matched && matched.path) {
                    return (
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ({matched.path})
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--dsw-alias-label-tertiary, #64748b)',
                  marginLeft: '8px',
                }}
              >
                ▾
              </span>
            </div>

            {activeDropdown === 'workspace' && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 'calc(100% + 4px)',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  background: 'var(--dsw-alias-bg-layer-2, #ffffff)',
                  borderRadius: '10px',
                  border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                  boxShadow:
                    '0 10px 15px -3px rgba(0,0,0,0.12), 0 4px 6px -2px rgba(0,0,0,0.06)',
                  padding: '6px',
                  zIndex: 1001,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {workspaceList.map((ws) => {
                  const isSelected =
                    formWorkspace === ws.name || formWorkspace === ws.id;
                  return (
                    <div
                      key={ws.id}
                      onClick={() => {
                        setFormWorkspace(ws.name);
                        setActiveDropdown(null);
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isSelected
                          ? 'rgba(37, 99, 235, 0.08)'
                          : 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          color: isSelected
                            ? '#2563eb'
                            : 'var(--dsw-alias-label-primary, #0f172a)',
                        }}
                      >
                        <span>📁 {ws.name}</span>
                        {isSelected && <span>✓</span>}
                      </div>
                      {ws.path && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--dsw-alias-label-tertiary, #64748b)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {ws.path}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 提示词 + 交互工具栏 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                borderRadius: '10px',
                background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
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
                  borderRadius: '10px 10px 0 0',
                  outline: 'none',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  resize: 'none',
                  fontFamily: 'inherit',
                  background: 'transparent',
                  color: 'var(--dsw-alias-label-primary, #0f172a)',
                }}
              />

              {/* 输入框底部可点击交互工具条 */}
              <div
                className="jy-prompt-toolbar"
                style={{
                  padding: '6px 12px',
                  background: 'var(--dsw-alias-bg-layer-3, #f8fafc)',
                  borderTop: '1px solid var(--dsw-alias-border-l2, #f1f5f9)',
                  borderRadius: '0 0 10px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  fontSize: '11.5px',
                  color: 'var(--dsw-alias-label-tertiary, #64748b)',
                  position: 'relative',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. 模式选择按钮 */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveDropdown(
                        activeDropdown === 'mode' ? null : 'mode'
                      )
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      background:
                        activeDropdown === 'mode' || formModelMode !== 'auto'
                          ? 'rgba(37, 99, 235, 0.08)'
                          : 'transparent',
                      color:
                        formModelMode !== 'auto'
                          ? '#2563eb'
                          : 'var(--dsw-alias-label-secondary, #475569)',
                      fontSize: '11.5px',
                      fontWeight: formModelMode !== 'auto' ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
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
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="10 8 16 12 10 16 10 8" />
                    </svg>
                    {currentModeObj.shortLabel} ▾
                  </button>

                  {activeDropdown === 'mode' && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 'calc(100% + 6px)',
                        width: '240px',
                        background: 'var(--dsw-alias-bg-layer-2, #ffffff)',
                        borderRadius: '10px',
                        border: '1px solid var(--dsw-alias-border-l2, #e2e8f0)',
                        boxShadow:
                          '0 10px 15px -3px rgba(0,0,0,0.12), 0 4px 6px -2px rgba(0,0,0,0.06)',
                        padding: '6px',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      {MODEL_MODES.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setFormModelMode(m.id);
                            setActiveDropdown(null);
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            background:
                              formModelMode === m.id
                                ? 'rgba(37, 99, 235, 0.08)'
                                : 'transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '12px',
                              fontWeight: 600,
                              color:
                                formModelMode === m.id
                                  ? '#2563eb'
                                  : 'var(--dsw-alias-label-primary, #0f172a)',
                            }}
                          >
                            <span>{m.label}</span>
                            {formModelMode === m.id && <span>✓</span>}
                          </div>
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--dsw-alias-label-tertiary, #64748b)',
                            }}
                          >
                            {m.desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. 技能选择按钮 */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveDropdown(
                        activeDropdown === 'skills' ? null : 'skills'
                      )
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      background:
                        activeDropdown === 'skills' || formSkills.length > 0
                          ? 'rgba(37, 99, 235, 0.08)'
                          : 'transparent',
                      color:
                        formSkills.length > 0
                          ? '#2563eb'
                          : 'var(--dsw-alias-label-secondary, #475569)',
                      fontSize: '11.5px',
                      fontWeight: formSkills.length > 0 ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    ⚙ 技能
                    {formSkills.length > 0 ? ` (${formSkills.length})` : ''} ▾
                  </button>

                  {activeDropdown === 'skills' && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 'calc(100% + 6px)',
                        width: '268px',
                        maxHeight: '260px',
                        overflowY: 'auto',
                        background: 'var(--dsw-alias-bg-layer-2, #ffffff)',
                        borderRadius: '12px',
                        border: '1px solid var(--dsw-alias-border-l2, #e2e8f0)',
                        boxShadow:
                          '0 10px 20px -3px rgba(0,0,0,0.12), 0 4px 6px -2px rgba(0,0,0,0.05)',
                        padding: '6px',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div
                        style={{
                          padding: '4px 8px 6px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                        }}
                      >
                        勾选任务允许调用的技能
                      </div>
                      {skillList.map((skill) => {
                        const checked = formSkills.includes(skill.id);
                        const cleanDesc =
                          skill.description &&
                          !/^[|>][-+]?$/.test(skill.description.trim())
                            ? skill.description.trim()
                            : '';
                        return (
                          <div
                            key={skill.id}
                            onClick={() => toggleSkill(skill.id)}
                            style={{
                              padding: '7px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: checked
                                ? 'var(--dsw-alias-bg-layer-3, #f1f5f9)'
                                : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              transition: 'background 0.12s ease',
                            }}
                          >
                            <div
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '4px',
                                border: checked
                                  ? '1.5px solid #2563eb'
                                  : '1.5px solid var(--dsw-alias-border-l2, #cbd5e1)',
                                background: checked ? '#2563eb' : '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.12s ease',
                              }}
                            >
                              {checked && (
                                <svg
                                  width="11"
                                  height="11"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#ffffff"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1px',
                                minWidth: 0,
                                flex: 1,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '12.5px',
                                  fontWeight: checked ? 600 : 500,
                                  color:
                                    'var(--dsw-alias-label-primary, #0f172a)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {skill.name}
                              </span>
                              {cleanDesc && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    color:
                                      'var(--dsw-alias-label-tertiary, #64748b)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {cleanDesc}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. 召唤智能体按钮 */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveDropdown(
                        activeDropdown === 'agent' ? null : 'agent'
                      )
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      background:
                        activeDropdown === 'agent' || formAgentId !== 'none'
                          ? 'rgba(37, 99, 235, 0.08)'
                          : 'transparent',
                      color:
                        formAgentId !== 'none'
                          ? '#2563eb'
                          : 'var(--dsw-alias-label-secondary, #475569)',
                      fontSize: '11.5px',
                      fontWeight: formAgentId !== 'none' ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    🤖{' '}
                    {formAgentId !== 'none'
                      ? currentAgentObj.name
                      : '召唤智能体'}{' '}
                    ▾
                  </button>

                  {activeDropdown === 'agent' && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 'calc(100% + 6px)',
                        width: '240px',
                        maxHeight: '240px',
                        overflowY: 'auto',
                        background: 'var(--dsw-alias-bg-layer-2, #ffffff)',
                        borderRadius: '10px',
                        border: '1px solid var(--dsw-alias-border-l2, #e2e8f0)',
                        boxShadow:
                          '0 10px 15px -3px rgba(0,0,0,0.12), 0 4px 6px -2px rgba(0,0,0,0.06)',
                        padding: '6px',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                        }}
                      >
                        指派执行该任务的智能体
                      </div>
                      {agentList.map((ag) => (
                        <div
                          key={ag.id}
                          onClick={() => {
                            setFormAgentId(ag.id);
                            setActiveDropdown(null);
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            background:
                              formAgentId === ag.id
                                ? 'rgba(37, 99, 235, 0.08)'
                                : 'transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '12px',
                              fontWeight: 600,
                              color:
                                formAgentId === ag.id
                                  ? '#2563eb'
                                  : 'var(--dsw-alias-label-primary, #0f172a)',
                            }}
                          >
                            <span>{ag.name}</span>
                            {formAgentId === ag.id && <span>✓</span>}
                          </div>
                          {ag.description && (
                            <span
                              style={{
                                fontSize: '10.5px',
                                color:
                                  'var(--dsw-alias-label-tertiary, #64748b)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {ag.description}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. 权限控制按钮 (对齐 DSH 原生样式) */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveDropdown(
                        activeDropdown === 'permission' ? null : 'permission'
                      )
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      background:
                        activeDropdown === 'permission'
                          ? 'rgba(0, 0, 0, 0.05)'
                          : 'transparent',
                      color:
                        formPermissionLevel === 'full'
                          ? '#ea580c'
                          : 'var(--dsw-alias-label-secondary, #475569)',
                      fontSize: '11.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <PermissionShieldIcon type={formPermissionLevel} />
                    <span>{currentPermObj.label}</span>
                    <span style={{ fontSize: '10px', opacity: 0.7 }}>▾</span>
                  </button>

                  {activeDropdown === 'permission' && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 6px)',
                        width: '176px',
                        background: 'var(--dsw-alias-bg-layer-2, #ffffff)',
                        borderRadius: '12px',
                        border: '1px solid var(--dsw-alias-border-l2, #e2e8f0)',
                        boxShadow:
                          '0 10px 20px -3px rgba(0,0,0,0.12), 0 4px 6px -2px rgba(0,0,0,0.05)',
                        padding: '5px',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      {PERMISSION_LEVELS.map((perm) => {
                        const selected = formPermissionLevel === perm.id;
                        return (
                          <div
                            key={perm.id}
                            onClick={() => {
                              setFormPermissionLevel(perm.id);
                              setActiveDropdown(null);
                            }}
                            style={{
                              height: '34px',
                              padding: '0 10px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: selected
                                ? 'var(--dsw-alias-bg-layer-3, #f1f5f9)'
                                : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              color: 'var(--dsw-alias-label-primary, #0f172a)',
                              fontSize: '13px',
                              fontWeight: selected ? 500 : 400,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <PermissionShieldIcon type={perm.id} />
                              <span>{perm.label}</span>
                            </div>
                            {selected && (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 连接器 (选择已授权) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '8px',
              }}
            >
              {[
                { id: 'lark', label: '飞书' },
                { id: 'wecom', label: '企业微信' },
                { id: 'weixin', label: '微信' },
                { id: 'dingtalk', label: '钉钉' },
              ].map((c) => (
                <label
                  key={c.id}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                    background: 'var(--dsw-alias-bg-layer-3, #f8fafc)',
                    fontSize: '12.5px',
                    color: 'var(--dsw-alias-label-primary, #334155)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formConnectors.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormConnectors([...formConnectors, c.id]);
                      } else {
                        setFormConnectors(
                          formConnectors.filter((id) => id !== c.id)
                        );
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 执行频率 (Tab + 下拉) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                background: 'var(--dsw-alias-bg-layer-3, #f1f5f9)',
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
                  onClick={() => setFormFreqType(f.id as FrequencyType)}
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
                    border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                    background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
                    color: 'var(--dsw-alias-label-primary, #0f172a)',
                    fontSize: '12.5px',
                    width: '100px',
                  }}
                >
                  <option value="everyday">每天</option>
                  <option value="everyweek">每周</option>
                  <option value="everymonth">每月</option>
                </select>

                {formFreqCycle === 'everyweek' && (
                  <select
                    className="jy-form-select"
                    value={formCycleDay}
                    onChange={(e) => setFormCycleDay(Number(e.target.value))}
                    style={{
                      height: '34px',
                      padding: '0 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                      background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
                      color: 'var(--dsw-alias-label-primary, #0f172a)',
                      fontSize: '12.5px',
                      width: '90px',
                    }}
                  >
                    {[
                      { v: 1, l: '周一' },
                      { v: 2, l: '周二' },
                      { v: 3, l: '周三' },
                      { v: 4, l: '周四' },
                      { v: 5, l: '周五' },
                      { v: 6, l: '周六' },
                      { v: 0, l: '周日' },
                    ].map((d) => (
                      <option key={d.v} value={d.v}>
                        {d.l}
                      </option>
                    ))}
                  </select>
                )}

                {formFreqCycle === 'everymonth' && (
                  <select
                    className="jy-form-select"
                    value={formCycleDay || 1}
                    onChange={(e) => setFormCycleDay(Number(e.target.value))}
                    style={{
                      height: '34px',
                      padding: '0 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                      background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
                      color: 'var(--dsw-alias-label-primary, #0f172a)',
                      fontSize: '12.5px',
                      width: '90px',
                    }}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d} 日
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="time"
                  className="jy-form-input"
                  value={formFreqTime}
                  onChange={(e) => setFormFreqTime(e.target.value)}
                  style={{
                    height: '34px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                    background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
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
                  min={1}
                  className="jy-form-input"
                  value={formIntervalValue}
                  onChange={(e) =>
                    setFormIntervalValue(
                      Math.max(1, parseInt(e.target.value, 10) || 1)
                    )
                  }
                  style={{
                    height: '34px',
                    width: '70px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                    background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
                    color: 'var(--dsw-alias-label-primary, #0f172a)',
                    fontSize: '12.5px',
                  }}
                />
                <select
                  className="jy-form-select"
                  value={formIntervalUnit}
                  onChange={(e) =>
                    setFormIntervalUnit(e.target.value as 'minute' | 'hour')
                  }
                  style={{
                    height: '34px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                    background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
                    color: 'var(--dsw-alias-label-primary, #0f172a)',
                    fontSize: '12.5px',
                  }}
                >
                  <option value="hour">小时</option>
                  <option value="minute">分钟</option>
                </select>
              </div>
            )}

            {/* 单次表单展开 */}
            {formFreqType === 'once' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '4px',
                  fontSize: '12.5px',
                  color: 'var(--dsw-alias-label-secondary, #475569)',
                }}
              >
                <span>触发时间</span>
                <input
                  type="time"
                  className="jy-form-input"
                  value={formFreqTime}
                  onChange={(e) => setFormFreqTime(e.target.value)}
                  style={{
                    height: '34px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                    background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
                    color: 'var(--dsw-alias-label-primary, #0f172a)',
                    fontSize: '12.5px',
                    width: '110px',
                  }}
                />
                <span
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                  }}
                >
                  (执行一次后自动关闭)
                </span>
              </div>
            )}
          </div>

          {/* 生效日期区间 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <input
                type="date"
                className="jy-form-input"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                style={{
                  height: '34px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                  fontSize: '12.5px',
                  outline: 'none',
                  background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
                  color: 'var(--dsw-alias-label-primary, #0f172a)',
                  flex: 1,
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                }}
              >
                至
              </span>
              <input
                type="date"
                className="jy-form-input"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                style={{
                  height: '34px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                  fontSize: '12.5px',
                  outline: 'none',
                  background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
                  color: 'var(--dsw-alias-label-primary, #0f172a)',
                  flex: 1,
                }}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div
          className="jy-drawer-footer"
          style={{
            padding: '18px 24px',
            borderTop: '1px solid var(--dsw-alias-border-l2, #f1f5f9)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            boxSizing: 'border-box',
          }}
        >
          <button
            type="button"
            className="jy-btn-secondary"
            onClick={onClose}
            style={{
              height: '34px',
              padding: '0 16px',
              borderRadius: '8px',
              border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
              background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
              color: 'var(--dsw-alias-label-secondary, #334155)',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            取消
          </button>
          <button
            type="button"
            className="jy-btn-primary"
            onClick={onSave}
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
  );
};
