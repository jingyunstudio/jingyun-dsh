import { spawn } from 'child_process';

import type { Context } from '@deepseek-ai/cordis';

import { sendJson, sendError } from '../common/http';

function scheduleRestartDsh(port = 3080) {
  try {
    const nodeExec = process.execPath || 'node';
    const args = process.argv.slice(1);
    const cwd = process.cwd();

    const helperCode = `
      const { spawn } = require('node:child_process');
      const net = require('node:net');
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const checkPort = () => new Promise(res => {
        const s = net.connect({ host: '127.0.0.1', port: ${port} });
        s.on('connect', () => { s.destroy(); res(true); });
        s.on('error', () => res(false));
        setTimeout(() => res(false), 300);
      });

      (async () => {
        let count = 0;
        while (count++ < 40 && await checkPort()) {
          await sleep(200);
        }
        await sleep(400);

        const child = spawn(${JSON.stringify(nodeExec)}, ${JSON.stringify(args)}, {
          cwd: ${JSON.stringify(cwd)},
          detached: true,
          stdio: 'ignore',
          env: process.env,
          shell: process.platform === 'win32'
        });
        child.unref();
      })();
    `;

    const helper = spawn(nodeExec, ['-e', helperCode], {
      detached: true,
      stdio: 'ignore',
      env: process.env,
    });
    helper.unref();

    setTimeout(() => {
      process.exit(0);
    }, 400);
  } catch (e: any) {
    console.error('[UIBranding] Failed to schedule restart:', e.message);
  }
}

export function registerSystemRoutes(ctx: Context) {
  // 1. 平滑自愈重启底座服务接口
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/restart',
    handler: async (req, res) => {
      try {
        const hostHeader = req.headers.host || '127.0.0.1:3080';
        const portMatch = /:(\d+)$/.exec(hostHeader);
        const port = portMatch ? parseInt(portMatch[1], 10) : 3080;

        sendJson(res, {
          success: true,
          message: 'DSH host service restarting smoothly...',
        });

        console.log(
          `[UIBranding] Received restart request on port ${port}, scheduling smooth restart...`
        );
        scheduleRestartDsh(port);
      } catch (err: any) {
        sendError(res, err.message);
      }
    },
  });
}
