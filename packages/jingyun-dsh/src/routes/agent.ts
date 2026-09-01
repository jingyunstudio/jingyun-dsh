import type { Context } from '@deepseek-ai/cordis';

import {
  getSessionAgentsConfig,
  saveSessionAgentsConfig,
} from '../agent/manager';
import { sendJson, sendError } from '../common/http';

export function registerAgentRoutes(ctx: Context) {
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/jingyun/agent/activate',
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        return;
      }

      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const { agentId, sessionId } = payload;

          if (!agentId || !sessionId) {
            throw new Error('Missing parameter: agentId or sessionId');
          }

          const config = getSessionAgentsConfig();
          config.sessions[sessionId] = agentId;

          if (sessionId === 'default') {
            config.globalDefault = agentId;
          }

          saveSessionAgentsConfig(config);
          console.log(
            `[UIBranding] Session ${sessionId} agent activated to: ${agentId}`
          );

          sendJson(res, {
            success: true,
            message: 'Agent activated successfully.',
          });
        } catch (err: any) {
          console.error('[UIBranding] Failed to activate agent:', err.message);
          sendError(res, err.message);
        }
      });
    },
  });
}
