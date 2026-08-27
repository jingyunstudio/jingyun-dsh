import Schema from '@deepseek-ai/schemastery'

export interface Config {
  mode: 'cloud' | 'local'
  apiUrl: string
  tenantHost: string
  appHost: string
  customName: string
  customLogo: string
}

export const Config: Schema<Config> = Schema.object({
  mode: Schema.union([Schema.const('cloud'), Schema.const('local')]).default('cloud').description('配置定制来源模式：cloud (云端同步品牌数据) 或 local (本地完全离线自定义)'),
  apiUrl: Schema.string().default('').description('服务接口地址。留空默认需手动配置。'),
  tenantHost: Schema.string().default('').description('租户唯一 Slug 标识。留空默认需手动配置。'),
  appHost: Schema.string().default('').description('终端访问域名或地址。留空默认需手动配置。'),
  customName: Schema.string().default('').description('离线自定义模式下系统展示的站点名称。留空默认展示原生标识。'),
  customLogo: Schema.string().default('').description('离线自定义模式下系统展示的 Logo 图片链接或 Base64 编码。留空默认展示原生标识。')
})
