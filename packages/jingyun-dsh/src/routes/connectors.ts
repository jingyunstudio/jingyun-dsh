import { Context } from '@deepseek-ai/cordis'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { sendJson, sendError } from '../common/http'

const execAsync = promisify(exec)

let currentInitProcess: any = null
let currentPollProcess: any = null

const runConfigInitAndGetUrl = (): Promise<{ url: string; mode: string }> => {
  return new Promise((resolve, reject) => {
    const tempLogPath = path.join(os.tmpdir(), `lark_init_${Date.now()}.log`)
    console.log(`[UIBranding] Temp log path: ${tempLogPath}`)

    if (currentInitProcess) {
      console.log('[UIBranding] Killing previous active config init process.')
      try { currentInitProcess.kill() } catch (e) {}
    }

    const cmd = `lark-cli config init --new > "${tempLogPath}" 2>&1`
    console.log(`[UIBranding] Executing command: ${cmd}`)

    const child = exec(cmd)
    currentInitProcess = child

    let urlFound = false
    let checkInterval: any = null

    const cleanup = () => {
      if (checkInterval) clearInterval(checkInterval)
      try {
        if (fs.existsSync(tempLogPath)) {
          fs.unlinkSync(tempLogPath)
        }
      } catch (e) {}
    }

    checkInterval = setInterval(() => {
      try {
        if (fs.existsSync(tempLogPath)) {
          const content = fs.readFileSync(tempLogPath, 'utf8')
          const match = content.match(/https:\/\/open\.feishu\.cn\/page\/cli\?user_code=[A-Za-z0-9\-_&=%\.]+/i)
          if (match && !urlFound) {
            urlFound = true
            cleanup()
            console.log('[UIBranding] Successfully captured config init URL from file:', match[0])
            resolve({ url: match[0], mode: 'init' })
          }
        }
      } catch (err) {
        console.error('[UIBranding] Read temp init log error:', err)
      }
    }, 300)

    child.on('error', (err) => {
      console.error('[UIBranding] Command redirect execution error:', err)
      if (!urlFound) {
        cleanup()
        reject(err)
      }
    })

    setTimeout(() => {
      if (!urlFound) {
        console.warn('[UIBranding] Timeout waiting for redirect config-init URL. Killing process.')
        cleanup()
        try { child.kill() } catch (e) {}
        reject(new Error('等待获取初始化连接超时(120s)'))
      }
    }, 120000)
  })
}

const connectorHandlers: Record<string, {
  status: () => Promise<any>
  authStart: () => Promise<any>
  logout: () => Promise<any>
}> = {
  lark: {
    status: async () => {
      try {
        const { stdout } = await execAsync('lark-cli auth status --json')
        return JSON.parse(stdout)
      } catch (err: any) {
        if (err.stdout) {
          try {
            return JSON.parse(err.stdout)
          } catch (e) {}
        }
        return { status: 'needs_login', error: err.message }
      }
    },
    authStart: async () => {
      let isConfigured = false
      try {
        const { stdout } = await execAsync('lark-cli auth status --json')
        const data = JSON.parse(stdout)
        if (data && data.appId) {
          isConfigured = true
        }
      } catch (err: any) {
        if (err.stdout && err.stdout.includes('not_configured')) {
          isConfigured = false
        } else if (err.message && err.message.includes('not configured')) {
          isConfigured = false
        } else {
          isConfigured = true
        }
      }

      if (!isConfigured) {
        const res = await runConfigInitAndGetUrl()
        const urlObj = new URL(res.url)
        const userCode = urlObj.searchParams.get('user_code') || 'init_code'
        return {
          mode: 'init',
          verification_url: res.url,
          device_code: userCode
        }
      } else {
        const { stdout } = await execAsync('lark-cli auth login --no-wait --json --domain all')
        const data = JSON.parse(stdout)
        return {
          mode: 'login',
          verification_url: data.verification_url,
          device_code: data.device_code
        }
      }
    },
    logout: async () => {
      try {
        await execAsync('lark-cli auth logout')
      } catch (e) {}
      return { success: true }
    }
  }
}

const handleConnectorAction = async (channel: string, action: string, req: any, res: any) => {
  try {
    const handler = connectorHandlers[channel]
    if (!handler) {
      sendError(res, `暂不支持该渠道: ${channel}`, 404)
      return
    }

    let result: any = null
    if (action === 'status') {
      result = await handler.status()
    } else if (action === 'auth-start') {
      result = await handler.authStart()
    } else if (action === 'auth-logout') {
      result = await handler.logout()
    } else {
      sendError(res, `未知操作: ${action}`, 404)
      return
    }

    sendJson(res, { success: true, data: result })
  } catch (err: any) {
    console.error(`[UIBranding] Connector ${channel} ${action} error:`, err.message)
    sendError(res, err.message)
  }
}

export function registerConnectorsRoutes(ctx: Context) {
  // 1. 获取飞书连接状态
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/lark/status',
    handler: async (req, res) => handleConnectorAction('lark', 'status', req, res)
  })

  // 2. 启动飞书认证连接
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/lark/auth-start',
    handler: async (req, res) => handleConnectorAction('lark', 'auth-start', req, res)
  })

  // 3. 断开飞书连接
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/lark/auth-logout',
    handler: async (req, res) => handleConnectorAction('lark', 'auth-logout', req, res)
  })

  // 4. 轮询飞书认证结果
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/connectors/lark/auth-poll',
    handler: async (req, res) => {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', async () => {
        let payload: any = {}
        try {
          payload = JSON.parse(body || '{}')
        } catch (e: any) {
          sendError(res, `JSON 解析失败: ${e.message}`, 400)
          return
        }

        const { device_code } = payload
        if (!device_code) {
          sendError(res, '缺少 device_code 参数', 400)
          return
        }

        let childProcessForLogin: any = null
        let timeoutId: any = null

        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId)
          if (childProcessForLogin) {
            console.log('[UIBranding] Cleaning up and killing auth login poll process...')
            try { childProcessForLogin.kill() } catch (e) {}
          }
        }

        try {
          if (currentInitProcess && !currentInitProcess.killed) {
            console.log('[UIBranding] Poll: Waiting for active Phase 1 config init process to exit...')
            const waitProcessExit = () => {
              return new Promise<void>((resolve, reject) => {
                const handleExit = (code: number | null) => {
                  currentInitProcess = null
                  if (code === 0) {
                    resolve()
                  } else {
                    reject(new Error(`配置初始化失败，退出码: ${code}`))
                  }
                }
                currentInitProcess.once('close', handleExit)
                currentInitProcess.once('error', (err: any) => {
                  currentInitProcess = null
                  reject(err)
                })
              })
            }
            await waitProcessExit()
            console.log('[UIBranding] Poll: Phase 1 config init exited successfully. Capturing phase 2 url...')

            sendJson(res, { 
              success: true, 
              mode: 'init_done'
            })
            return
          }

          if (currentPollProcess) {
            console.log('[UIBranding] Killing previous active auth login poll process.')
            try { currentPollProcess.kill() } catch (e) {}
          }

          console.log(`[UIBranding] Spawning Phase 2: lark-cli auth login --device-code ${device_code}`)
          const child = spawn('lark-cli', ['auth', 'login', '--device-code', device_code, '--json'], { shell: true })
          currentPollProcess = child
          childProcessForLogin = child

          timeoutId = setTimeout(() => {
            console.warn('[UIBranding] Auth login poll timeout (120s). Killing process.')
            cleanup()
          }, 120000)

          const waitLoginResult = () => {
            return new Promise<string>((resolve, reject) => {
              let stdout = ''
              child.stdout.on('data', (data) => {
                stdout += data.toString()
              })
              child.on('close', (code) => {
                currentPollProcess = null
                if (code === 0) {
                  resolve(stdout)
                } else {
                  reject(new Error(`授权登录失败，退出码: ${code}. 输出: ${stdout}`))
                }
              })
              child.on('error', (err) => {
                currentPollProcess = null
                reject(err)
              })
            })
          }

          const stdout = await waitLoginResult()
          if (timeoutId) clearTimeout(timeoutId)

          console.log('[UIBranding] Phase 2 auth login finished successfully!')
          sendJson(res, { success: true, mode: 'login', data: JSON.parse(stdout) })

        } catch (err: any) {
          if (timeoutId) clearTimeout(timeoutId)
          console.error('[UIBranding] Auth poll error:', err.message)
          sendJson(res, { success: false, status: 'error', error: err.message })
        }
      })
    }
  })
}
