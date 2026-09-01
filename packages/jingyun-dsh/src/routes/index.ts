import type { Context } from '@deepseek-ai/cordis';

import type { Config } from '../config/schema';
import { registerAgentRoutes } from './agent';
import { registerArtifactRoutes } from './artifact';
import { registerAssetsRoutes } from './assets';
import { registerBrandingRoutes } from './branding';
import { registerConnectorsRoutes } from './connectors';
import { registerPluginsRoutes } from './plugins';
import { registerSkillsRoutes } from './skills';
import { registerSystemRoutes } from './system';

export function registerRoutes(ctx: Context, config: Config) {
  registerBrandingRoutes(ctx, config);
  registerAgentRoutes(ctx);

  registerAssetsRoutes(ctx);
  registerSkillsRoutes(ctx);
  registerPluginsRoutes(ctx);
  registerConnectorsRoutes(ctx);
  registerArtifactRoutes(ctx);
  registerSystemRoutes(ctx);
}
