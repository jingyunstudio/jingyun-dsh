import { Context } from '@deepseek-ai/cordis'
import fs from 'fs'
import path from 'path'
import { baseHome, getSessionAgentsConfig } from './manager'

interface CachedAgent {
  mtimeMs: number
  content: string
}

const agentCache = new Map<string, CachedAgent>()

export function initSystemPromptHook(ctx: Context) {
  ctx.inject(['systemPrompt'], (sctx: any) => {
    try {
      console.log('[UIBranding] Registering systemPrompt section for session-isolated agents and workspace agents.')
      sctx.systemPrompt.section({
        name: 'jy-agent-loader',
        order: -50,
        text: (context: any) => {
          let agentsPrompt = ''

          const agent = context.agent
          const sessionId = agent?.session?.header?.id
            || agent?.session?.header?.sessionId
            || agent?.session?.sessionId
            || agent?.session?.id
            || context?.sessionId
            || context?.session?.id

          const { sessions, globalDefault } = getSessionAgentsConfig()
          let agentId = 'none'
          if (sessionId && sessions[sessionId]) {
            agentId = sessions[sessionId]
          } else if (globalDefault && globalDefault !== 'none') {
            agentId = globalDefault
          }

          if (agentId && agentId !== 'none') {
            const agentDir = path.join(baseHome, 'agents', agentId)
            const manifestFile = path.join(agentDir, 'manifest.json')

            let agentName = agentId
            let targetAgentName = ''
            let leadAgentName = ''

            if (fs.existsSync(manifestFile)) {
              try {
                const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
                if (m.displayName || m.name) {
                  const val = m.displayName || m.name
                  agentName = typeof val === 'string' ? val : (val.zh || val.en || agentId)
                }
                if (m.agentName) {
                  targetAgentName = m.agentName
                }
                if (m.expertType === 'team' && m.teamInfo?.leadAgent) {
                  leadAgentName = m.teamInfo.leadAgent
                }
              } catch (e) {}
            }

            // 根据配置清单定义的优先级标识符智能定位人设 Markdown 文件路径
            let agentMarkdownPath = ''
            const lookupName = leadAgentName || targetAgentName || agentId
            const kebabId = agentId.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
            const agentsSubDir = path.join(agentDir, 'agents')

            if (fs.existsSync(agentsSubDir)) {
              try {
                const candidates = fs.readdirSync(agentsSubDir).filter(f => f.endsWith('.md'))
                if (candidates.length > 0) {
                  // 1. 优先级一：文件名与 lookupName 一致
                  const nameMatch = candidates.find(f => path.basename(f, '.md') === lookupName)
                  if (nameMatch) {
                    agentMarkdownPath = path.join(agentsSubDir, nameMatch)
                  }
                  
                  // 2. 优先级二：文件名与 kebab-case ID 一致
                  if (!agentMarkdownPath && kebabId !== lookupName) {
                    const kebabMatch = candidates.find(f => path.basename(f, '.md') === kebabId)
                    if (kebabMatch) {
                      agentMarkdownPath = path.join(agentsSubDir, kebabMatch)
                    }
                  }

                  // 3. 优先级三：如果文件夹下仅有一个 md 文件，直接采用它
                  if (!agentMarkdownPath && candidates.length === 1) {
                    agentMarkdownPath = path.join(agentsSubDir, candidates[0])
                  }
                }
              } catch (e) {}
            }

            if (agentMarkdownPath && fs.existsSync(agentMarkdownPath)) {
              try {
                const stat = fs.statSync(agentMarkdownPath)
                const cacheKey = `global:${agentId}`
                const cached = agentCache.get(cacheKey)
                let content = ''
                if (cached && cached.mtimeMs === stat.mtimeMs) {
                  content = cached.content
                } else {
                  content = fs.readFileSync(agentMarkdownPath, 'utf8')
                  agentCache.set(cacheKey, { mtimeMs: stat.mtimeMs, content })
                }
                agentsPrompt += `\n\n<active_agent id="${agentId}" role="${agentName}">
### 【当前激活智能体身份：${agentName}】
**重要身份与交互准则（最高优先级执行）**：
1. **身份代入**：你当前已被指派为专职**【${agentName}】**。在与用户交流、自我介绍或打招呼（如用户说“你好”）时，你必须**直接以【${agentName}】的专业身份、口吻和视角进行回应**，主动介绍你在该领域的擅长项与服务方向，**绝对禁止**套用通用的“我是 AI 开发助手”等机械化默认开场。
2. **专业履职**：严格遵循下方智能体的核心能力、分析思维体系、行业规范和输出标准进行深度解答与专业交付。

--- 【智能体详细设定与指引】 ---
${content}
--------------------------------
</active_agent>\n`
              } catch (e: any) {
                console.warn('[UIBranding] Failed to assemble active agent prompt:', e.message)
              }
            }
          }

          // 2. 扫描并兼容当前工作区项目目录下的 agents/ 文件夹
          const workspacePath = agent?.session?.header?.cwd
          if (workspacePath) {
            const wsAgentsDir = path.resolve(workspacePath, 'agents')
            if (fs.existsSync(wsAgentsDir)) {
              try {
                const files = fs.readdirSync(wsAgentsDir).filter(f => f.endsWith('.md'))
                if (files.length > 0) {
                  agentsPrompt += '\n\n<workspace_custom_agents>\n'
                  for (const file of files) {
                    const filePath = path.join(wsAgentsDir, file)
                    const name = path.basename(file, '.md')
                    try {
                      const stat = fs.statSync(filePath)
                      const cacheKey = `${workspacePath}:${file}`
                      const cached = agentCache.get(cacheKey)
                      let content = ''
                      if (cached && cached.mtimeMs === stat.mtimeMs) {
                        content = cached.content
                      } else {
                        content = fs.readFileSync(filePath, 'utf8')
                        agentCache.set(cacheKey, { mtimeMs: stat.mtimeMs, content })
                      }
                      agentsPrompt += `### Agent: ${name}\n${content}\n\n`
                    } catch {}
                  }
                  agentsPrompt += '</workspace_custom_agents>\n'
                }
              } catch {}
            }
          }

          return agentsPrompt
        }
      })
    } catch (e: any) {
      console.warn('[UIBranding] Failed to register systemPrompt section:', e.message)
    }
  })
}
