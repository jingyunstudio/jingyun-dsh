import { exec, execFile } from 'child_process';
import { promisify } from 'util';

import { cliManager } from './cli-manager';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export interface MobileDeviceInfo {
  id: string;
  state: 'device' | 'offline' | 'unauthorized';
  model: string;
  product?: string;
  type: 'usb' | 'wifi';
}

export interface MobileStatusResult {
  installed: boolean;
  adbPath?: string;
  devices: MobileDeviceInfo[];
}

export class MobileService {
  /**
   * 判断是否属于无线通道（局域网 IP:Port 直连）
   */
  private isWirelessTarget(id: string): boolean {
    return id.includes(':');
  }

  /**
   * 解析 adb devices -l 原始输出为结构化设备列表
   * 彻底过滤 mDNS 自动检测生成的非标准/带括号实例，仅保留物理 USB 与显式 IP 直连设备
   */
  private parseDevicesOutput(output: string): MobileDeviceInfo[] {
    const lines = output.split('\n');
    const result: MobileDeviceInfo[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('List of devices attached')) continue;

      const match = line.match(
        /^(.+?)\s+(device|offline|unauthorized)\s*(.*)$/
      );
      if (!match) continue;

      const id = match[1].trim();

      // 彻底过滤掉任何 mDNS 自动发现生成的虚拟实例（含有 _adb-tls-connect、_tcp 或以 adb- 开头）
      if (
        id.includes('_adb-tls-connect') ||
        id.includes('._tcp') ||
        id.startsWith('adb-')
      ) {
        continue;
      }

      const state = match[2] as MobileDeviceInfo['state'];
      const rest = match[3];

      let model = id;
      let product: string | undefined;

      const props = rest.split(/\s+/);
      for (const prop of props) {
        if (prop.startsWith('model:')) {
          model = prop.substring(6).replace(/_/g, ' ');
        } else if (prop.startsWith('product:')) {
          product = prop.substring(8);
        }
      }

      result.push({
        id,
        state,
        model,
        product,
        type: this.isWirelessTarget(id) ? 'wifi' : 'usb',
      });
    }

    return result;
  }

  /**
   * 获取当前 ADB 状态及去重整合后的设备列表
   */
  public async getStatus(): Promise<MobileStatusResult> {
    const adbExec = cliManager.resolveAdbExec();
    if (!adbExec) {
      return {
        installed: false,
        devices: [],
      };
    }

    const { stdout } = await execAsync(`"${adbExec}" devices -l`, {
      env: cliManager.getEnv(),
      timeout: 10000,
    });

    const devices = this.parseDevicesOutput(stdout);

    return {
      installed: true,
      adbPath: adbExec,
      devices,
    };
  }

  /**
   * 通过局域网 IP:端口 进行无线连接
   */
  public async connectWifi(
    host: string,
    port: number = 5555
  ): Promise<{ message: string }> {
    const adbExec = cliManager.ensureAdbExec();
    const cleanHost = host.trim();
    if (!cleanHost) {
      throw new Error('手机 IP 地址不能为空');
    }

    const target = `${cleanHost}:${port}`;
    const { stdout, stderr } = await execAsync(
      `"${adbExec}" connect ${target}`,
      {
        env: cliManager.getEnv(),
        timeout: 15000,
      }
    );

    const out = (stdout || stderr).trim();
    const isSuccess =
      out.includes('connected to') && !out.includes('failed to connect');

    if (!isSuccess) {
      throw new Error(out || `连接 ${target} 失败`);
    }

    return {
      message: `已成功连接 ${target}`,
    };
  }

  /**
   * 通过 Android 11+ 六位配对码与临时配对端口进行配对 (adb pair)
   */
  public async pairWifi(
    host: string,
    port: number,
    code: string
  ): Promise<{ message: string }> {
    const adbExec = cliManager.ensureAdbExec();
    const cleanHost = host.trim();
    const cleanCode = code.trim();
    if (!cleanHost) {
      throw new Error('手机 IP 地址不能为空');
    }
    if (!cleanCode) {
      throw new Error('配对码不能为空（通常为 6 位数字）');
    }

    const target = `${cleanHost}:${port}`;
    const { stdout, stderr } = await execAsync(
      `"${adbExec}" pair ${target} ${cleanCode}`,
      {
        env: cliManager.getEnv(),
        timeout: 15000,
      }
    );

    const out = (stdout || stderr).trim();
    const isSuccess =
      out.toLowerCase().includes('successfully paired') &&
      !out.toLowerCase().includes('failed');

    if (!isSuccess) {
      throw new Error(
        out || '配对失败：请保持手机配对弹窗打开并检查配对码与端口'
      );
    }

    return {
      message: '配对成功！请输入无线调试主页的连接端口完成连接',
    };
  }

  /**
   * 开启指定设备的 TCP/IP 无线模式 (如 5555 端口)
   */
  public async enableTcpIp(
    deviceId?: string,
    port: number = 5555
  ): Promise<{ message: string }> {
    const adbExec = cliManager.ensureAdbExec();
    const cmd = deviceId
      ? `"${adbExec}" -s "${deviceId}" tcpip ${port}`
      : `"${adbExec}" tcpip ${port}`;

    const { stdout, stderr } = await execAsync(cmd, {
      env: cliManager.getEnv(),
      timeout: 10000,
    });

    const out = (stdout || stderr).trim();
    if (!out.includes('restarting in TCP mode')) {
      throw new Error(out || '开启无线调试端口失败');
    }

    return {
      message: `已开启 ${port} 无线端口，可拔掉数据线连接`,
    };
  }

  /**
   * 断开指定无线设备的连接（自动将该物理设备下的全部镜像通道一并干净断开）
   */
  public async disconnect(target: string): Promise<{ message: string }> {
    const adbExec = cliManager.ensureAdbExec();
    const cleanTarget = target.trim();
    if (!cleanTarget) {
      throw new Error('断开目标不能为空');
    }

    await execAsync(`"${adbExec}" disconnect "${cleanTarget}"`, {
      env: cliManager.getEnv(),
      timeout: 10000,
    });

    return {
      message: `已断开 ${cleanTarget}`,
    };
  }

  /**
   * 截取手机当前屏幕快照 (PNG Buffer)
   */
  public async screenshot(deviceId?: string): Promise<Buffer> {
    const adbExec = cliManager.ensureAdbExec();
    const args = deviceId
      ? ['-s', deviceId, 'exec-out', 'screencap', '-p']
      : ['exec-out', 'screencap', '-p'];

    const { stdout } = await execFileAsync(adbExec, args, {
      env: cliManager.getEnv(),
      encoding: 'buffer',
      maxBuffer: 20 * 1024 * 1024,
      timeout: 15000,
    });

    if (!stdout || stdout.length === 0) {
      throw new Error('截屏数据为空，请确认设备已唤醒并保持解锁');
    }

    return stdout;
  }
}

export const mobileService = new MobileService();
