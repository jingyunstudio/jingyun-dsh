import { WebSocket, type RawData } from 'ws'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

export interface WecomConfig {
  botId: string
  botSecret: string
  gatewayUrl?: string
  autoReconnect?: boolean
}

export type WecomStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface WecomState {
  status: WecomStatus
  botId?: string
  connectedAt?: number
  lastError?: string
}

interface NodeError extends Error {
  code?: string
}

const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.dsh', 'connectors', 'wecom.json')
// 企业微信智能机器人官方开放平台 WebSocket 地址 (对齐 @wecom/aibot-node-sdk)
const OFFICIAL_WS_URL = 'wss://openws.work.weixin.qq.com'

function generateReqId(prefix: string) {
  const timestamp = Date.now()
  const random = crypto.randomBytes(4).toString('hex')
  return `${prefix}_${timestamp}_${random}`
}

export class WecomConnectorService {
  private ws: WebSocket | null = null
  private config: WecomConfig | null = null
  private status: WecomStatus = 'disconnected'
  private connectedAt?: number
  private lastError?: string
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private missedPongCount: number = 0
  private maxMissedPong: number = 2
  private configPath: string = DEFAULT_CONFIG_PATH
  constructor(customConfigPath?: string) {
    if (customConfigPath) {
      this.configPath = customConfigPath
    }
  }

  public async init(): Promise<void> {
    await this.loadConfig()
    if (this.config?.botId && this.config?.botSecret) {
      this.connect().catch((err: unknown) => {
        console.warn('[WecomConnector] Initial connection failed:', err)
      })
    }
  }

  public async loadConfig(): Promise<WecomConfig | null> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8')
      this.config = JSON.parse(data) as WecomConfig
      if (this.config && (!this.config.gatewayUrl || this.config.gatewayUrl.includes('wework_admin'))) {
        this.config.gatewayUrl = OFFICIAL_WS_URL
      }
      return this.config
    } catch (err: unknown) {
      const nodeErr = err as NodeError
      if (nodeErr.code !== 'ENOENT') {
        console.error('[WecomConnector] Failed to read config:', err)
      }
      return null
    }
  }
  public async saveConfig(cfg: WecomConfig): Promise<void> {
    this.config = cfg
    const dir = path.dirname(this.configPath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(this.configPath, JSON.stringify(cfg, null, 2), 'utf-8')
  }

  public async clearConfig(): Promise<void> {
    this.disconnect()
    this.config = null
    try {
      await fs.unlink(this.configPath)
    } catch (err: unknown) {
      const nodeErr = err as NodeError
      if (nodeErr.code !== 'ENOENT') {
        console.error('[WecomConnector] Failed to remove config file:', err)
      }
    }
  }

  public getStatus(): WecomState {
    return {
      status: this.status,
      botId: this.config?.botId ? this.maskBotId(this.config.botId) : undefined,
      connectedAt: this.connectedAt,
      lastError: this.lastError
    }
  }

  public async connect(overrideConfig?: WecomConfig): Promise<void> {
    if (overrideConfig) {
      await this.saveConfig(overrideConfig)
    }

    if (!this.config?.botId || !this.config?.botSecret) {
      throw new Error('未配置企业微信 BotId 或 BotSecret')
    }

    this.disconnect()
    this.status = 'connecting'
    this.lastError = undefined

    const wsUrl = this.config.gatewayUrl || OFFICIAL_WS_URL
    console.log(`[WecomConnector] Connecting to official gateway ${wsUrl} for bot: ${this.maskBotId(this.config.botId)}`)

    try {
      this.ws = new WebSocket(wsUrl, {
        handshakeTimeout: 10000
      })

      this.ws.on('open', () => {
        console.log('[WecomConnector] WebSocket TCP connected, sending aibot_subscribe...')
        this.missedPongCount = 0
        // 发送官方认证订阅帧
        this.sendAuth()
      })

      this.ws.on('message', (data: RawData) => {
        this.handleMessage(data)
      })

      this.ws.on('close', (code: number, reason: Buffer) => {
        const reasonStr = reason?.toString() || ''
        console.log(`[WecomConnector] Connection closed. code=${code}, reason=${reasonStr}`)
        this.stopHeartbeat()
        if (this.status === 'connected') {
          this.status = 'disconnected'
        }
        if (this.config?.autoReconnect !== false) {
          this.scheduleReconnect()
        }
      })

      this.ws.on('error', (err: Error) => {
        console.error('[WecomConnector] WebSocket error:', err.message)
        this.lastError = err.message
        this.status = 'error'
      })

    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.status = 'error'
      this.lastError = error.message
      throw error
    }
  }

  private sendAuth(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.config) return
    const reqId = generateReqId('aibot_subscribe')
    const authFrame = {
      cmd: 'aibot_subscribe',
      headers: { req_id: reqId },
      body: {
        bot_id: this.config.botId,
        secret: this.config.botSecret
      }
    }
    try {
      this.ws.send(JSON.stringify(authFrame))
    } catch (err: any) {
      console.error('[WecomConnector] Failed to send auth frame:', err.message)
    }
  }

  public disconnect(): void {
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      try {
        this.ws.terminate()
      } catch (e) {}
      this.ws = null
    }
    this.status = 'disconnected'
    this.connectedAt = undefined
  }

  private handleMessage(data: RawData): void {
    try {
      const msgStr = data.toString()
      const frame = JSON.parse(msgStr)

      const reqId = frame.headers?.req_id || ''

      // 认证响应
      if (reqId.startsWith('aibot_subscribe')) {
        if (frame.errcode === 0) {
          console.log('[WecomConnector] ✅ Official authentication successful! Bot is online.')
          this.status = 'connected'
          this.connectedAt = Date.now()
          this.lastError = undefined
          this.startHeartbeat()
        } else {
          console.error(`[WecomConnector] ❌ Authentication failed: ${frame.errmsg} (code: ${frame.errcode})`)
          this.status = 'error'
          this.lastError = `企微认证失败: ${frame.errmsg || frame.errcode}`
          this.disconnect()
        }
        return
      }

      // 心跳响应
      if (reqId.startsWith('ping')) {
        this.missedPongCount = 0
        return
      }

      // 接收到企微用户消息或事件推送
      if (frame.cmd === 'aibot_msg_callback' || frame.cmd === 'aibot_event_callback') {
        console.log(`[WecomConnector] Received message/event callback from user:`, JSON.stringify(frame.body))
      }
    } catch (err: unknown) {
      console.error('[WecomConnector] Error parsing message frame:', err)
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        if (this.missedPongCount >= this.maxMissedPong) {
          console.warn('[WecomConnector] Heartbeat ack timeout, terminating connection to reconnect.')
          this.ws.terminate()
          return
        }
        this.missedPongCount++
        const reqId = generateReqId('ping')
        this.ws.send(JSON.stringify({
          cmd: 'ping',
          headers: { req_id: reqId }
        }))
      }
    }, 30000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.status !== 'connected' && this.config?.botId) {
        console.log('[WecomConnector] Auto-reconnecting to WeCom gateway...')
        this.connect().catch((err: unknown) => {
          console.warn('[WecomConnector] Reconnect attempt failed:', err)
        })
      }
    }, 5000)
  }

  private maskBotId(botId: string): string {
    if (botId.length <= 8) return botId
    return `${botId.substring(0, 4)}...${botId.substring(botId.length - 4)}`
  }
}

export const wecomConnector = new WecomConnectorService()
