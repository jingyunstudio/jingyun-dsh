import { Context } from '@deepseek-ai/cordis'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Config } from '../config/schema'
import { sendJson, sendError } from '../common/http'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const jsonPath = path.resolve(__dirname, '..', 'jingyun-config.json')

export function registerBrandingRoutes(ctx: Context, config: Config) {
  // 1. 获取 descriptors
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/branding/descriptors',
    handler: async (req, res) => {
      try {
        ctx.inject(['settings'], (sctx: any) => {
          const descriptors = sctx.settings.describe() || []
          
          // 对 descriptors 进行内存同步强矫正，解决底座写 YAML 延迟导致的同步抖动
          const mapped = descriptors.map((desc: any) => {
            if (desc.ns === 'jingyun-dsh') {
              return {
                ...desc,
                value: {
                  mode: config.mode || 'cloud',
                  apiUrl: config.apiUrl || '',
                  tenantHost: config.tenantHost || '',
                  appHost: config.appHost || '',
                  customName: config.customName || '',
                  customLogo: config.customLogo || ''
                }
              }
            }
            return desc
          })

          sendJson(res, { success: true, data: mapped })
        })
      } catch (err: any) {
        sendError(res, err.message)
      }
    }
  })

  // 2. 更新 descriptors
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/branding/descriptors/update',
    handler: async (req, res) => {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body)
          const { ns, patch } = payload

          if (!ns || !patch) {
            throw new Error('Missing parameter: ns or patch')
          }

          console.log(`[UIBranding] Generic settings update. NS=${ns}, Patch keys=${Object.keys(patch)}`)

          if (ns === 'jingyun-dsh') {
            let jsonContent = {
              api_url: '',
              tenant_host: '',
              domain: '',
              custom_name: '',
              custom_logo: ''
            }

            if (fs.existsSync(jsonPath)) {
              try {
                jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
              } catch (e) {}
            }

            if (patch.apiUrl) jsonContent.api_url = patch.apiUrl
            if (patch.tenantHost) jsonContent.tenant_host = patch.tenantHost
            if (patch.domain) jsonContent.domain = patch.domain
            if (patch.customName !== undefined) jsonContent.custom_name = patch.customName
            if (patch.customLogo !== undefined) jsonContent.custom_logo = patch.customLogo

            fs.writeFileSync(jsonPath, JSON.stringify(jsonContent, null, 2), 'utf8')
            console.log(`[UIBranding] Local JSON file synchronized: ${jsonPath}`)

            // 同步回内存 config 引用
            if (patch.mode) config.mode = patch.mode
            if (patch.apiUrl) config.apiUrl = patch.apiUrl
            if (patch.tenantHost) config.tenantHost = patch.tenantHost
            if (patch.domain) config.appHost = patch.domain
            if (patch.customName !== undefined) config.customName = patch.customName
            if (patch.customLogo !== undefined) config.customLogo = patch.customLogo
          }

          sendJson(res, { success: true, message: `Namespace ${ns} updated successfully.` })
        } catch (err: any) {
          console.error('[UIBranding] Failed to save descriptor patch:', err.message)
          sendError(res, err.message)
        }
      })
    }
  })

  // 3. Direct Disk JSON Settings API
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/branding/settings',
    handler: async (req, res) => {
      let jsonContent = {
        api_url: '',
        tenant_host: '',
        domain: '',
        custom_name: '',
        custom_logo: ''
      }

      if (fs.existsSync(jsonPath)) {
        try {
          jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
        } catch (e) {}
      }

      sendJson(res, {
        mode: 'local',
        apiUrl: jsonContent.api_url,
        tenantHost: jsonContent.tenant_host,
        domain: jsonContent.domain,
        appHost: jsonContent.domain,
        customName: jsonContent.custom_name,
        customLogo: jsonContent.custom_logo
      })
    }
  })

  // 4. Branding Config API (100% Direct Disk JSON Single Source of Truth)
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/branding',
    handler: async (req, res) => {
      let apiUrl = ''
      let tenantHost = ''
      let domain = ''
      let siteName = ''
      let siteLogo = ''
      const customLogoFile = path.resolve(__dirname, '..', '..', 'logo.png')
      if (fs.existsSync(customLogoFile)) {
        siteLogo = '/api/jingyun/branding/logo.png'
      }

      if (fs.existsSync(jsonPath)) {
        try {
          const raw = fs.readFileSync(jsonPath, 'utf8')
          const localData = JSON.parse(raw)
          if (localData.api_url) apiUrl = localData.api_url
          if (localData.tenant_host) tenantHost = localData.tenant_host
          if (localData.domain) domain = localData.domain
          else if (localData.app_host) domain = localData.app_host
          if (localData.custom_name) siteName = localData.custom_name
          if (localData.custom_logo) siteLogo = localData.custom_logo
        } catch (e) {}
      }

      sendJson(res, {
        mode: 'local',
        api_url: apiUrl,
        tenant_host: tenantHost,
        domain: domain,
        appHost: domain,
        site_logo: siteLogo,
        site_name: siteName
      })
    }
  })

  // 5. Static Local Logo Resource Stream Router
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/branding/logo.png',
    handler: async (req, res) => {
      let iconPath = path.resolve(__dirname, '..', '..', '..', 'src-tauri', 'icons', '128x128.png')
      const customLogoFile = path.resolve(__dirname, '..', '..', 'logo.png')
      if (fs.existsSync(customLogoFile)) {
        iconPath = customLogoFile
      }

      if (fs.existsSync(iconPath)) {
        try {
          const imgBuf = fs.readFileSync(iconPath)
          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Cache-Control': 'no-cache'
          })
          res.end(imgBuf)
          return
        } catch (e) {}
      }
      res.writeHead(404)
      res.end()
    }
  })
}
