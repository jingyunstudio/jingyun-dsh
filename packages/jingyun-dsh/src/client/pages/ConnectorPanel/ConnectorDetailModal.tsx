import React from 'react';

// 飞书 SVG 图标
export const FeishuLogo = () => (
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

// 企业微信 SVG 图标
export const WechatWorkLogo = () => (
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

// 钉钉 SVG 图标
export const DingtalkLogo = () => (
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
    />
  </svg>
);

// 腾讯 ima SVG 图标
export const ImaLogo = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="48" height="48" rx="12" fill="#00C777" />
    <circle cx="16" cy="22" r="3.5" fill="white" />
    <circle cx="32" cy="22" r="3.5" fill="white" />
    <ellipse cx="24" cy="28" rx="3" ry="2" fill="white" />
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
export const UnbindIcon = () => (
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

export const DEFAULT_LARK_SUGGESTIONS = [
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

export const DEFAULT_WECOM_SUGGESTIONS = [
  {
    text: '帮我整理下最新一周AI资讯，通过企业微信消息发送给我自己',
  },
  {
    text: '根据最近一周我与客户沟通的企业微信邮件和会议，生成给客户的演示文稿',
  },
  {
    text: '根据产品文档内容，生成一份总结摘要的PDF，文档链接是https://doc.weixin.qq.com/XXXXXX',
  },
];

export const DEFAULT_DINGTALK_SUGGESTIONS = [
  {
    text: '帮我整理今日开发进展汇报，发送工作通知给钉钉群【技术研发组】',
  },
  {
    text: '向钉钉发送一条 Markdown 格式的系统构建与发布成功通知',
  },
  {
    text: '把本次会议记录生成摘要并推送到钉钉',
  },
];

export const DEFAULT_IMA_SUGGESTIONS = [
  {
    text: '从我的 ima 知识库中找出去年的竞品调研结论并总结',
  },
  {
    text: '列出我在 ima 知识库中保存的所有知识库空间与文档',
  },
  {
    text: '帮我查询 ima 知识库里关于项目部署与架构设计的笔记',
  },
];

export interface DetailModalProps {
  channel?: 'lark' | 'wecom' | 'dingtalk' | 'ima' | string;
  title: string;
  status?: string;
  authLevel?: 'full' | 'bot_only' | 'disconnected';
  userName?: string;
  appId?: string;
  botId?: string;
  version?: string;
  description?: string;
  suggestions?: Array<{ text: string }>;
  onClose: () => void;
  onDisconnect: () => void;
  onTryIt?: () => void;
  onSendPrompt?: (text: string) => void;
  onAuthorizeUser?: () => void;
  onConfigure?: () => void;
}

// 已启用连接器的通用详情管理弹窗组件
export const ConnectorDetailModal = ({
  channel = 'lark',
  title,
  status,
  authLevel,
  userName,
  version = 'v1.0.0',
  description,
  suggestions,
  onClose,
  onDisconnect,
  onTryIt,
  onSendPrompt,
  onConfigure,
}: DetailModalProps) => {
  const isWecom = channel === 'wecom';
  const isDingtalk = channel === 'dingtalk';
  const isIma = channel === 'ima';
  const isConnected = status ? status === 'connected' : true;

  // 默认描述
  const defaultDesc = isIma
    ? '已打通腾讯 ima 个人知识库与笔记的检索和问答能力，使智能体具备通过内置 Skill 读取、检索及引用用户知识库资料的能力。'
    : isDingtalk
      ? '与钉钉官方工作区生态深度集成，支持浏览器一键授权与官方 CLI（dws）原生驱动，使智能体具备跨群聊、文档、日程与待办协同能力。'
      : isWecom
        ? '与企业微信智能机器人深度集成，支持 WebSocket 长连接实时消息收发与协同，使 AI 具备在企业微信中自动响应消息并执行任务的能力。'
        : '支持通过飞书账号授权，使 AI 具备读取及编辑飞书文档、发送即时聊天消息、配置任务、安排日历等多场景协同能力。';

  // 默认 Prompt 推荐列表
  const promptList =
    suggestions ||
    (isIma
      ? DEFAULT_IMA_SUGGESTIONS
      : isDingtalk
        ? DEFAULT_DINGTALK_SUGGESTIONS
        : isWecom
          ? DEFAULT_WECOM_SUGGESTIONS
          : DEFAULT_LARK_SUGGESTIONS);

  const handleTryItClick = () => {
    if (onTryIt) {
      onTryIt();
    } else if (onSendPrompt && promptList.length > 0) {
      const randomIndex = Math.floor(Math.random() * promptList.length);
      onSendPrompt(promptList[randomIndex]?.text || '');
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
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        backdropFilter: 'blur(4px)',
        animation: 'fade-in 0.15s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="jy-detail-modal"
        style={{
          width: '512px',
          maxHeight: '85vh',
          background: 'var(--dsw-alias-bg-layer-2, #ffffff)',
          borderRadius: '16px',
          border:
            '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
          boxShadow:
            '0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          boxSizing: 'border-box',
          position: 'relative',
          animation: 'slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
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

        {/* 1. Header Area */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            marginBottom: '20px',
          }}
        >
          <div
            className="jy-card-icon-box"
            style={{
              width: '56px',
              height: '56px',
              background: isIma
                ? 'rgba(0, 199, 119, 0.08)'
                : isDingtalk
                  ? 'rgba(0, 127, 255, 0.08)'
                  : isWecom
                    ? 'rgba(24, 117, 240, 0.08)'
                    : 'rgba(51, 112, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: isIma
                ? '1px solid rgba(0, 199, 119, 0.15)'
                : isDingtalk
                  ? '1px solid rgba(0, 127, 255, 0.15)'
                  : isWecom
                    ? '1px solid rgba(24, 117, 240, 0.15)'
                    : '1px solid rgba(51, 112, 255, 0.15)',
              flexShrink: 0,
            }}
          >
            {isIma ? (
              <ImaLogo />
            ) : isDingtalk ? (
              <DingtalkLogo />
            ) : isWecom ? (
              <WechatWorkLogo />
            ) : (
              <FeishuLogo />
            )}
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
              {(() => {
                let badgeText = '';
                let badgeColor = '#16a34a';
                let badgeBg = 'rgba(34, 197, 94, 0.1)';

                if (isDingtalk) {
                  badgeText = isConnected ? '已连接' : '未连接';
                  badgeColor = isConnected ? '#16a34a' : '#ef4444';
                  badgeBg = isConnected
                    ? 'rgba(34, 197, 94, 0.1)'
                    : 'rgba(239, 68, 68, 0.1)';
                } else if (isWecom) {
                  badgeText = isConnected ? '已连接' : '未连接';
                  badgeColor = isConnected ? '#16a34a' : '#ef4444';
                  badgeBg = isConnected
                    ? 'rgba(34, 197, 94, 0.1)'
                    : 'rgba(239, 68, 68, 0.1)';
                } else {
                  // 飞书渠道
                  if (authLevel === 'full' || Boolean(userName)) {
                    badgeText = '已完整授权';
                    badgeColor = '#16a34a';
                    badgeBg = 'rgba(34, 197, 94, 0.1)';
                  } else if (authLevel === 'bot_only' || isConnected) {
                    badgeText = '底座就绪 · 待应用授权';
                    badgeColor = '#d97706';
                    badgeBg = 'rgba(217, 119, 6, 0.1)';
                  } else {
                    badgeText = '连接异常 / 未就绪';
                    badgeColor = '#ef4444';
                    badgeBg = 'rgba(239, 68, 68, 0.1)';
                  }
                }
                return (
                  <span
                    style={{
                      fontSize: '11px',
                      color: badgeColor,
                      background: badgeBg,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontWeight: 500,
                    }}
                  >
                    {badgeText}
                  </span>
                );
              })()}
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
              <span>{version}</span>
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
          {/* 详细说明框 */}
          <div
            className="jy-detail-desc-box"
            style={{
              background:
                'var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-card-hover, #f8fafc))',
              padding: '16px',
              borderRadius: '12px',
              border:
                '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
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
            {description || defaultDesc}
          </div>

          {/* 💡 试试这样用 */}
          {promptList.length > 0 && (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
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
                {promptList.map((item, idx) => (
                  <div
                    key={idx}
                    className="jy-prompt-suggestion-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSendPrompt) {
                        onSendPrompt(item.text);
                      }
                    }}
                    style={{
                      background: 'var(--dsw-alias-bg-layer-3, #f8fafc)',
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
                      border: '1px solid var(--dsw-alias-border-l2, #f1f5f9)',
                      transition: 'all 0.15s ease',
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
          )}
        </div>

        {/* 3. Bottom Action Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            paddingTop: '16px',
            borderTop:
              '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
            marginTop: '20px',
          }}
        >
          <button
            className="jy-btn-secondary"
            onClick={onDisconnect}
            style={{
              height: '34px',
              padding: '0 16px',
              borderRadius: '9999px',
              border:
                '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
              background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
              color: 'var(--dsw-alias-label-primary, #0f172a)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <UnbindIcon />
            解绑
          </button>
          {onConfigure && (
            <button
              className="jy-btn-secondary"
              onClick={onConfigure}
              style={{
                height: '34px',
                padding: '0 16px',
                borderRadius: '9999px',
                border:
                  '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
                background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
                color: 'var(--dsw-alias-label-primary, #0f172a)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              修改配置
            </button>
          )}
          <button
            className="jy-btn-primary"
            onClick={handleTryItClick}
            style={{
              height: '34px',
              padding: '0 20px',
              borderRadius: '9999px',
              border: 'none',
              background: 'var(--dsw-alias-bg-button-primary, #0f172a)',
              color: 'var(--dsw-alias-label-inverse, #ffffff)',
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
