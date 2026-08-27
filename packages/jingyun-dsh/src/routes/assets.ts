import { Context } from '@deepseek-ai/cordis'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import { sendJson, sendError } from '../common/http'
import { moveToRecycleBin, extractZipSafe } from '../common/fs'
import { getSessionAgentsConfig, baseHome } from '../agent/manager'

const execAsync = promisify(exec)

function copyFolderRecursiveSync(src: string, dest: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyFolderRecursiveSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

export function registerAssetsRoutes(ctx: Context) {
  // 1. 扫描物理资产列表 (skills, agents, plugins, rules)
  const installedAssetsHandler = async (req: any, res: any) => {
    try {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      const skillsDir = path.join(baseHome, 'skills')
      const agentsDir = path.join(baseHome, 'agents')
      const pluginsDir = path.join(baseHome, 'plugins')
      const rulesDir = path.join(baseHome, 'rules')

      // 1.1 扫描技能
      const installedSkills: string[] = []
      const skillsDetail: Array<{
        id: string
        name: string
        description: string
        source?: string
        author?: string
        mtime?: number
        path?: string
      }> = []

      if (fs.existsSync(skillsDir)) {
        fs.readdirSync(skillsDir).forEach(name => {
          const p = path.join(skillsDir, name)
          if (fs.statSync(p).isDirectory()) {
            installedSkills.push(name)
            const stat = fs.statSync(p)
            let skillName = name
            let desc = ''
            let source = 'marketplace'
            let author = 'official'

            const manifestFile = path.join(p, 'manifest.json')
            const metaFile = path.join(p, '_meta.json')
            if (fs.existsSync(manifestFile)) {
              try {
                const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
                if (m.displayName || m.name) skillName = m.displayName || m.name
                if (m.description || m.summary) desc = m.description || m.summary
                if (m.source) source = m.source
                if (m.author) author = m.author
              } catch (e) {}
            } else if (fs.existsSync(metaFile)) {
              try {
                const m = JSON.parse(fs.readFileSync(metaFile, 'utf8'))
                if (m.displayName || m.name) skillName = m.displayName || m.name
              } catch (e) {}
            }

            const skillMd = path.join(p, 'SKILL.md')
            if (fs.existsSync(skillMd)) {
              try {
                const content = fs.readFileSync(skillMd, 'utf8')
                const displayNameMatch = content.match(/displayName:\s*([^\r\n]+)/)
                const titleMatch = content.match(/title:\s*([^\r\n]+)/)
                const nameMatch = content.match(/name:\s*([^\r\n]+)/)
                if (displayNameMatch && displayNameMatch[1] && skillName === name) {
                  skillName = displayNameMatch[1].replace(/^['"]|['"]$/g, '').trim()
                } else if (titleMatch && titleMatch[1] && skillName === name) {
                  skillName = titleMatch[1].replace(/^['"]|['"]$/g, '').trim()
                } else if (nameMatch && nameMatch[1] && skillName === name) {
                  const matched = nameMatch[1].replace(/^['"]|['"]$/g, '').trim()
                  if (/[\u4e00-\u9fa5]/.test(matched)) {
                    skillName = matched
                  }
                }
                const descMatch = content.match(/description:\s*([^\r\n]+)/)
                if (descMatch && descMatch[1] && !desc) {
                  desc = descMatch[1].replace(/^['"]|['"]$/g, '').trim()
                }
                const sourceMatch = content.match(/source:\s*([^\r\n]+)/)
                if (sourceMatch && sourceMatch[1]) {
                  source = sourceMatch[1].replace(/^['"]|['"]$/g, '').trim()
                }
                const authorMatch = content.match(/author:\s*([^\r\n]+)/)
                if (authorMatch && authorMatch[1]) {
                  author = authorMatch[1].replace(/^['"]|['"]$/g, '').trim()
                }
                if (/agent_created:\s*true/i.test(content) || /created_by:\s*user/i.test(content) || author === 'user') {
                  source = 'custom'
                }
              } catch (e) {}
            }

            if (name === 'skill-creator' || name === 'agent-manager') {
              source = 'builtin'
              author = 'system'
              if (name === 'skill-creator') skillName = 'AI技能生成器'
              if (name === 'agent-manager') skillName = '智能体包管理器'
            }

            if (!desc) {
              if (name === 'skill-creator') desc = 'AI技能生成器：根据需求自动编写新技能'
              else if (name === 'agent-manager') desc = '智能体包管理器：自动创建/转化/审查AI智能体与工作流'
              else if (name === 'fec-image-generation') desc = '图片生成与创意作图工具'
              else if (name === 'word-docx-1') desc = 'Word 文档读写与样式排版工具'
              else desc = '本地已启用的扩展技能'
            }

            skillsDetail.push({
              id: name,
              name: skillName,
              description: desc,
              source,
              author,
              mtime: stat.mtimeMs,
              path: p
            })
          }
        })
      }

      // 1.2 扫描全栈智能体能力包
      const installedAgents: string[] = []
      const agentsDetail: Array<{
        id: string
        name: string
        description: string
        icon?: string
        skills?: string[]
        tools?: string[]
        prompt?: string
        source?: string
        author?: string
        mtime?: number
        path?: string
      }> = []

      if (fs.existsSync(agentsDir)) {
        fs.readdirSync(agentsDir).forEach(name => {
          const p = path.join(agentsDir, name)
          if (fs.statSync(p).isDirectory()) {
            installedAgents.push(name)
            const stat = fs.statSync(p)
            let agName = name
            let desc = ''
            let icon = 'user'
            let skills: string[] = []
            let tools: string[] = []
            let prompt = ''
            let source = 'marketplace'
            let author = 'official'

            const manifestFile = path.join(p, 'manifest.json')
            if (fs.existsSync(manifestFile)) {
              try {
                const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
                if (m.displayName || m.name) {
                  const val = m.displayName || m.name
                  agName = typeof val === 'string' ? val : ''
                }
                if (m.summary || m.description) {
                  const val = m.summary || m.description
                  desc = typeof val === 'string' ? val : ''
                }
                if (m.icon) icon = m.icon
                if (m.source) source = m.source
                if (m.author) author = m.author
                if (m.isCustom || m.agent_created || m.author === 'user') {
                  source = 'custom'
                }
                if (Array.isArray(m.skillSlugs || m.skills)) {
                  skills = (m.skillSlugs || m.skills).map((s: any) => typeof s === 'string' ? s : s.slug)
                }
                if (Array.isArray(m.tools)) tools = m.tools
              } catch (e) {}
            }

            // 根据配置清单定义的优先级标识符智能定位人设 Markdown 文件路径
            let promptFile = ''
            const agentsSubDir = path.join(p, 'agents')
            if (fs.existsSync(agentsSubDir)) {
              try {
                const candidates = fs.readdirSync(agentsSubDir).filter(f => f.endsWith('.md'))
                if (candidates.length > 0) {
                  let manifestFile = path.join(p, 'manifest.json')
                  
                  let targetName = slug
                  let leadAgentName = ''
                  if (fs.existsSync(manifestFile)) {
                    try {
                      const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
                      if (m.agentName) targetName = m.agentName
                      if (m.expertType === 'team' && m.teamInfo?.leadAgent) {
                        leadAgentName = m.teamInfo.leadAgent
                      }
                    } catch (e) {}
                  }

                  const lookupName = leadAgentName || targetName
                  const kebabId = slug.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
                  
                  const nameMatch = candidates.find(f => path.basename(f, '.md') === lookupName)
                  if (nameMatch) {
                    promptFile = path.join(agentsSubDir, nameMatch)
                  } else if (kebabId !== lookupName) {
                    const kebabMatch = candidates.find(f => path.basename(f, '.md') === kebabId)
                    if (kebabMatch) promptFile = path.join(agentsSubDir, kebabMatch)
                  }
                  
                  if (!promptFile && candidates.length === 1) {
                    promptFile = path.join(agentsSubDir, candidates[0])
                  }
                }
              } catch (e) {}
            }

            if (promptFile && fs.existsSync(promptFile)) {
              try {
                prompt = fs.readFileSync(promptFile, 'utf8')
              } catch (e) {}
            }

            if (agName === name) {
              const readmeFile = path.join(p, 'README.md')
              if (fs.existsSync(readmeFile)) {
                try {
                  const content = fs.readFileSync(readmeFile, 'utf8')
                  const titleMatch = content.match(/^#\s*([^\r\n]+)/m)
                  if (titleMatch && titleMatch[1]) {
                    agName = titleMatch[1].trim()
                  }
                  if (!desc) {
                    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'))
                    if (lines.length > 0) desc = lines[0]
                  }
                } catch (e) {}
              }
            }

            if (!desc) {
              desc = '全栈业务智能体能力套件'
            }

            agentsDetail.push({
              id: name,
              name: agName,
              description: desc,
              icon,
              skills,
              tools,
              prompt,
              source,
              author,
              mtime: stat.mtimeMs,
              path: p
            })
          }
        })
      }

      // 1.3 兜底扫描 rules
      if (fs.existsSync(rulesDir)) {
        fs.readdirSync(rulesDir).forEach(name => {
          if (name.endsWith('.md')) {
            const ruleId = name.replace(/\.md$/, '').toLowerCase()
            if (!installedAgents.includes(ruleId)) {
              installedAgents.push(ruleId)
              agentsDetail.push({
                id: ruleId,
                name: ruleId,
                description: '已安装的领域规则智能体'
              })
            }
          }
        })
      }

      // 1.4 扫描插件
      const installedPlugins: string[] = []
      if (fs.existsSync(pluginsDir)) {
        fs.readdirSync(pluginsDir).forEach(name => {
          const p = path.join(pluginsDir, name)
          if (fs.statSync(p).isDirectory()) installedPlugins.push(name.toLowerCase())
        })
      }

      const all = Array.from(new Set([...installedSkills.map(s => s.toLowerCase()), ...installedAgents, ...installedPlugins]))

      // 1.5 读取当前会话激活的智能体 (支持 query 参数 ?sessionId=xxx)
      let reqSessionId = ''
      try {
        if (req.url && req.url.includes('?')) {
          const u = new URL(req.url, 'http://localhost')
          reqSessionId = u.searchParams.get('sessionId') || ''
        }
      } catch (e) {}

      const { sessions, globalDefault } = getSessionAgentsConfig()
      let activeAgentId = 'none'
      if (reqSessionId && sessions[reqSessionId]) {
        activeAgentId = sessions[reqSessionId]
      } else {
        activeAgentId = globalDefault || 'none'
      }

      sendJson(res, {
        success: true,
        data: {
          skills: installedSkills,
          skillsDetail,
          agents: installedAgents,
          agentsDetail,
          activeAgentId,
          sessionAgents: sessions,
          experts: installedAgents,
          expertsDetail: agentsDetail,
          activeExpertId: activeAgentId,
          sessionExperts: sessions,
          plugins: installedPlugins,
          all
        }
      })
    } catch (err: any) {
      sendError(res, err.message)
    }
  }

  ctx.webServer.register({
    kind: 'exact',
    path: '/jy-api/installed-assets',
    handler: installedAssetsHandler
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/installed-assets',
    handler: installedAssetsHandler
  })

  // 2. 打开物理资产所在的物理目录
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/assets/open-folder',
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Method Not Allowed' }))
        return
      }

      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', async () => {
        try {
          const { type = 'agent', slug, category } = JSON.parse(body)

          const effectiveType = category || type
          let targetDir = baseHome

          if (slug) {
            if (effectiveType === 'plugin') {
              targetDir = path.resolve(baseHome, 'profiles', 'web', 'node_modules', slug)
              if (!fs.existsSync(targetDir) && slug.startsWith('@')) {
                const shortName = slug.split('/').pop() || slug
                const altDir = path.resolve(baseHome, 'profiles', 'web', 'node_modules', shortName)
                if (fs.existsSync(altDir)) targetDir = altDir
              }
            } else if (effectiveType === 'agent') {
              targetDir = path.resolve(baseHome, 'agents', slug)
            } else {
              targetDir = path.resolve(baseHome, 'skills', slug)
            }
          }

          if (!fs.existsSync(targetDir)) {
            throw new Error(`Directory not found: ${targetDir}`)
          }

          const openCmd = process.platform === 'win32'
            ? `explorer.exe "${targetDir}"`
            : process.platform === 'darwin'
              ? `open "${targetDir}"`
              : `xdg-open "${targetDir}"`

          execAsync(openCmd).catch(() => {})

          sendJson(res, { success: true, message: 'Folder opened', path: targetDir })
        } catch (err: any) {
          sendError(res, err.message)
        }
      })
    }
  })

  // 3. 安全删除物理资产
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/assets/delete',
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Method Not Allowed' }))
        return
      }

      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', async () => {
        try {
          const { type = 'agent', slug } = JSON.parse(body)
          if (!slug || typeof slug !== 'string') throw new Error('Missing parameter: slug')

          const cleanSlug = slug.trim()
          if (!/^[a-zA-Z0-9_\-\.]+$/.test(cleanSlug) || cleanSlug === '.' || cleanSlug === '..' || cleanSlug.includes('..')) {
            throw new Error('非法资产标识符 (Path Traversal Detected)')
          }

          if (cleanSlug === 'skill-creator' || cleanSlug === 'agent-manager') {
            throw new Error('系统内置工具禁止删除')
          }

          const parentDirName = type === 'agent' ? 'agents' : type === 'plugin' ? 'plugins' : 'skills'
          const allowedParentDir = path.resolve(baseHome, parentDirName)
          const targetDir = path.resolve(allowedParentDir, cleanSlug)

          const relative = path.relative(allowedParentDir, targetDir)
          if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error('操作越界：禁止删除沙箱外目录')
          }

          if (fs.existsSync(targetDir)) {
            await moveToRecycleBin(targetDir)
          }

          sendJson(res, { success: true, message: `已成功删除 ${cleanSlug}` })
        } catch (err: any) {
          sendError(res, err.message)
        }
      })
    }
  })

  // 4. 通用本地资产安装与落盘接口
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/assets/install',
    handler: async (req, res) => {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}')
          const { slug, name, category, download_url, config, content, readme } = payload
          if (!slug) throw new Error('Missing parameter: slug')

          if (category === 'agent') {
            const agentsDir = path.join(baseHome, 'agents', slug)
            if (!fs.existsSync(agentsDir)) fs.mkdirSync(agentsDir, { recursive: true })
            const promptFile = path.join(agentsDir, 'prompt.md')
            const promptContent = content || config?.prompt || readme || `# 智能体设定: ${name || slug}\n\n你是一位专业的企业级 AI 智能体助手。`
            fs.writeFileSync(promptFile, promptContent, 'utf8')
            const manifestFile = path.join(agentsDir, 'manifest.json')
            fs.writeFileSync(manifestFile, JSON.stringify({
              id: slug,
              name: name || slug,
              displayName: name || slug,
              description: payload.description_zh || payload.description || '',
              source: 'marketplace',
              updatedAt: new Date().toISOString()
            }, null, 2), 'utf8')
          } else if (category === 'plugin') {
            const pluginsDir = path.join(baseHome, 'plugins', slug)
            if (fs.existsSync(pluginsDir)) fs.rmSync(pluginsDir, { recursive: true, force: true })
            fs.mkdirSync(pluginsDir, { recursive: true })

            if (download_url) {
              const tempDir = path.resolve(os.tmpdir(), 'jingyun-scratch')
              if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
              const tempZip = path.join(tempDir, `${slug}-plugin.zip`)
              const dlRes = await fetch(download_url)
              if (dlRes.ok) {
                const ab = await dlRes.arrayBuffer()
                fs.writeFileSync(tempZip, Buffer.from(ab))
                await extractZipSafe(tempZip, pluginsDir)
                if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip)
              }
            }
          } else {
            const skillsDir = path.join(baseHome, 'skills', slug)
            if (fs.existsSync(skillsDir)) fs.rmSync(skillsDir, { recursive: true, force: true })
            fs.mkdirSync(skillsDir, { recursive: true })

            if (download_url) {
              const tempDir = path.resolve(os.tmpdir(), 'jingyun-scratch')
              if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
              const tempZip = path.join(tempDir, `${slug}-skill.zip`)
              const dlRes = await fetch(download_url)
              if (dlRes.ok) {
                const ab = await dlRes.arrayBuffer()
                fs.writeFileSync(tempZip, Buffer.from(ab))
                await extractZipSafe(tempZip, skillsDir)
                if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip)
              }
            } else {
              const skillMdFile = path.join(skillsDir, 'SKILL.md')
              const mdBody = `---\ntitle: "${name || slug}"\ndescription: "${payload.description_zh || payload.description || ''}"\nsource: "marketplace"\n---\n\n${readme || '# ' + (name || slug)}`
              fs.writeFileSync(skillMdFile, mdBody, 'utf8')
            }

            const manifestFile = path.join(skillsDir, 'manifest.json')
            fs.writeFileSync(manifestFile, JSON.stringify({
              id: slug,
              slug,
              name: name || slug,
              displayName: name || slug,
              description: payload.description_zh || payload.description || '',
              source: 'marketplace',
              updatedAt: new Date().toISOString()
            }, null, 2), 'utf8')
          }

          sendJson(res, { success: true, message: `Asset "${slug}" installed successfully.` })
        } catch (err: any) {
          console.error('[UIBranding] Asset install error:', err.message)
          sendError(res, err.message)
        }
      })
    }
  })

  // 5. 卸载物理资产
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/assets/uninstall',
    handler: async (req, res) => {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}')
          const { slug, category } = payload
          if (!slug || typeof slug !== 'string') throw new Error('Missing parameter: slug')

          const cleanSlug = slug.trim()
          if (!/^[a-zA-Z0-9_\-\.]+$/.test(cleanSlug) || cleanSlug === '.' || cleanSlug === '..' || cleanSlug.includes('..')) {
            throw new Error('非法资产标识符 (Path Traversal Detected)')
          }

          const parentDirName = category === 'agent' ? 'agents' : category === 'plugin' ? 'plugins' : 'skills'
          const allowedParentDir = path.resolve(baseHome, parentDirName)
          const targetDir = path.resolve(allowedParentDir, cleanSlug)

          const relative = path.relative(allowedParentDir, targetDir)
          if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error('操作越界：禁止删除沙箱外目录')
          }

          if (fs.existsSync(targetDir)) {
            await moveToRecycleBin(targetDir)
          }

          sendJson(res, { success: true, message: `Asset "${cleanSlug}" uninstalled.` })
        } catch (err: any) {
          sendError(res, err.message)
        }
      })
    }
  })

  // 6. 物理导入本地 ZIP 智能体包与技能包
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/assets/import-zip',
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ error: 'Method Not Allowed' }))
        return
      }

      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body)
          const { filename = 'package.zip', dataBase64, targetType = 'auto' } = payload
          if (!dataBase64) {
            throw new Error('Missing parameter: dataBase64')
          }

          const baseZipName = path.basename(filename, '.zip')
          const tempDir = path.resolve(os.tmpdir(), 'jingyun-import-' + Date.now())
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true })
          }
          const tempZipPath = path.join(tempDir, 'import.zip')
          const extractTempDir = path.join(tempDir, 'extracted')
          fs.mkdirSync(extractTempDir, { recursive: true })

          const buffer = Buffer.from(dataBase64, 'base64')
          fs.writeFileSync(tempZipPath, buffer)

          await extractZipSafe(tempZipPath, extractTempDir)

          const hasManifest = fs.existsSync(path.join(extractTempDir, 'manifest.json'))
          const hasSkillsets = fs.existsSync(path.join(extractTempDir, 'skillsets'))

          if (hasManifest || hasSkillsets || targetType === 'agent') {
            // === 6.1 作为智能体包导入 ===
            let slug = baseZipName
            let displayName = baseZipName
            let bundledSkills: string[] = []

            const manifestPath = path.join(extractTempDir, 'manifest.json')
            if (fs.existsSync(manifestPath)) {
              try {
                const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
                if (m.slug || m.id) slug = m.slug || m.id
                if (m.displayName || m.name) displayName = m.displayName || m.name
              } catch (e) {}
            }

            const targetAgentDir = path.join(baseHome, 'agents', slug)
            if (fs.existsSync(targetAgentDir)) {
              fs.rmSync(targetAgentDir, { recursive: true, force: true })
            }
            fs.mkdirSync(targetAgentDir, { recursive: true })
            copyFolderRecursiveSync(extractTempDir, targetAgentDir)


            const bundledDir = path.join(targetAgentDir, 'skills')
            if (fs.existsSync(bundledDir)) {
              const zipFiles = fs.readdirSync(bundledDir).filter(f => f.endsWith('.zip'))
              for (const zf of zipFiles) {
                const sName = path.basename(zf, '.zip')
                bundledSkills.push(sName)
                const sDest = path.join(baseHome, 'skills', sName)
                if (fs.existsSync(sDest)) fs.rmSync(sDest, { recursive: true, force: true })
                fs.mkdirSync(sDest, { recursive: true })
                await extractZipSafe(path.join(bundledDir, zf), sDest)
              }
            }

            try { fs.rmSync(tempDir, { recursive: true, force: true }) } catch (e) {}

            console.log(`[UIBranding] Agent package "${displayName}" (${slug}) imported. Bundled: ${bundledSkills.join(', ')}`)
            sendJson(res, {
              success: true,
              assetType: 'agent',
              slug,
              name: displayName,
              bundledSkills,
              message: `智能体【${displayName}】导入成功！`
            })
          } else {
            // === 6.2 作为技能包导入 ===
            let slug = baseZipName
            const targetSkillDir = path.join(baseHome, 'skills', slug)
            if (fs.existsSync(targetSkillDir)) {
              fs.rmSync(targetSkillDir, { recursive: true, force: true })
            }
            fs.mkdirSync(targetSkillDir, { recursive: true })
            copyFolderRecursiveSync(extractTempDir, targetSkillDir)

            try { fs.rmSync(tempDir, { recursive: true, force: true }) } catch (e) {}

            console.log(`[UIBranding] Skill package "${slug}" imported.`)
            sendJson(res, {
              success: true,
              assetType: 'skill',
              slug,
              name: slug,
              message: `技能【${slug}】导入成功！`
            })
          }
        } catch (err: any) {
          console.error('[UIBranding] Zip import failed:', err.message)
          sendError(res, err.message)
        }
      })
    }
  })
}
