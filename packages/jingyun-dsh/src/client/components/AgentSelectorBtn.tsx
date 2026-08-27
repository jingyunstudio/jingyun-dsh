import React from 'react'
import {
  IconChevronDownOutline14,
  Menu
} from '@deepseek-ai/dsh-client-ui-primitives'

// 前端会话与智能体映射的单例内存数据库 (避免路由跳转重新挂载导致状态丢失)
export const sessionAgentMemory: Record<string, string> = {}

export const AgentSelectorBtn = (props: any) => {
  const [open, setOpen] = React.useState(false)
  const [agentList, setAgentList] = React.useState<Array<{ id: string; label: string; detail?: string }>>([
    { id: 'none', label: '智能体 (默认)' }
  ])

  // 从框架 Hook 或 props 响应式获取当前激活的会话 ID
  const currentSessionId = props?.session?.sessionId
    || props?.session?.id
    || props?.sessionId
    || (props?.useSessions ? props.useSessions((s: any) => s?.current) : '')
    || 'default'

  const [currentAgent, setCurrentAgent] = React.useState<string>(() => {
    return sessionAgentMemory[currentSessionId] || 'none'
  })

  const fetchAgents = React.useCallback(async (sessId?: string) => {
    const targetSessId = sessId || currentSessionId
    const param = targetSessId && targetSessId !== 'default' ? `?sessionId=${encodeURIComponent(targetSessId)}` : ''
    const endpoints = [
      `/jy-api/installed-assets${param}`,
      `/api/jingyun/installed-assets${param}`,
      `http://127.0.0.1:3003/api/jingyun/installed-assets${param}`
    ]
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep)
        if (res.ok) {
          const json = await res.json()
          const rawAgents: any[] = json.data?.agentsDetail || []
          const activeId = json.data?.activeAgentId || 'none'
          const allSessionAgents = json.data?.sessionAgents || {}

          // 同步全量会话智能体映射到前端内存
          Object.assign(sessionAgentMemory, allSessionAgents)

          if (rawAgents.length > 0 || json.data?.skillsDetail) {
            const dynamicItems = rawAgents.map((ag: any) => ({
              id: ag.id,
              label: ag.name || ag.id,
              detail: ag.description || ''
            }))
            setAgentList([
              { id: 'none', label: '智能体 (默认)', detail: '通用大模型助理' },
              ...dynamicItems
            ])

            // 优先取该会话已知智能体，避免被覆盖
            const finalAgent = sessionAgentMemory[targetSessId] || activeId || 'none'
            sessionAgentMemory[targetSessId] = finalAgent
            if (targetSessId === currentSessionId) {
              setCurrentAgent(finalAgent)
            }
            break
          }
        }
      } catch (e) { }
    }
  }, [currentSessionId])

  // 每次会话 ID 切换或组件挂载时，立即同步当前会话智能体
  React.useEffect(() => {
    if (sessionAgentMemory[currentSessionId]) {
      setCurrentAgent(sessionAgentMemory[currentSessionId])
    }
    fetchAgents(currentSessionId)
  }, [currentSessionId, fetchAgents])

  // 监听智能体变更全局通知 (支持按会话校验)
  React.useEffect(() => {
    const handleChanged = async (e: any) => {
      const id = e.detail?.agent
      const sessId = e.detail?.sessionId || currentSessionId
      if (e.detail?.sessionId) {
        sessionAgentMemory[e.detail.sessionId] = id
      }
      if (e.detail?.sessionId && currentSessionId && e.detail.sessionId !== currentSessionId) {
        return
      }
      if (id) {
        setCurrentAgent(id)
        // 外部通知触发时，同步通知后端激活状态，实现前后端状态绝对一致
        try {
          await fetch('/api/jingyun/agent/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: id, sessionId: sessId })
          })
        } catch (err) { }
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('jy_agent_changed', handleChanged)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('jy_agent_changed', handleChanged)
      }
    }
  }, [currentSessionId])

  const currentLabel = agentList.find(e => e.id === currentAgent)?.label || '智能体'

  const handleSelect = async (id: string) => {
    sessionAgentMemory[currentSessionId] = id
    setCurrentAgent(id)
    setOpen(false)
    try {
      await fetch('/api/jingyun/agent/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: id, sessionId: currentSessionId })
      })
    } catch (e) { }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jy_agent_changed', {
        detail: { agent: id, sessionId: currentSessionId }
      }))
    }
  }

  const items = agentList.map(e => ({
    id: e.id,
    label: e.label,
    description: e.detail
  }))

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      <Menu
        open={open}
        items={items}
        selectedId={currentAgent}
        onSelect={handleSelect}
        onClose={() => setOpen(false)}
        side="top"
        align="start"
        portal
        anchor={(
          <button
            type="button"
            onClick={() => {
              if (agentList.length <= 1) fetchAgents(currentSessionId)
              setOpen(!open)
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              minWidth: 0,
              maxWidth: '220px',
              height: '28px',
              padding: '0 6px 0 8px',
              border: 'none',
              borderRadius: '24px',
              outline: 'none',
              background: open ? 'var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.06))' : 'transparent',
              color: 'var(--dsw-alias-label-secondary, #64748b)',
              fontSize: '13px',
              lineHeight: '20px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={e => {
              if (!open) e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.05))'
            }}
            onMouseLeave={e => {
              if (!open) e.currentTarget.style.background = 'transparent'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, opacity: 0.85 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </span>
            <span style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {currentLabel}
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              flexShrink: 0,
              color: 'var(--dsw-alias-label-caption, #94a3b8)',
              transition: 'transform 120ms ease',
              transform: open ? 'rotate(180deg)' : 'none'
            }}>
              <IconChevronDownOutline14 />
            </span>
          </button>
        )}
      />
    </div>
  )
}
