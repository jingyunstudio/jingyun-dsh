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
