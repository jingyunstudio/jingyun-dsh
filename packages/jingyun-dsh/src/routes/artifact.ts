import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

function cleanAndNormalizeFilePath(rawPath: string): string {
  let cleaned = rawPath.trim();
  if (/^file:\/\//i.test(cleaned)) {
    cleaned = decodeURIComponent(cleaned.replace(/^file:\/\/\/?/i, ''));
  }
  if (process.platform === 'win32' && /^\/[a-zA-Z]:[/\\]/.test(cleaned)) {
    cleaned = cleaned.slice(1);
  }
  return path.normalize(cleaned);
}

import type { Context } from '@deepseek-ai/cordis';

import { sendJson, sendError } from '../common/http';
import { getDshHome } from '../common/paths';

export function registerArtifactRoutes(ctx: Context) {
  // 1. 根据会话 ID 匹配底座物理工作区绝对路径并安全读取物理文件
  ctx.webServer.register({
    kind: 'prefix',
    path: '/api/jingyun/artifact/read',
    handler: async (req, res) => {
      try {
        const reqUrl = new URL(
          req.url || '',
          `http://${req.headers.host || 'localhost'}`
        );
        const fileName = reqUrl.searchParams.get('file') || reqUrl.searchParams.get('path') || '';
        const rawSessionId = reqUrl.searchParams.get('sessionId') || '';

        if (!fileName) {
          sendError(res, 'Missing parameter: file', 400);
          return;
        }

        const directNormalized = cleanAndNormalizeFilePath(fileName);
        if (
          (path.isAbsolute(directNormalized) ||
            (process.platform === 'win32' && /^[a-zA-Z]:[/\\]/.test(directNormalized))) &&
          fs.existsSync(directNormalized)
        ) {
          try {
            if (fs.statSync(directNormalized).isFile()) {
              const fileContent = fs.readFileSync(directNormalized, 'utf8');
              sendJson(res, {
                success: true,
                fileName: path.basename(directNormalized),
                path: directNormalized,
                content: fileContent,
              });
              return;
            }
          } catch (err: any) {
            console.warn('[UIBranding] Direct read failed:', err.message);
          }
        }

        const candidateHomes = new Set<string>();
        const envHome =
          process.env.DSH_HOME?.trim() || process.env.DSH_CONFIG_DIR?.trim();
        if (envHome) candidateHomes.add(path.resolve(envHome));
        candidateHomes.add(path.resolve(os.homedir(), '.dsh'));
        candidateHomes.add(path.resolve(os.homedir(), '.deepseek-harness'));
        try {
          candidateHomes.add(getDshHome());
        } catch {}
        candidateHomes.add(path.resolve(process.cwd(), 'data'));
        candidateHomes.add(process.cwd());

        let resolvedWorkspacePath = '';
        const allWorkspaces: string[] = [];
        const cleanSessionId = rawSessionId.replace(/^session-/, '').trim();

        for (const homeDir of candidateHomes) {
          if (!fs.existsSync(homeDir)) continue;

          const projCacheFile = path.resolve(homeDir, 'storages', 'session_projcache.json');
          if (fs.existsSync(projCacheFile)) {
            try {
              const cacheData = JSON.parse(fs.readFileSync(projCacheFile, 'utf8'));
              const sessionRows = cacheData?.tables?.sessions || {};
              for (const [sId, item] of Object.entries<any>(sessionRows)) {
                const cwd = item?.identity?.cwd;
                if (cwd && fs.existsSync(cwd)) {
                  if (!allWorkspaces.includes(cwd)) allWorkspaces.push(cwd);
                  if (
                    !resolvedWorkspacePath &&
                    cleanSessionId &&
                    (sId.includes(cleanSessionId) || cleanSessionId.includes(sId.replace(/^session-/, '')))
                  ) {
                    resolvedWorkspacePath = cwd;
                  }
                }
              }
            } catch {}
          }

          const wsFile = path.resolve(homeDir, 'storages', 'workspace.json');
          if (fs.existsSync(wsFile)) {
            try {
              const wsData = JSON.parse(fs.readFileSync(wsFile, 'utf8'));
              const wsRows = wsData?.tables?.workspaces || {};
              for (const [, entry] of Object.entries<any>(wsRows)) {
                const p = entry?.path;
                if (p && fs.existsSync(p)) {
                  if (!allWorkspaces.includes(p)) allWorkspaces.push(p);
                  if (!resolvedWorkspacePath && cleanSessionId && Array.isArray(entry.sessionIds)) {
                    if (entry.sessionIds.some((id: string) => id.includes(cleanSessionId))) {
                      resolvedWorkspacePath = p;
                    }
                  }
                }
              }
            } catch {}
          }
        }

        if (!resolvedWorkspacePath && allWorkspaces.length > 0) {
          resolvedWorkspacePath = allWorkspaces[0];
        }
        const cleanFileName = fileName.replace(/^\.?\/+/, '').trim();
        let targetFilePath = path.resolve(resolvedWorkspacePath, cleanFileName);

        if (
          !fs.existsSync(targetFilePath) ||
          !fs.statSync(targetFilePath).isFile()
        ) {
          let scannedCount = 0;
          const findFileRecursively = (
            dir: string,
            targetName: string,
            depth = 0
          ): string | null => {
            if (depth > 6) return null;
            if (scannedCount > 3000) return null;
            try {
              const files = fs.readdirSync(dir);
              const subdirs: string[] = [];

              // 1. 优先扫描当前层所有文件，以极速直接命中
              for (const f of files) {
                scannedCount++;
                if (
                  f === 'node_modules' ||
                  f === '.git' ||
                  f === 'dist' ||
                  f === '.dsh' ||
                  f === '.trae' ||
                  f === '.gemini'
                )
                  continue;
                const full = path.join(dir, f);
                let stat;
                try {
                  stat = fs.statSync(full);
                } catch {
                  continue;
                }

                if (
                  stat.isFile() &&
                  f.toLowerCase() === targetName.toLowerCase()
                ) {
                  return full;
                }
                if (stat.isDirectory()) {
                  subdirs.push(full);
                }
              }

              // 2. 当前层未命中时，再依次展开子目录深度搜索
              for (const subdir of subdirs) {
                const found = findFileRecursively(
                  subdir,
                  targetName,
                  depth + 1
                );
                if (found) return found;
              }
            } catch {}
            return null;
          };

          let fallbackFound: string | null = null;
          const baseName = path.basename(cleanFileName);
          if (resolvedWorkspacePath) {
            fallbackFound = findFileRecursively(resolvedWorkspacePath, baseName);
          }
          if (!fallbackFound) {
            for (const ws of allWorkspaces) {
              if (ws === resolvedWorkspacePath) continue;
              fallbackFound = findFileRecursively(ws, baseName);
              if (fallbackFound) break;
            }
          }
          if (fallbackFound) {
            targetFilePath = fallbackFound;
          }
        }

        if (
          !fs.existsSync(targetFilePath) ||
          !fs.statSync(targetFilePath).isFile()
        ) {
          console.warn(
            `[UIBranding] Target physical file does not exist: ${targetFilePath}`
          );
          sendError(
            res,
            `Physical file "${fileName}" not found in workspace (${resolvedWorkspacePath})`,
            404
          );
          return;
        }

        const fileContent = fs.readFileSync(targetFilePath, 'utf8');
        console.log(
          `[UIBranding] Successfully read real physical file: ${targetFilePath}`
        );

        sendJson(res, {
          success: true,
          fileName: path.basename(targetFilePath),
          path: targetFilePath,
          content: fileContent,
        });
      } catch (err: any) {
        console.error(
          '[UIBranding] Read physical artifact failed:',
          err.message
        );
        sendError(res, err.message);
      }
    },
  });

  // 2. 打开系统文件管理器并选中目标文件
  ctx.webServer.register({
    kind: 'prefix',
    path: '/api/jingyun/artifact/reveal',
    handler: async (req, res) => {
      try {
        const reqUrl = new URL(
          req.url || '',
          `http://${req.headers.host || 'localhost'}`
        );
        const rawPath = reqUrl.searchParams.get('path') || '';
        const filePath = cleanAndNormalizeFilePath(rawPath);
        if (filePath && fs.existsSync(filePath)) {
          if (process.platform === 'win32') {
            spawn('explorer.exe', [`/select,${filePath}`], {
              detached: true,
              stdio: 'ignore',
            }).unref();
          } else if (process.platform === 'darwin') {
            spawn('open', ['-R', filePath], {
              detached: true,
              stdio: 'ignore',
            }).unref();
          } else {
            spawn('xdg-open', [path.dirname(filePath)], {
              detached: true,
              stdio: 'ignore',
            }).unref();
          }
          sendJson(res, { success: true });
          return;
        }
        sendError(res, 'Target file not found', 404);
      } catch (err: any) {
        sendError(res, err.message);
      }
    },
  });

  // 3. 在系统默认程序中打开物理文件
  ctx.webServer.register({
    kind: 'prefix',
    path: '/api/jingyun/artifact/open-external',
    handler: async (req, res) => {
      try {
        const reqUrl = new URL(
          req.url || '',
          `http://${req.headers.host || 'localhost'}`
        );
        const rawPath = reqUrl.searchParams.get('path') || '';
        const filePath = cleanAndNormalizeFilePath(rawPath);
        if (filePath && fs.existsSync(filePath)) {
          if (process.platform === 'win32') {
            spawn('cmd.exe', ['/c', 'start', '', filePath], {
              detached: true,
              stdio: 'ignore',
            }).unref();
          } else if (process.platform === 'darwin') {
            spawn('open', [filePath], {
              detached: true,
              stdio: 'ignore',
            }).unref();
          } else {
            spawn('xdg-open', [filePath], {
              detached: true,
              stdio: 'ignore',
            }).unref();
          }
          sendJson(res, { success: true });
          return;
        }
        sendError(res, 'Target file not found', 404);
      } catch (err: any) {
        sendError(res, err.message);
      }
    },
  });
}
