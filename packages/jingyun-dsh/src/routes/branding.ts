import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import type { Context } from '@deepseek-ai/cordis';

import { sendJson, sendError } from '../common/http';
import {
  getJingyunConfigPath,
  getRemoteBaseUrl,
  readJingyunConfig,
} from '../common/paths';
import type { Config } from '../config/schema';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function registerBrandingRoutes(ctx: Context, config: Config) {
  // 1. 获取 descriptors
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/branding/descriptors',
    handler: async (req, res) => {
      try {
        ctx.inject(['settings'], (sctx: any) => {
          const descriptors = sctx.settings.describe() || [];

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
                  customLogo: config.customLogo || '',
                },
              };
            }
            return desc;
          });

          sendJson(res, { success: true, data: mapped });
        });
      } catch (err: any) {
        sendError(res, err.message);
      }
    },
  });

  // 2. 更新 descriptors
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/branding/descriptors/update',
    handler: async (req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const { ns, patch } = payload;

          if (!ns || !patch) {
            throw new Error('Missing parameter: ns or patch');
          }

          console.log(
            `[UIBranding] Generic settings update. NS=${ns}, Patch keys=${Object.keys(patch)}`
          );

          if (ns === 'jingyun-dsh') {
            const jsonContent = {
              api_url: '',
              tenant_host: '',
              domain: '',
              custom_name: '',
              custom_logo: '',
              ...readJingyunConfig(),
            };

            if (patch.apiUrl) jsonContent.api_url = patch.apiUrl;
            if (patch.tenantHost) jsonContent.tenant_host = patch.tenantHost;
            if (patch.domain) jsonContent.domain = patch.domain;
            if (patch.customName !== undefined)
              jsonContent.custom_name = patch.customName;
            if (patch.customLogo !== undefined)
              jsonContent.custom_logo = patch.customLogo;

            const configPath = getJingyunConfigPath();

            const configDir = path.dirname(configPath);
            if (!fs.existsSync(configDir)) {
              fs.mkdirSync(configDir, { recursive: true });
            }
            fs.writeFileSync(
              configPath,
              JSON.stringify(jsonContent, null, 2),
              'utf8'
            );
            console.log(
              `[UIBranding] Local JSON file synchronized: ${configPath}`
            );

            // 同步回内存 config 引用
            if (patch.mode) config.mode = patch.mode;
            if (patch.apiUrl) config.apiUrl = patch.apiUrl;
            if (patch.tenantHost) config.tenantHost = patch.tenantHost;
            if (patch.domain) config.appHost = patch.domain;
            if (patch.customName !== undefined)
              config.customName = patch.customName;
            if (patch.customLogo !== undefined)
              config.customLogo = patch.customLogo;
          }

          sendJson(res, {
            success: true,
            message: `Namespace ${ns} updated successfully.`,
          });
        } catch (err: any) {
          console.error(
            '[UIBranding] Failed to save descriptor patch:',
            err.message
          );
          sendError(res, err.message);
        }
      });
    },
  });

  // 3. Direct Disk JSON Settings API
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/branding/settings',
    handler: async (req, res) => {
      const jsonContent = readJingyunConfig();

      sendJson(res, {
        mode: 'local',
        apiUrl: jsonContent.api_url || '',
        tenantHost: jsonContent.tenant_host || '',
        domain: jsonContent.domain || '',
        appHost: jsonContent.domain || jsonContent.app_host || '',
        customName: jsonContent.custom_name || '',
        customLogo: jsonContent.custom_logo || '',
      });
    },
  });

  // 4. Branding Config API (100% Direct Disk JSON Single Source of Truth)
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/branding',
    handler: async (req, res) => {
      let siteLogo = '';
      const customLogoFile = path.resolve(__dirname, '..', '..', 'logo.png');
      if (fs.existsSync(customLogoFile)) {
        siteLogo = '/api/jingyun/branding/logo.png';
      }

      const localData = readJingyunConfig();
      const apiUrl = localData.api_url || '';
      const tenantHost = localData.tenant_host || '';
      const domain = localData.domain || localData.app_host || '';
      const siteName = localData.custom_name || '';
      if (localData.custom_logo) {
        siteLogo = localData.custom_logo;
      }

      sendJson(res, {
        mode: 'local',
        api_url: apiUrl,
        tenant_host: tenantHost,
        domain: domain,
        appHost: domain,
        site_logo: siteLogo,
        site_name: siteName,
      });
    },
  });

  // 5. Static Local Logo Resource Stream Router
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/branding/logo.png',
    handler: async (req, res) => {
      let iconPath = path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'src-tauri',
        'icons',
        '128x128.png'
      );
      const customLogoFile = path.resolve(__dirname, '..', '..', 'logo.png');
      if (fs.existsSync(customLogoFile)) {
        iconPath = customLogoFile;
      }

      if (fs.existsSync(iconPath)) {
        try {
          const imgBuf = fs.readFileSync(iconPath);
          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Cache-Control': 'no-cache',
          });
          res.end(imgBuf);
          return;
        } catch {}
      }
      res.writeHead(404);
      res.end();
    },
  });

  // 6. 代理云端租户信息接口（规避浏览器同源策略及 CORS 头冲突）
  ctx.webServer.register({
    kind: 'prefix',
    path: '/api/jingyun/tenant/info',
    handler: async (req, res) => {
      try {
        const remoteBase = getRemoteBaseUrl(config, req.url);
        if (!remoteBase) {
          sendError(res, 'Remote host is not configured', 400);
          return;
        }
        const remoteRes = await fetch(`${remoteBase}/v1/public/tenant/info`, {
          headers: {
            Accept: 'application/json',
          },
        });
        const data = await remoteRes.json();
        sendJson(res, data, remoteRes.status);
      } catch (err: any) {
        console.error('[UIBranding] Failed to proxy tenant info:', err.message);
        sendError(res, `Failed to proxy tenant info: ${err.message}`, 502);
      }
    },
  });

  // 7. 代理云端用户 Profile 接口（透传 Authorization Token）
  ctx.webServer.register({
    kind: 'prefix',
    path: '/api/jingyun/user/profile',
    handler: async (req, res) => {
      try {
        const remoteBase = getRemoteBaseUrl(config, req.url);
        if (!remoteBase) {
          sendError(res, 'Remote host is not configured', 400);
          return;
        }
        const authHeader =
          req.headers['authorization'] || req.headers['Authorization'];

        const headers: Record<string, string> = {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        };
        if (authHeader) {
          headers['Authorization'] = Array.isArray(authHeader)
            ? authHeader[0]
            : authHeader;
        }

        const remoteRes = await fetch(
          `${remoteBase}/v1/plugins/user_auth/profile`,
          {
            headers,
          }
        );
        const data = await remoteRes.json();
        sendJson(res, data, remoteRes.status);
      } catch (err: any) {
        console.error(
          '[UIBranding] Failed to proxy user profile:',
          err.message
        );
        sendError(res, `Failed to proxy user profile: ${err.message}`, 502);
      }
    },
  });

  // 8. 代理外部防盗链图片（规避微信等 CDN 的 Referer 拦截与 Mixed Content 问题）
  ctx.webServer.register({
    kind: 'prefix',
    path: '/api/jingyun/proxy/image',
    handler: async (req, res) => {
      try {
        const reqUrl = req.url || '';
        const u = new URL(reqUrl, 'http://localhost');
        const targetUrl = u.searchParams.get('url');
        if (!targetUrl) {
          sendError(res, 'Missing url parameter', 400);
          return;
        }
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          sendError(res, 'Invalid url parameter', 400);
          return;
        }

        const remoteRes = await fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept:
              'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
        });

        if (!remoteRes.ok) {
          sendError(
            res,
            `Failed to fetch image: status ${remoteRes.status}`,
            remoteRes.status
          );
          return;
        }

        const contentType = remoteRes.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await remoteRes.arrayBuffer());

        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': buffer.length,
          'Cache-Control': 'public, max-age=86400',
        });
        res.end(buffer);
      } catch (err: any) {
        console.error('[UIBranding] Failed to proxy image:', err.message);
        sendError(res, `Failed to proxy image: ${err.message}`, 502);
      }
    },
  });
}



