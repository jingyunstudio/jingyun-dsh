import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
/**
 * 获取 DSH 数据根目录
 * 优先级：
 * 1. 显式设置的 DSH_HOME / DSH_CONFIG_DIR 环境变量
 * 2. 当前工作目录下的 ./data（便携模式开发与运行一致）
 * 3. 兜底回退系统用户目录 ~/.dsh
 */
export function getDshHome(): string {
  const envHome =
    process.env.DSH_HOME?.trim() || process.env.DSH_CONFIG_DIR?.trim();
  if (envHome) {
    return path.resolve(envHome);
  }

  const localData = path.resolve(process.cwd(), 'data');
  if (fs.existsSync(localData)) {
    return localData;
  }

  return path.resolve(os.homedir(), '.dsh');
}
/**
 * 获取 DSH 可执行工具目录 ($DSH_HOME/bin)
 */
export function getDshBinDir(): string {
  return path.join(getDshHome(), 'bin');
}
/**
 * 获取连接器存储目录 ($DSH_HOME/connectors)
 */
export function getConnectorsDir(): string {
  return path.join(getDshHome(), 'connectors');
}

/**
 * 获取飞书 CLI 认证与配置目录 ($DSH_HOME/connectors/lark)
 */
export function getLarkConfigDir(): string {
  return path.join(getConnectorsDir(), 'lark');
}

/**
 * 获取企业微信连接器配置目录 ($DSH_HOME/connectors/wecom)
 */
export function getWecomConfigDir(): string {
  return path.join(getConnectorsDir(), 'wecom');
}

/**
 * 获取钉钉连接器配置目录 ($DSH_HOME/connectors/dingtalk)
 */
export function getDingtalkConfigDir(): string {
  return path.join(getConnectorsDir(), 'dingtalk');
}
/**
 * 获取 ima 知识库连接器配置目录 ($DSH_HOME/connectors/ima)
 */
export function getImaConfigDir(): string {
  return path.join(getConnectorsDir(), 'ima');
}
/**
 * 获取微信助理连接器配置目录 ($DSH_HOME/connectors/weixin)
 */
export function getWeixinConfigDir(): string {
  return path.join(getConnectorsDir(), 'weixin');
}
/**
 * 获取助理会话与消息存储目录 ($DSH_HOME/assistant)
 */
export function getAssistantDataDir(): string {
  return path.join(getDshHome(), 'assistant');
}

/**
 * 获取插件包根目录
 */
export function getPluginDir(): string {
  try {
    const cur =
      typeof __dirname !== 'undefined'
        ? __dirname
        : path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(cur, '..');
  } catch {
    return process.cwd();
  }
}

/**
 * 获取桌面端配置文件路径 ($DSH_HOME/desktop-config.json 或 插件目录/desktop-config.json)
 */
export function getDesktopConfigPath(): string {
  const dshHome = getDshHome();
  const dshDesktop = path.join(dshHome, 'desktop-config.json');
  if (fs.existsSync(dshDesktop)) return dshDesktop;

  const pluginDir = getPluginDir();
  const pluginDesktop = path.join(pluginDir, 'desktop-config.json');
  if (fs.existsSync(pluginDesktop)) return pluginDesktop;

  return dshDesktop;
}

/**
 * 读取桌面端配置文件
 */
export function readDesktopConfig(): Record<string, any> {
  const configPath = getDesktopConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {}
  }
  return {};
}
/**
 * 统一解析远端服务 Host（优先级：请求 query -> 磁盘配置 -> 内存配置，不设兜底）
 */
export function getRemoteBaseUrl(
  config?: { appHost?: string },
  reqUrl?: string
): string {
  if (reqUrl) {
    try {
      const parsed = new URL(reqUrl, 'http://localhost');
      const target = parsed.searchParams.get('targetBaseUrl');
      if (target && target.trim()) {
        return target.trim().replace(/\/+$/, '');
      }
    } catch {}
  }

  const localData = readDesktopConfig();
  const host = localData.app_host || localData.domain || config?.appHost || '';

  return host ? host.replace(/\/+$/, '') : '';
}
