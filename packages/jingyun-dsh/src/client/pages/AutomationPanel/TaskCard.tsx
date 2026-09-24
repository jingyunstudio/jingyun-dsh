import React from 'react';

import { AUTOMATION_TEMPLATES, type TemplateItem } from './constants';
import { TemplateCard } from './TemplateCard';
import type { AutoTask } from './types';

interface TaskCardProps {
  task: AutoTask;
  activeMenuTaskId: string | null;
  runningTaskIds: Set<string>;
  onOpenEdit: (task: AutoTask) => void;
  onToggleMenu: (taskId: string | null) => void;
  onToggleEnabled: (taskId: string, currentEnabled: boolean) => void;
  onDelete: (taskId: string) => void;
  onRun: (task: AutoTask) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  activeMenuTaskId,
  runningTaskIds,
  onOpenEdit,
  onToggleMenu,
  onToggleEnabled,
  onDelete,
  onRun,
}) => {
  const isRunning =
    runningTaskIds.has(task.id) || task.lastStatus === 'running';
  const isMenuOpen = activeMenuTaskId === task.id;

  return (
    <div
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
            flexShrink: 0,
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
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
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
              onClick={() => onOpenEdit(task)}
              style={{
                fontSize: '13.5px',
                fontWeight: 600,
                color: 'var(--dsw-alias-label-primary, #0f172a)',
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
                  color: 'var(--dsw-alias-label-tertiary, #64748b)',
                  background: 'var(--dsw-alias-bg-layer-3, #f1f5f9)',
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
            {(task.startDate || task.endDate) &&
              ` · 生效期: ${task.startDate || '不限'} 至 ${task.endDate || '不限'}`}
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
              onToggleMenu(isMenuOpen ? null : task.id);
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
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
              <circle cx="5" cy="12" r="1.5" />
            </svg>
          </button>

          {/* 三点更多操作的 Popover 气泡浮层 */}
          {isMenuOpen && (
            <>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMenu(null);
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
                    onToggleEnabled(task.id, task.enabled);
                    onToggleMenu(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--dsw-alias-label-primary, #334155)',
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
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
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
                        />
                      </svg>
                      启用
                    </>
                  )}
                </div>

                {/* 删除选项 */}
                <div
                  className="jy-auto-menu-item"
                  onClick={() => {
                    onDelete(task.id);
                    onToggleMenu(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--dsw-alias-label-primary, #334155)',
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
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  删除
                </div>
              </div>
            </>
          )}
        </div>

        {/* 立即单次运行 */}
        <button
          title={isRunning ? '正在运行中...' : '立即单次触发运行'}
          disabled={isRunning}
          onClick={() => onRun(task)}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            color: isRunning
              ? '#2563eb'
              : 'var(--dsw-alias-label-secondary, #334155)',
            padding: '4px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s ease',
          }}
        >
          {isRunning ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 12 12"
                  to="360 12 12"
                  dur="0.85s"
                  repeatCount="indefinite"
                />
              </path>
            </svg>
          ) : (
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
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
            </svg>
          )}
        </button>

        {/* 启用 Toggle 滑动 Switch 开关 */}
        <div
          onClick={() => onToggleEnabled(task.id, task.enabled)}
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
              transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

interface EmptyStateProps {
  onCreate: () => void;
  onSelectTemplate: (tpl: TemplateItem) => void;
}

export const TaskEmptyState: React.FC<EmptyStateProps> = ({
  onCreate,
  onSelectTemplate,
}) => {
  return (
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
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
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
        onClick={onCreate}
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
              onClick={() => onSelectTemplate(tpl)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
