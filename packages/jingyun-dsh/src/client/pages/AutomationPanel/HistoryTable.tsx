import React from 'react';

import type { HistoryRecord } from './types';

interface HistoryTableProps {
  historyList: HistoryRecord[];
  onClearHistory: () => void;
  onSelectDetail: (record: HistoryRecord) => void;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  historyList,
  onClearHistory,
  onSelectDetail,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <span
          style={{
            fontSize: '12.5px',
            color: 'var(--dsw-alias-label-secondary, #64748b)',
          }}
        >
          共 {historyList.length} 条记录 (最多保留 200 条最新运行记录)
        </span>
        {historyList.length > 0 && (
          <button
            onClick={onClearHistory}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid var(--dsw-alias-border-l2, #e2e8f0)',
              background: 'var(--dsw-alias-bg-layer-2, #ffffff)',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            清空历史
          </button>
        )}
      </div>

      {historyList.length > 0 ? (
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
                  日志与产出详情
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
                      whiteSpace: 'nowrap',
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
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.duration}
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        color:
                          item.status === 'success'
                            ? '#16a34a'
                            : item.status === 'running'
                              ? '#2563eb'
                              : '#dc2626',
                        background:
                          item.status === 'success'
                            ? 'rgba(34, 197, 94, 0.1)'
                            : item.status === 'running'
                              ? 'rgba(37, 99, 235, 0.1)'
                              : 'rgba(239, 68, 68, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 500,
                      }}
                    >
                      {item.status === 'success'
                        ? '成功'
                        : item.status === 'running'
                          ? '执行中'
                          : '失败'}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      color: 'var(--dsw-alias-label-tertiary, #64748b)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '380px',
                        }}
                        title={item.message}
                      >
                        {item.message}
                      </span>
                      {(item.output || item.message) && (
                        <button
                          type="button"
                          onClick={() => onSelectDetail(item)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#2563eb',
                            cursor: 'pointer',
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          查看详情 &gt;
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 0',
            color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
            background: 'var(--dsw-alias-bg-layer-2, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--dsw-alias-border-l2, #e2e8f0)',
            gap: '8px',
          }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 14 14" />
          </svg>
          <span style={{ fontSize: '13px' }}>暂无自动化运行历史记录</span>
        </div>
      )}
    </div>
  );
};

interface DetailModalProps {
  record: HistoryRecord;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  record,
  onClose,
  onToast,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '640px',
          maxHeight: '80vh',
          background: 'var(--dsw-alias-bg-layer-2, #ffffff)',
          borderRadius: '14px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--dsw-alias-border-l2, #f1f5f9)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 600,
              }}
            >
              {record.taskName} - 执行详情
            </h3>
            <span
              style={{
                fontSize: '11px',
                color: record.status === 'success' ? '#16a34a' : '#dc2626',
                background:
                  record.status === 'success'
                    ? 'rgba(34, 197, 94, 0.1)'
                    : 'rgba(239, 68, 68, 0.1)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {record.status === 'success' ? '成功' : '失败'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontSize: '13px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '20px',
              color: 'var(--dsw-alias-label-secondary, #64748b)',
              fontSize: '12px',
            }}
          >
            <span>时间: {record.time}</span>
            <span>耗时: {record.duration}</span>
          </div>
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--dsw-alias-bg-layer-3, #f8fafc)',
              borderRadius: '8px',
              color: 'var(--dsw-alias-label-secondary, #475569)',
            }}
          >
            {record.message}
          </div>
          {record.output && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '12.5px' }}>
                  Agent 生成内容：
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(record.output || '');
                    onToast('📋 内容已复制到剪贴板！');
                  }}
                  style={{
                    fontSize: '11.5px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  复制全文
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'var(--dsw-alias-bg-layer-3, #f1f5f9)',
                  color: 'var(--dsw-alias-label-primary, #0f172a)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  fontSize: '12.5px',
                  lineHeight: '1.6',
                }}
              >
                {record.output}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
