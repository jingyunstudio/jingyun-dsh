import { Context } from '@deepseek-ai/cordis'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawn } from 'child_process'
import { sendJson, sendError } from '../common/http'

export function registerArtifactRoutes(ctx: Context) {
  // 1. 根据会话 ID 匹配底座物理工作区绝对路径并安全读取物理文件
  ctx.webServer.register({
    kind: 'prefix',
    path: '/api/jingyun/artifact/read',
    handler: async (req, res) => {
      try {
        const reqUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
        const fileName = reqUrl.searchParams.get('file') || ''
        const rawSessionId = reqUrl.searchParams.get('sessionId') || ''

        if (!fileName) {
          sendError(res, 'Missing parameter: file', 400)
          return
        }

        const workspaceJsonPath = path.resolve(os.homedir(), '.dsh', 'storages', 'workspace.json')
        let resolvedWorkspacePath = ''

        if (fs.existsSync(workspaceJsonPath)) {
          try {
            const rawConfig = fs.readFileSync(workspaceJsonPath, 'utf8')
            const configObj = JSON.parse(rawConfig)
            const workspacesTable = configObj?.tables?.workspaces || {}

            if (rawSessionId) {
              const cleanSessionId = rawSessionId.replace(/^session-/, '').trim()

              for (const key of Object.keys(workspacesTable)) {
                const entry = workspacesTable[key]
                const sessionIds: string[] = entry.sessionIds || []
                
                const isMatched = sessionIds.some(id => {
                  const cleanId = id.replace(/^session-/, '').trim()
                  return cleanId === cleanSessionId || id === rawSessionId
                })

                if (isMatched && entry.path) {
                  resolvedWorkspacePath = entry.path
                  break
                }
              }
            }

            if (!resolvedWorkspacePath) {
              const entries = Object.values(workspacesTable) as any[]
              if (entries.length > 0) {
                entries.sort((a, b) => {
                  const tA = new Date(a.updatedAt || a.createdAt || 0).getTime()
                  const tB = new Date(b.updatedAt || b.createdAt || 0).getTime()
                  return tB - tA
                })
                const latest = entries.find(e => e.path && fs.existsSync(e.path))
                if (latest) {
                  resolvedWorkspacePath = latest.path
                }
              }
            }
          } catch (e: any) {
            console.error('[UIBranding] Failed to parse workspace relationship mapping:', e.message)
          }
        }

        if (!resolvedWorkspacePath) {
          sendError(res, 'Failed to resolve physical workspace for current session', 404)
          return
        }

        const cleanFileName = fileName.replace(/^\.?\/+/, '').trim()
        let targetFilePath = path.resolve(resolvedWorkspacePath, cleanFileName)

        if (!fs.existsSync(targetFilePath) || !fs.statSync(targetFilePath).isFile()) {
          let scannedCount = 0
          const findFileRecursively = (dir: string, targetName: string, depth = 0): string | null => {
            if (depth > 6) return null
            if (scannedCount > 3000) return null
            try {
              const files = fs.readdirSync(dir)
              const subdirs: string[] = []

              // 1. 优先扫描当前层所有文件，以极速直接命中
              for (const f of files) {
                scannedCount++
                if (f === 'node_modules' || f === '.git' || f === 'dist' || f === '.dsh' || f === '.trae' || f === '.gemini') continue
                const full = path.join(dir, f)
                let stat
                try { stat = fs.statSync(full) } catch { continue }

                if (stat.isFile() && f.toLowerCase() === targetName.toLowerCase()) {
                  return full
                }
                if (stat.isDirectory()) {
                  subdirs.push(full)
                }
              }

              // 2. 当前层未命中时，再依次展开子目录深度搜索
              for (const subdir of subdirs) {
                const found = findFileRecursively(subdir, targetName, depth + 1)
                if (found) return found
              }
            } catch {}
            return null
          }

          const fallbackFound = findFileRecursively(resolvedWorkspacePath, path.basename(cleanFileName))
          if (fallbackFound) {
            targetFilePath = fallbackFound
          }
        }

        if (!fs.existsSync(targetFilePath) || !fs.statSync(targetFilePath).isFile()) {
          console.warn(`[UIBranding] Target physical file does not exist: ${targetFilePath}`)
          sendError(res, `Physical file "${fileName}" not found in workspace (${resolvedWorkspacePath})`, 404)
          return
        }

        const fileContent = fs.readFileSync(targetFilePath, 'utf8')
        console.log(`[UIBranding] Successfully read real physical file: ${targetFilePath}`)

        sendJson(res, {
          success: true,
          fileName: path.basename(targetFilePath),
          path: targetFilePath,
          content: fileContent
        })
      } catch (err: any) {
        console.error('[UIBranding] Read physical artifact failed:', err.message)
        sendError(res, err.message)
      }
    }
  })

  // 2. 打开系统文件管理器并选中目标文件
  ctx.webServer.register({
    kind: 'prefix',
    path: '/api/jingyun/artifact/reveal',
    handler: async (req, res) => {
      try {
        const reqUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
        let filePath = reqUrl.searchParams.get('path') || ''
        if (filePath.startsWith('file:///')) {
          filePath = decodeURIComponent(filePath.replace(/^file:\/\/\/?/, ''))
        }
        if (filePath && fs.existsSync(filePath)) {
          if (process.platform === 'win32') {
            spawn('explorer.exe', [`/select,${filePath}`], { detached: true, stdio: 'ignore' }).unref()
          } else if (process.platform === 'darwin') {
            spawn('open', ['-R', filePath], { detached: true, stdio: 'ignore' }).unref()
          } else {
            spawn('xdg-open', [path.dirname(filePath)], { detached: true, stdio: 'ignore' }).unref()
          }
          sendJson(res, { success: true })
          return
        }
        sendError(res, 'Target file not found', 404)
      } catch (err: any) {
        sendError(res, err.message)
      }
    }
  })

  // 3. 在系统默认程序中打开物理文件
  ctx.webServer.register({
    kind: 'prefix',
    path: '/api/jingyun/artifact/open-external',
    handler: async (req, res) => {
      try {
        const reqUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
        let filePath = reqUrl.searchParams.get('path') || ''
        if (filePath.startsWith('file:///')) {
          filePath = decodeURIComponent(filePath.replace(/^file:\/\/\/?/, ''))
        }
        if (filePath && fs.existsSync(filePath)) {
          if (process.platform === 'win32') {
            spawn('cmd.exe', ['/c', 'start', '', filePath], { detached: true, stdio: 'ignore' }).unref()
          } else if (process.platform === 'darwin') {
            spawn('open', [filePath], { detached: true, stdio: 'ignore' }).unref()
          } else {
            spawn('xdg-open', [filePath], { detached: true, stdio: 'ignore' }).unref()
          }
          sendJson(res, { success: true })
          return
        }
        sendError(res, 'Target file not found', 404)
      } catch (err: any) {
        sendError(res, err.message)
      }
    }
  })
}
