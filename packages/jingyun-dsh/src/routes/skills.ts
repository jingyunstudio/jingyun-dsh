import fs from 'fs';
import os from 'os';
import path from 'path';

import type { Context } from '@deepseek-ai/cordis';

import { baseHome } from '../agent/manager';
import { extractZipSafe } from '../common/fs';
import { sendJson, sendError } from '../common/http';

export function registerSkillsRoutes(ctx: Context) {
  // 1. 获取 ClawHub 技能列表 API
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/skills',
    handler: async (req, res) => {
      try {
        const reqUrl = req.url || '';
        const queryParams = new URL(reqUrl, 'http://localhost').searchParams;
        const keyword = queryParams.get('keyword') || '';
        const marker =
          queryParams.get('marker') || queryParams.get('cursor') || '';
        const limit = parseInt(queryParams.get('limit') || '30', 10);

        let clawResults: any[] = [];
        let nextMarker = '';

        try {
          let targetUrl = `https://cn.clawhub-mirror.com/api/v1/search?q=${encodeURIComponent(keyword)}&limit=${limit}`;
          if (marker) targetUrl += `&marker=${encodeURIComponent(marker)}`;

          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            },
          });
          if (response.ok) {
            const json = await response.json();
            clawResults = Array.isArray(json.results) ? json.results : [];
            nextMarker = json.nextMarker || json.cursor || '';
          }
        } catch (fetchErr: any) {
          console.warn(
            '[UIBranding] Failed to contact online ClawHub mirror API:',
            fetchErr.message
          );
        }

        const localSkillsPath = path.resolve(baseHome, 'skills');
        let installedSlugs: string[] = [];
        if (fs.existsSync(localSkillsPath)) {
          installedSlugs = fs.readdirSync(localSkillsPath).filter((name) => {
            const fullPath = path.join(localSkillsPath, name);
            return fs.statSync(fullPath).isDirectory();
          });
        }

        const installedSlugsLower = installedSlugs.map((s) => s.toLowerCase());

        const mappedSkills = clawResults.map((item: any) => {
          const slug = item.slug || '';
          const isInstalled = installedSlugsLower.includes(slug.toLowerCase());

          return {
            id: slug,
            slug,
            name: item.displayName || slug,
            category: 'skill',
            sub_category: 'ClawHub',
            category_name: 'ClawHub',
            version: item.version || '1.0.0',
            icon_url: item.icon || '',
            author: item.owner || item.author || 'ClawHub',
            downloads: item.score || 0,
            status: isInstalled ? 'installed' : 'not_installed',
            price: 0,
            source: 'clawhub',
            tags: ['ClawHub'],
            download_url: `https://cn.clawhub-mirror.com/api/v1/download?slug=${encodeURIComponent(slug)}`,
            description: item.summary || '暂无详细描述。',
          };
        });

        if (!marker) {
          const mappedSlugsLower = mappedSkills.map((s: any) =>
            s.id.toLowerCase()
          );
          installedSlugs.forEach((slug) => {
            if (!mappedSlugsLower.includes(slug.toLowerCase())) {
              let friendlyName = slug;
              let desc = '本地已下载启用的自定义扩展技能。';

              const skillDir = path.join(localSkillsPath, slug);
              try {
                const skillMdPath = path.join(skillDir, 'SKILL.md');
                if (fs.existsSync(skillMdPath)) {
                  const content = fs.readFileSync(skillMdPath, 'utf8');
                  const titleMatch = content.match(/title:\s*([^\r\n]+)/);
                  const descMatch = content.match(/description:\s*([^\r\n]+)/);
                  if (titleMatch && titleMatch[1]) {
                    friendlyName = titleMatch[1].replace(/['"]/g, '').trim();
                  }
                  if (descMatch && descMatch[1]) {
                    desc = descMatch[1].replace(/['"]/g, '').trim();
                  }
                }
              } catch (e: any) {
                console.warn(
                  `[UIBranding] Failed to read SKILL.md for local slug "${slug}":`,
                  e.message
                );
              }

              mappedSkills.push({
                id: slug,
                slug,
                name: friendlyName,
                category: 'skill',
                sub_category: '本地自研',
                category_name: '本地自研',
                status: 'installed',
                price: 0,
                source: 'local',
                description: desc,
              });
            }
          });
        }

        const hasMore = Boolean(nextMarker) || clawResults.length >= limit;
        sendJson(res, {
          success: true,
          data: mappedSkills,
          nextMarker: nextMarker,
          hasMore: hasMore,
        });
      } catch (err: any) {
        sendError(res, err.message);
      }
    },
  });

  // 2. 安装 ClawHub 技能 API
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/skills/install',
    handler: async (req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const { slug } = payload;
          if (!slug) {
            throw new Error('Missing parameter: slug');
          }

          console.log(`[UIBranding] Installing ClawHub skill "${slug}"...`);

          const tempDir = path.resolve(os.tmpdir(), 'jingyun-scratch');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          const tempZipPath = path.join(tempDir, `${slug}.zip`);

          const downloadUrl = `https://cn.clawhub-mirror.com/api/v1/download?slug=${encodeURIComponent(slug)}`;
          const downloadRes = await fetch(downloadUrl);
          if (!downloadRes.ok) {
            throw new Error(
              `Failed to download skill from mirror: ${downloadRes.status}`
            );
          }

          const arrayBuffer = await downloadRes.arrayBuffer();
          fs.writeFileSync(tempZipPath, Buffer.from(arrayBuffer));

          const destPath = path.resolve(baseHome, 'skills', slug);
          if (fs.existsSync(destPath)) {
            fs.rmSync(destPath, { recursive: true, force: true });
          }
          fs.mkdirSync(destPath, { recursive: true });

          await extractZipSafe(tempZipPath, destPath);

          if (fs.existsSync(tempZipPath)) {
            fs.unlinkSync(tempZipPath);
          }

          console.log(
            `[UIBranding] Skill "${slug}" installed directly to ~/.dsh/skills successfully.`
          );
          sendJson(res, {
            success: true,
            message: `Skill ${slug} installed successfully.`,
          });
        } catch (err: any) {
          console.error('[UIBranding] Skill installation failed:', err.message);
          sendError(res, err.message);
        }
      });
    },
  });
}
