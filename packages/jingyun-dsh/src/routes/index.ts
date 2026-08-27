import { Context } from '@deepseek-ai/cordis'
import { Config } from '../config/schema'
import { registerBrandingRoutes } from './branding'
import { registerAgentRoutes } from './agent'
import { registerAssetsRoutes } from './assets'
import { registerSkillsRoutes } from './skills'
import { registerPluginsRoutes } from './plugins'
import { registerConnectorsRoutes } from './connectors'
import { registerArtifactRoutes } from './artifact'
import { registerSystemRoutes } from './system'

export function registerRoutes(ctx: Context, config: Config) {
  registerBrandingRoutes(ctx, config)
  registerAgentRoutes(ctx)

  registerAssetsRoutes(ctx)
  registerSkillsRoutes(ctx)
  registerPluginsRoutes(ctx)
  registerConnectorsRoutes(ctx)
  registerArtifactRoutes(ctx)
  registerSystemRoutes(ctx)
}
