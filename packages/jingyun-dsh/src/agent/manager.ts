import fs from 'fs'
import path from 'path'
import os from 'os'
import { getDshHome } from '../common/paths'

export const baseHome = getDshHome()


export interface SessionAgentsConfig {
  sessions: Record<string, string>
  globalDefault: string
}

export function getSessionAgentsConfig(): SessionAgentsConfig {
  let sessions: Record<string, string> = {}
  let globalDefault = 'none'

  const sessionConfigFile = path.join(baseHome, 'session_agents.json')
  const activeConfigFile = path.join(baseHome, 'active_agent.json')
  const oldSessionConfigFile = path.join(baseHome, 'session_experts.json')
  const oldActiveConfigFile = path.join(baseHome, 'active_expert.json')

  if (fs.existsSync(sessionConfigFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(sessionConfigFile, 'utf8'))
      if (data.sessions) sessions = data.sessions
      if (data.globalDefault) globalDefault = data.globalDefault
    } catch (e) {}
  } else if (fs.existsSync(oldSessionConfigFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(oldSessionConfigFile, 'utf8'))
      if (data.sessions) sessions = data.sessions
      if (data.globalDefault) globalDefault = data.globalDefault
    } catch (e) {}
  }

  if (globalDefault === 'none' || !globalDefault) {
    if (fs.existsSync(activeConfigFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(activeConfigFile, 'utf8'))
        if (data.activeAgentId) globalDefault = data.activeAgentId
      } catch (e) {}
    } else if (fs.existsSync(oldActiveConfigFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(oldActiveConfigFile, 'utf8'))
        if (data.activeExpertId) globalDefault = data.activeExpertId
      } catch (e) {}
    }
  }

  return { sessions, globalDefault }
}

export function saveSessionAgentsConfig(config: SessionAgentsConfig) {
  if (!fs.existsSync(baseHome)) {
    fs.mkdirSync(baseHome, { recursive: true })
  }
  const sessionConfigFile = path.join(baseHome, 'session_agents.json')
  const activeConfigFile = path.join(baseHome, 'active_agent.json')

  fs.writeFileSync(sessionConfigFile, JSON.stringify({
    sessions: config.sessions,
    globalDefault: config.globalDefault,
    updatedAt: new Date().toISOString()
  }, null, 2), 'utf8')

  fs.writeFileSync(activeConfigFile, JSON.stringify({
    activeAgentId: config.globalDefault,
    updatedAt: new Date().toISOString()
  }, null, 2), 'utf8')

  const oldSessionConfigFile = path.join(baseHome, 'session_experts.json')
  const oldActiveConfigFile = path.join(baseHome, 'active_expert.json')
  try {
    fs.writeFileSync(oldSessionConfigFile, JSON.stringify({
      sessions: config.sessions,
      globalDefault: config.globalDefault,
      updatedAt: new Date().toISOString()
    }, null, 2), 'utf8')
    fs.writeFileSync(oldActiveConfigFile, JSON.stringify({
      activeExpertId: config.globalDefault,
      updatedAt: new Date().toISOString()
    }, null, 2), 'utf8')
  } catch (e) {}
}
