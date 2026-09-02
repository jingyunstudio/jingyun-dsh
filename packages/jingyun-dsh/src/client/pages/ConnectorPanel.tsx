import { QRCodeSVG } from 'qrcode.react';
import React, { useState, useEffect, useRef } from 'react';

import { WecomDetailModal } from './WecomModal';

interface Connector {
  id: string;
  name: string;
  logo: React.ReactNode;
  description: string;
  comingSoon?: boolean;
}

// 飞书 SVG 图标
const FeishuLogo = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M24 4C12.95 4 4 12.95 4 24C4 35.05 12.95 44 24 44C35.05 44 44 35.05 44 24C44 12.95 35.05 4 24 4ZM28.59 29.83L24 34.42L19.41 29.83C15.82 26.24 15.82 20.41 19.41 16.82C23 13.23 28.83 13.23 32.42 16.82C36.01 20.41 36.01 26.24 32.42 29.83H28.59ZM24 24C25.1 24 26 23.1 26 22C26 20.9 25.1 20 24 20C22.9 20 22 20.9 22 22C22 23.1 22.9 24 24 24Z"
      fill="#3370FF"
    />
  </svg>
);

// 去试试图标 (气泡)
const TryItIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ marginRight: '4px' }}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

// 解绑图标 (断开/重置)
const UnbindIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ marginRight: '4px' }}
  >
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
    <line x1="12" y1="2" x2="12" y2="12"></line>
  </svg>
);

// 💡 试试这样用 灯泡图标
const LightbulbIcon = () => (
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
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
    <line x1="9" y1="18" x2="15" y2="18"></line>
    <line x1="10" y1="22" x2="14" y2="22"></line>
  </svg>
);

// 对话气泡发送图标
const SendIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ opacity: 0.6, flexShrink: 0 }}
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);

const PROMPT_SUGGESTIONS = [
  {
    text: '在飞书群【产品周会】里用机器人发一条通知：今天 15:00 在 3 楼会议室开周会，请带上周的进展材料',
  },
  {
    text: '查下周我和张三、李四的飞书日程，找出三人都空闲的 2 小时时段，并创建一个标题为【Q2 规划对齐】的日程，邀请他们俩，预定一间会议室',
  },
  {
    text: '在飞书多维表格【任务跟踪】里新增一行：标题=Q2 上线评审、负责人=张三、截止=2026-05-20、状态=进行中；并按负责人聚合未完成任务数',
  },
];

// 钉钉 SVG 图标
const DingtalkLogo = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M24 4C12.95 4 4 12.95 4 24C4 35.05 12.95 44 24 44C35.05 44 44 35.05 44 24C44 12.95 35.05 4 24 4ZM31.95 19.48C30.93 23.63 26.35 29.02 20.17 31.79C19.34 32.16 18.52 31.42 18.78 30.56C19.78 27.27 21.6 23.27 22.58 19.72C22.75 19.11 22.37 18.54 21.75 18.66C18.64 19.26 14.88 20.69 11.95 22.25C11.39 22.55 10.74 21.99 11.08 21.46C13.88 17.15 19.26 11.59 25.96 9.43C26.78 9.16 27.53 9.94 27.23 10.76C26.06 13.98 24.32 18.12 23.41 21.43C23.24 22.04 23.63 22.61 24.25 22.49C27.35 21.89 31.11 20.46 34.04 18.9C34.6 18.6 35.25 19.16 34.91 19.69C34.25 20.7 33.15 22.25 31.95 19.48Z"
      fill="#007FFF"
      fillOpacity="0.6"
    />
  </svg>
);

// 企业微信 SVG 图标
const WechatWorkLogo = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M24 4C12.95 4 4 12.95 4 24C4 35.05 12.95 44 24 44C35.05 44 44 35.05 44 24C44 12.95 35.05 4 24 4ZM28.5 28.5C28.5 29.33 27.83 30 27 30H21C20.17 30 19.5 29.33 19.5 28.5V25.5H16.5C15.67 25.5 15 24.83 15 24C15 23.17 15.67 22.5 16.5 22.5H19.5V19.5C19.5 18.67 20.17 18 21 18H27C27.83 18 28.5 18.67 28.5 19.5V22.5H31.5C32.33 22.5 33 23.17 33 24C33 24.83 32.33 25.5 31.5 25.5H28.5V28.5Z"
      fill="#1875F0"
      fillOpacity="0.6"
    />
  </svg>
);

export const ConnectorPanel = () => {
  const [larkStatus, setLarkStatus] = useState<any>(null);
  const [wecomStatus, setWecomStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showWecomModal, setShowWecomModal] = useState(false);
  const [showWecomDetailModal, setShowWecomDetailModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const handleNewChatWithPrompt = (promptText: string) => {
    try {
      // 1. 尝试寻找并点击宿主 DSH 系统的“新建会话”按钮
      const newChatBtn: any =
        document.querySelector('button[aria-label="新建会话"]') ||
        Array.from(document.querySelectorAll('button')).find((el) =>
          el.textContent?.includes('新建任务')
        );
      if (newChatBtn) {
        newChatBtn.click();
      }

      // 2. 切换哈希回默认主页 (#/ 或空)，让连接器面板退场
      window.location.hash = '#/';

      // 3. 延迟一小会儿，等聊天 DOM 载入完成，强行写入 React 受控输入框并聚焦
      setTimeout(() => {
        const textarea: any =
          document.querySelector('textarea[placeholder="给智能体发消息"]') ||
          document.querySelector('textarea.uV2eYG_input') ||
          document.querySelector('textarea');
        if (textarea) {
          const setter = Object.getOwnPropertyDescriptor(
            HTMLTextAreaElement.prototype,
            'value'
          )?.set;
          setter?.call(textarea, promptText);
          textarea.dispatchEvent(new Event('input', { bubbles: true }));

          setTimeout(() => {
            textarea.focus();
          }, 50);
        }
      }, 200);

      // 4. 关闭已启用的管理详情弹窗
      setShowDetailModal(false);
    } catch (e) {
      console.error(
        '[ConnectorPanel] Failed to route new chat with prompt:',
        e
      );
    }
  };

  const handleSendPrompt = (text: string) => {
    handleNewChatWithPrompt(text);
  };

  const handleTryIt = () => {
    // 随机选择一个推荐提示词进行填充，带入新会话中
    const randomIndex = Math.floor(Math.random() * PROMPT_SUGGESTIONS.length);
    const randomPrompt = PROMPT_SUGGESTIONS[randomIndex]?.text || '';
    handleNewChatWithPrompt(randomPrompt);
  };

  // 获取飞书连接状态
  const fetchLarkStatus = async () => {
    try {
      const res = await fetch('/api/jingyun/connectors/lark/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setLarkStatus(json.data);
        }
      }
    } catch (err) {
      console.error('[ConnectorPanel] Failed to fetch lark status:', err);
    } finally {
      setLoading(false);
    }
  };

  // 登出飞书
  const handleDisconnect = async () => {
    if (
      !confirm('确定要断开飞书的连接吗？断开后相关的飞书智能体能力将无法使用。')
    )
      return;
    setLoading(true);
    try {
      const res = await fetch('/api/jingyun/connectors/lark/auth-logout', {
        method: 'POST',
      });
      if (res.ok) {
        await fetchLarkStatus();
      }
    } catch (err) {
      console.error('[ConnectorPanel] Failed to disconnect lark:', err);
      setLoading(false);
    }
  };
  // 获取企业微信连接状态
  const fetchWecomStatus = async () => {
    try {
      const res = await fetch('/api/jingyun/connectors/wecom/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setWecomStatus(json.data);
        }
      }
    } catch (err) {
      console.error('[ConnectorPanel] Failed to fetch wecom status:', err);
    }
  };

  // 断开企业微信
  const handleWecomDisconnect = async () => {
    if (
      !confirm(
        '确定要断开企业微信的连接吗？断开后相关的企业微信智能体能力将无法使用。'
      )
    )
      return;
    try {
      const res = await fetch('/api/jingyun/connectors/wecom/disconnect', {
        method: 'POST',
      });
      if (res.ok) {
        await fetchWecomStatus();
      }
    } catch (err) {
      console.error('[ConnectorPanel] Failed to disconnect wecom:', err);
    }
  };

  useEffect(() => {
    fetchLarkStatus();
    fetchWecomStatus();
  }, []);

  const isLarkConnected =
    larkStatus && larkStatus.identities?.user?.status === 'ready';
  const larkUser = larkStatus?.identities?.user?.userName || '';
  const larkAppId = larkStatus?.appId || '';

  const isWecomConnected =
    wecomStatus?.hasConfig === true || wecomStatus?.status === 'connected';
  const wecomBotName = wecomStatus?.botName || '企业微信智能机器人';
  const wecomBotId = wecomStatus?.botId || wecomStatus?.config?.botId || '';

  return (
    <div
      style={{
        width: '100%',
        padding: '24px 32px',
        boxSizing: 'border-box',
        background: 'var(--dsw-alias-bg-main, #ffffff)',
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--dsw-alias-bg-button-primary, #0f172a)',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            animation: 'fade-in 0.2s ease',
          }}
        >
          {toastMsg}
        </div>
      )}
      {/* 头部标题描述 */}
      <div style={{ marginBottom: '28px' }}>
        <h2
          style={{
            margin: '0 0 6px 0',
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--dsw-alias-label-primary, #0f172a)',
          }}
        >
          连接器
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: 'var(--dsw-alias-label-tertiary, #64748b)',
            lineHeight: '1.6',
          }}
        >
          配置并绑定第三方协同办公与即时通讯渠道。绑定后，智能体将能够直接在这些渠道中与您互动，执行命令或推送通知。
        </p>
      </div>

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 0',
            color: 'var(--dsw-alias-label-tertiary, #64748b)',
            fontSize: '14px',
          }}
        >
          正在获取连接器状态...
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '16px',
            width: '100%',
          }}
        >
          {/* 飞书连接器行 */}
          <div
            onClick={() => {
              if (isLarkConnected) {
                setShowDetailModal(true);
              } else {
                setShowAuthModal(true);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '14px 18px',
              borderRadius: '12px',
              border: '1px solid var(--dsw-alias-border, #e2e8f0)',
              background: 'var(--dsw-alias-bg-card, #ffffff)',
              boxSizing: 'border-box',
              cursor: 'pointer',
              height: '80px',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor =
                'var(--dsw-alias-label-tertiary, #cbd5e1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor =
                'var(--dsw-alias-border, #e2e8f0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
            }}
          >
            {/* 1. Logo 容器 (对齐图 1 h-10 w-10 灰底圆角框) */}
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'var(--dsw-alias-bg-card-hover, #f8fafc)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--dsw-alias-border, #e2e8f0)',
                flexShrink: 0,
              }}
            >
              <FeishuLogo />
            </div>

            {/* 2. 中间描述信息 (标题 & 单行描述) */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
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
                  飞书 (Lark)
                </h3>

                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--dsw-alias-label-tertiary, #64748b)',
                    background: 'var(--dsw-alias-bg-card-hover, #f1f5f9)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}
                >
                  官方
                </span>

                {isLarkConnected && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: '#16a34a',
                      background: 'rgba(34, 197, 94, 0.1)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: '#22c55e',
                      }}
                    />
                    已启用
                  </span>
                )}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '11.5px',
                  color: 'var(--dsw-alias-label-secondary, #64748b)',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
                title="支持通过飞书账号授权，使 AI 具备读取及编辑飞书文档、发送即时聊天消息、配置任务、安排日历等多场景协同能力。"
              >
                支持通过飞书账号授权，使 AI
                具备读取及编辑飞书文档、发送即时聊天消息、配置任务、安排日历等多场景协同能力。
              </p>
            </div>

            {/* 3. 右侧 Action (胶囊按钮) */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ flexShrink: 0, marginLeft: '4px' }}
            >
              {isLarkConnected ? (
                <button
                  onClick={() => setShowDetailModal(true)}
                  style={{
                    height: '28px',
                    padding: '0 14px',
                    borderRadius: '9999px',
                    border: '1px solid var(--dsw-alias-border, #e2e8f0)',
                    background: '#ffffff',
                    color: 'var(--dsw-alias-label-primary, #0f172a)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  管理
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  style={{
                    height: '28px',
                    padding: '0 14px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: 'var(--dsw-alias-bg-button-primary, #0f172a)',
                    color: '#ffffff',
                    fontSize: '12px',
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
                  ＋ 连接
                </button>
              )}
            </div>
          </div>

          {/* 钉钉列表行 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '14px 18px',
              borderRadius: '12px',
              border: '1px solid var(--dsw-alias-border, #e2e8f0)',
              background: 'var(--dsw-alias-bg-card, #ffffff)',
              boxSizing: 'border-box',
              height: '80px',
              opacity: 0.65,
              cursor: 'not-allowed',
            }}
          >
            {/* Logo */}
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'var(--dsw-alias-bg-card-hover, #f8fafc)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--dsw-alias-border, #e2e8f0)',
                flexShrink: 0,
              }}
            >
              <DingtalkLogo />
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
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--dsw-alias-label-primary, #0f172a)',
                  }}
                >
                  钉钉 (DingTalk)
                </h3>

                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--dsw-alias-label-tertiary, #64748b)',
                    background: 'var(--dsw-alias-bg-card-hover, #f1f5f9)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}
                >
                  即将上线
                </span>
              </div>
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
                通过钉钉官方接口，支持智能体介入群组对话、创建待办事项及跨组织表格同步。
              </p>
            </div>

            {/* Action */}
            <div style={{ flexShrink: 0, marginLeft: '4px' }}>
              <button
                disabled
                style={{
                  height: '28px',
                  padding: '0 14px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: 'var(--dsw-alias-border, #e2e8f0)',
                  color: 'var(--dsw-alias-label-tertiary, #64748b)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'not-allowed',
                }}
              >
                未开放
              </button>
            </div>
          </div>

          <div
            onClick={() => {
              if (isWecomConnected) {
                setShowWecomDetailModal(true);
              } else {
                setShowWecomModal(true);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '14px 18px',
              borderRadius: '12px',
              border: '1px solid var(--dsw-alias-border, #e2e8f0)',
              background: 'var(--dsw-alias-bg-card, #ffffff)',
              boxSizing: 'border-box',
              height: '80px',
              cursor: 'pointer',
              transition: 'border-color 0.2s, background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor =
                'var(--dsw-alias-border-hover, #cbd5e1)';
              e.currentTarget.style.background =
                'var(--dsw-alias-bg-card-hover, #f8fafc)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor =
                'var(--dsw-alias-border, #e2e8f0)';
              e.currentTarget.style.background =
                'var(--dsw-alias-bg-card, #ffffff)';
            }}
          >
            {/* Logo */}
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'var(--dsw-alias-bg-card-hover, #f8fafc)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--dsw-alias-border, #e2e8f0)',
                flexShrink: 0,
              }}
            >
              <WechatWorkLogo />
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
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--dsw-alias-label-primary, #0f172a)',
                  }}
                >
                  企业微信
                </h3>

                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--dsw-alias-label-tertiary, #64748b)',
                    background: 'var(--dsw-alias-bg-card-hover, #f1f5f9)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}
                >
                  官方
                </span>

                {isWecomConnected && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: '#16a34a',
                      background: 'rgba(34, 197, 94, 0.1)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: '#22c55e',
                      }}
                    />
                    已启用
                  </span>
                )}
              </div>
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
                与企业微信智能机器人深度集成，支持 WebSocket
                长连接实时消息收发与协同。
              </p>
            </div>

            {/* Action */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ flexShrink: 0, marginLeft: '4px' }}
            >
              {isWecomConnected ? (
                <button
                  onClick={() => setShowWecomDetailModal(true)}
                  style={{
                    height: '28px',
                    padding: '0 14px',
                    borderRadius: '9999px',
                    border: '1px solid var(--dsw-alias-border, #e2e8f0)',
                    background: 'var(--dsw-alias-bg-card, #ffffff)',
                    color: 'var(--dsw-alias-label-primary, #0f172a)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  管理
                </button>
              ) : (
                <button
                  onClick={() => setShowWecomModal(true)}
                  style={{
                    height: '28px',
                    padding: '0 14px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: 'var(--dsw-alias-bg-button-primary, #0f172a)',
                    color: 'var(--dsw-alias-label-inverse, #ffffff)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  连接
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 企业微信授权扫码弹窗 (完全复用飞书 ConnectorAuthModal 组件) */}
      {showWecomModal && (
        <ConnectorAuthModal
          channel="wecom"
          title="企业微信授权连接"
          onClose={() => setShowWecomModal(false)}
          onSuccess={() => {
            setShowWecomModal(false);
            fetchWecomStatus();
          }}
        />
      )}

      {/* 企业微信管理详情弹窗 */}
      {showWecomDetailModal && (
        <WecomDetailModal
          botId={wecomBotId}
          status={wecomStatus?.status || 'connected'}
          onClose={() => setShowWecomDetailModal(false)}
          onDisconnect={() => {
            setShowWecomDetailModal(false);
            handleWecomDisconnect();
          }}
        />
      )}
      {/* 飞书授权扫码弹窗 */}
      {showAuthModal && (
        <ConnectorAuthModal
          channel="lark"
          title="飞书授权连接"
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            fetchLarkStatus();
          }}
        />
      )}

      {/* 飞书管理详情弹窗 (仿图 2 技能市场弹窗) */}
      {showDetailModal && (
        <ConnectorDetailModal
          channel="lark"
          title="飞书 (Lark)"
          userName={larkUser}
          appId={larkAppId}
          onClose={() => setShowDetailModal(false)}
          onDisconnect={() => {
            setShowDetailModal(false);
            handleDisconnect();
          }}
          onTryIt={() => {
            handleTryIt();
          }}
          onSendPrompt={(text) => {
            handleSendPrompt(text);
          }}
        />
      )}
    </div>
  );
};

interface DetailModalProps {
  channel: string;
  title: string;
  userName: string;
  appId: string;
  onClose: () => void;
  onDisconnect: () => void;
  onTryIt: () => void;
  onSendPrompt: (text: string) => void;
}

// 已启用连接器的详情管理弹窗 (仿图 2 UI)
const ConnectorDetailModal = ({
  channel,
  title,
  userName,
  appId,
  onClose,
  onDisconnect,
  onTryIt,
  onSendPrompt,
}: DetailModalProps) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        backdropFilter: 'blur(4px)',
        animation: 'fade-in 0.15s ease',
      }}
    >
      <div
        style={{
          width: '512px',
          maxHeight: '85vh',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid var(--dsw-alias-border, #e2e8f0)',
          boxShadow:
            '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          boxSizing: 'border-box',
          position: 'relative',
          animation: 'slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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

        {/* 1. Header Area (对齐图 2) */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'rgba(51, 112, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(51, 112, 255, 0.1)',
              flexShrink: 0,
            }}
          >
            <FeishuLogo />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              minWidth: 0,
              flex: 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--dsw-alias-label-primary, #0f172a)',
                }}
              >
                {title}
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  color: '#16a34a',
                  background: 'rgba(34, 197, 94, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontWeight: 500,
                }}
              >
                已连接到底座
              </span>
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--dsw-alias-label-tertiary, #64748b)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>by Jingyun.Studio</span>
              <span>•</span>
              <span>v1.0.0</span>
              <span>•</span>
              <span style={{ textTransform: 'capitalize' }}>connector</span>
            </div>
          </div>
        </div>

        {/* 2. Scrollable Body Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            paddingRight: '2px',
          }}
        >
          {/* 详细说明框 (bg-muted/40) */}
          <div
            style={{
              background: 'var(--dsw-alias-bg-card-hover, #f8fafc)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--dsw-alias-border, #e2e8f0)',
              fontSize: '13px',
              color: 'var(--dsw-alias-label-secondary, #475569)',
              lineHeight: '1.6',
            }}
          >
            <div
              style={{
                marginBottom: '8px',
                fontWeight: 600,
                color: 'var(--dsw-alias-label-primary, #0f172a)',
              }}
            >
              功能说明：
            </div>
            支持通过飞书账号授权，使 AI
            具备读取及编辑飞书文档、发送即时聊天消息、配置任务、安排日历等多场景协同能力。
            <div
              style={{
                borderTop: '1px dashed var(--dsw-alias-border, #e2e8f0)',
                marginTop: '12px',
                paddingTop: '12px',
                fontSize: '11.5px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div>
                授权账号：
                <strong
                  style={{ color: 'var(--dsw-alias-label-primary, #0f172a)' }}
                >
                  {userName}
                </strong>
              </div>
              <div>
                应用 AppID：
                <span style={{ fontFamily: 'monospace' }}>{appId}</span>
              </div>
            </div>
          </div>

          {/* 💡 试试这样用 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--dsw-alias-label-secondary, #334155)',
              }}
            >
              <LightbulbIcon />
              试试这样用
            </div>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              {PROMPT_SUGGESTIONS.map((item, idx) => (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendPrompt(item.text);
                  }}
                  style={{
                    background: '#f8fafc',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: 'var(--dsw-alias-label-secondary, #475569)',
                    lineHeight: '1.4',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    border: '1px solid #f1f5f9',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#f1f5f9';
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                    title={item.text}
                  >
                    {item.text}
                  </span>
                  <SendIcon />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Bottom Action Footer (对齐图 2) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            paddingTop: '16px',
            borderTop: '1px solid var(--dsw-alias-border, #e2e8f0)',
            marginTop: '20px',
          }}
        >
          <button
            onClick={onDisconnect}
            style={{
              height: '34px',
              padding: '0 16px',
              borderRadius: '9999px',
              border: '1px solid var(--dsw-alias-border, #e2e8f0)',
              background: '#ffffff',
              color: 'var(--dsw-alias-label-primary, #0f172a)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            <UnbindIcon />
            解绑
          </button>
          <button
            onClick={onTryIt}
            style={{
              height: '34px',
              padding: '0 20px',
              borderRadius: '9999px',
              border: 'none',
              background: 'var(--dsw-alias-bg-button-primary, #0f172a)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
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
            <TryItIcon />
            去试试
          </button>
        </div>
      </div>
    </div>
  );
};

interface AuthModalProps {
  channel: string;
  title: string;
  onClose: () => void;
  onSuccess: () => void;
}

// 扫码授权弹窗组件
const ConnectorAuthModal = ({
  channel,
  title,
  onClose,
  onSuccess,
}: AuthModalProps) => {
  const [loading, setLoading] = useState(true);
  const [authData, setAuthData] = useState<{
    verification_url: string;
    device_code: string;
    mode?: string;
  } | null>(null);
  const [authMode, setAuthMode] = useState<'init' | 'login'>('login');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const intervalRef = useRef<any>(null);

  // 1. 开始授权流程，获取设备码与验证链接
  const startAuth = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      if (channel === 'wecom') {
        const res = await fetch('/api/jingyun/connectors/wecom/qr-start');
        if (res.ok) {
          const json = await res.json();
          const qrData = json?.data || json;
          if (qrData && qrData.authUrl && qrData.scode) {
            setAuthData({
              verification_url: qrData.authUrl,
              device_code: qrData.scode,
              mode: 'wecom',
            });
            setAuthMode('login');
            startPolling(qrData.scode);
          } else {
            setErrorMessage(json?.error || '无法获取企业微信授权数据');
          }
        } else {
          setErrorMessage('获取企业微信授权二维码失败');
        }
        return;
      }

      const res = await fetch(`/api/jingyun/connectors/${channel}/auth-start`, {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setAuthData(json.data);
          setAuthMode(json.data.mode || 'login');
          startPolling(json.data.device_code);
        } else {
          setErrorMessage(json.error || '无法初始化授权链接');
        }
      } else {
        setErrorMessage('服务器请求失败，请确保本地 DSH 后端正常运行');
      }
    } catch (err: any) {
      setErrorMessage(err.message || '网络连接失败');
    } finally {
      setLoading(false);
    }
  };

  // 2. 双轨制：长连接等待写入 + 只读状态轮询检测
  const startPolling = (deviceCode: string) => {
    let active = true;
    let statusInterval: any = null;
    // 轨道 A：轮询检查（飞书长轮询 / 企业微信查询接口）
    const runPoll = async () => {
      if (!active) return;
      try {
        if (channel === 'wecom') {
          const res = await fetch(
            `/api/jingyun/connectors/wecom/query-result?scode=${encodeURIComponent(deviceCode)}`
          );
          if (res.ok && active) {
            const json = await res.json();
            const data = json?.data || {};
            if (data.status === 'success' && data.bot_info) {
              // 自动发起 connect 长连接建连
              await fetch('/api/jingyun/connectors/wecom/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  botId: data.bot_info.botid,
                  botSecret: data.bot_info.secret,
                }),
              }).catch((e) =>
                console.warn('[ConnectorAuthModal] Wecom connect error:', e)
              );
              triggerSuccess();
              return;
            }
          }
          if (active) {
            setTimeout(runPoll, 2000);
          }
          return;
        }

        const res = await fetch(
          `/api/jingyun/connectors/${channel}/auth-poll`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_code: deviceCode }),
          }
        );
        if (res.ok && active) {
          const json = await res.json();
          if (json.success) {
            if (json.mode === 'init_done') {
              console.log(
                '[ConnectorAuthModal] Phase 1 config init finished. Re-starting auth to get Phase 2 QR code...'
              );
              active = false;
              if (statusInterval) clearInterval(statusInterval);

              setAuthMode('login');
              setLoading(true);
              setAuthData(null);

              setTimeout(() => {
                startAuth();
              }, 1500);
            } else {
              triggerSuccess();
            }
          } else {
            if (active) {
              setTimeout(runPoll, 2000);
            }
          }
        }
      } catch (err) {
        console.warn('[ConnectorAuthModal] Poll verification failed:', err);
        if (active) {
          setTimeout(runPoll, 3000);
        }
      }
    };

    // 轨道 B：只读状态极速检测（每2秒）
    const checkStatus = async () => {
      if (!active) return;
      try {
        const res = await fetch(`/api/jingyun/connectors/${channel}/status`);
        if (res.ok && active) {
          const json = await res.json();
          if (json.success && json.data) {
            if (channel === 'wecom') {
              if (json.data.status === 'connected' || json.data.hasConfig) {
                triggerSuccess();
              }
            } else {
              const status = json.data.identities?.user?.status;
              if (status === 'ready') {
                triggerSuccess();
              }
            }
          }
        }
      } catch (err) {
        console.warn('[ConnectorAuthModal] Status check failed:', err);
      }
    };

    const triggerSuccess = () => {
      if (!active) return;
      active = false;
      if (statusInterval) clearInterval(statusInterval);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    };

    // 启动两条轨道
    runPoll();
    statusInterval = setInterval(checkStatus, 2000);

    intervalRef.current = {
      close: () => {
        active = false;
        if (statusInterval) clearInterval(statusInterval);
      },
    };
  };
  useEffect(() => {
    startAuth();
    return () => {
      if (
        intervalRef.current &&
        typeof intervalRef.current.close === 'function'
      ) {
        intervalRef.current.close();
      }
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: '380px',
          background: 'var(--dsw-alias-bg-card, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--dsw-alias-border, #e2e8f0)',
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          padding: '28px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isSuccess ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 0',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
                marginBottom: '18px',
                boxShadow: '0 4px 10px rgba(34, 197, 94, 0.15)',
              }}
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h4
              style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: 600,
                color: '#16a34a',
              }}
            >
              授权连接成功！
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: 'var(--dsw-alias-label-tertiary, #64748b)',
              }}
            >
              已安全绑定至您的飞书账号。
            </p>
          </div>
        ) : (
          <>
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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

            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--dsw-alias-label-primary, #0f172a)',
              }}
            >
              {title}
            </h3>
            <p
              style={{
                margin: '0 0 20px 0',
                fontSize: '12px',
                color:
                  authMode === 'init'
                    ? '#d97706'
                    : 'var(--dsw-alias-label-tertiary, #64748b)',
                textAlign: 'center',
                lineHeight: '1.4',
                fontWeight: authMode === 'init' ? 500 : 'normal',
              }}
            >
              {channel === 'wecom' ? (
                <>
                  请使用手机企业微信扫描下方二维码完成授权，
                  <br />
                  授权后智能体即可介入您的企业微信会话。
                </>
              ) : authMode === 'init' ? (
                <>
                  <strong
                    style={{
                      display: 'block',
                      color: '#d97706',
                      marginBottom: '6px',
                      fontSize: '13px',
                    }}
                  >
                    第一步：选择应用
                  </strong>
                  检测到本地尚未配置飞书。请扫码或打开下方配置网址，
                  <br />
                  在浏览器中新建或选择您的飞书应用完成绑定。
                </>
              ) : (
                <>
                  <strong
                    style={{
                      display: 'block',
                      color: '#16a34a',
                      marginBottom: '6px',
                      fontSize: '13px',
                    }}
                  >
                    第二步：应用授权
                  </strong>
                  请继续使用手机飞书扫描下方二维码进行登录，
                  <br />
                  或者在电脑浏览器里打开配置网址完成授权。
                </>
              )}
            </p>

            {loading ? (
              <div
                style={{
                  width: '200px',
                  height: '200px',
                  border: '1px solid var(--dsw-alias-border, #e2e8f0)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: 'var(--dsw-alias-label-tertiary, #64748b)',
                }}
              >
                正在获取二维码...
              </div>
            ) : errorMessage ? (
              <div
                style={{
                  width: '200px',
                  height: '200px',
                  border: '1px solid #fee2e2',
                  borderRadius: '12px',
                  padding: '16px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  background: '#fef2f2',
                  color: '#ef4444',
                  fontSize: '12px',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ marginBottom: '8px' }}
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div>{errorMessage}</div>
                <button
                  onClick={startAuth}
                  style={{
                    marginTop: '12px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  重试
                </button>
              </div>
            ) : authData ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                {/* 二维码图片容器 */}
                <div
                  style={{
                    padding: '12px',
                    border: '1px solid var(--dsw-alias-border, #e2e8f0)',
                    borderRadius: '12px',
                    background: '#ffffff',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <QRCodeSVG
                    value={authData.verification_url}
                    size={180}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
              </div>
            ) : null}

            <div
              style={{
                marginTop: '24px',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              <button
                onClick={onClose}
                style={{
                  padding: '6px 20px',
                  borderRadius: '6px',
                  border: '1px solid var(--dsw-alias-border, #e2e8f0)',
                  background: 'transparent',
                  color: 'var(--dsw-alias-label-secondary, #475569)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    'var(--dsw-alias-bg-card, #f8fafc)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                关闭
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
