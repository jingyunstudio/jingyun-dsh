import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * 获取 DSH 根主目录（优先读取 DSH_HOME 环境变量，支持便携模式）
 */
export function getDshHome(): string {
  const envHome = process.env.DSH_HOME?.trim();
  if (envHome) {
    return path.resolve(envHome);
  }
  const envConfigDir = process.env.DSH_CONFIG_DIR?.trim();
  if (envConfigDir) {
    return path.resolve(envConfigDir);
  }
  return path.resolve(os.homedir(), '.dsh');
}

/**
 * 判断是否处于便携模式
 */
export function isPortableMode(): boolean {
  return process.env.DSH_PORTABLE === '1' || process.env.PORTABLE === '1';
}

/**
 * 获取 jingyun-config.json 读取路径
 * 优先从 DSH_HOME 目录中读取自定义覆盖配置，若不存在则回退读取内置默认配置
 */
export function getJingyunConfigPath(fallbackDir: string): string {
  const dshHome = getDshHome();
  const customConfig = path.join(dshHome, 'jingyun-config.json');
  if (fs.existsSync(customConfig)) {
    return customConfig;
  }
  return path.resolve(fallbackDir, '..', 'jingyun-config.json');
}

/**
 * 获取 jingyun-config.json 写入目标路径
 * 写操作优先保存到 DSH_HOME，确保便携版与安装版配置完全独立且升级不被覆盖
 */
export function getJingyunConfigWritePath(fallbackDir: string): string {
  const dshHome = getDshHome();
  const customConfig = path.join(dshHome, 'jingyun-config.json');
  if (
    fs.existsSync(customConfig) ||
    isPortableMode() ||
    fs.existsSync(dshHome)
  ) {
    if (!fs.existsSync(dshHome)) {
      try {
        fs.mkdirSync(dshHome, { recursive: true });
      } catch (e) {}
    }
    return customConfig;
  }
  return path.resolve(fallbackDir, '..', 'jingyun-config.json');
}
