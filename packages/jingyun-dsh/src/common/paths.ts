import fs from 'fs';
import os from 'os';
import path from 'path';

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
 * 获取 jingyun-config.json 配置文件路径（单源真理，读写一致）
 */
export function getJingyunConfigPath(): string {
  return path.join(getDshHome(), 'jingyun-config.json');
}

/**
 * 安全读取 jingyun-config.json 配置文件，返回解析后的 JSON 对象，失败返回空对象
 */
export function readJingyunConfig(): Record<string, any> {
  const configPath = getJingyunConfigPath();
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
  config?: { appHost?: string; tenantHost?: string; apiUrl?: string },
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

  const localData = readJingyunConfig();
  const host =
    localData.app_host ||
    localData.domain ||
    localData.tenant_host ||
    localData.api_url ||
    config?.appHost ||
    config?.tenantHost ||
    config?.apiUrl ||
    '';

  return host ? host.replace(/\/+$/, '') : '';
}
