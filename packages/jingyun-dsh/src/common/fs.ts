import { exec } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 安全移入系统回收站：严格保证只移入回收站，严禁任何物理直接删除
 */
export async function moveToRecycleBin(dirPath: string): Promise<void> {
  if (!fs.existsSync(dirPath)) return;

  if (process.platform === 'win32') {
    // Windows: 严格使用 Microsoft.VisualBasic API 将目录移入桌面回收站
    const psCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory('${dirPath}', 'OnlyErrorDialogs', 'SendToRecycleBin')"`;
    await execAsync(psCmd);
  } else if (process.platform === 'darwin') {
    // macOS: 移动到废纸篓 (Trash)
    await execAsync(
      `osascript -e 'tell application "Finder" to delete POSIX file "${dirPath}"'`
    );
  } else {
    // Linux: 移动到回收站
    await execAsync(`gio trash "${dirPath}"`);
  }

  // 严格校验：若未能成功移入回收站，直接抛出错误，严禁物理直接粉碎删除
  if (fs.existsSync(dirPath)) {
    throw new Error('未能成功卸载，建议手动删除');
  }
}

/**
 * 跨平台安全解压 ZIP 文件到目标目录
 */
export async function extractZipSafe(
  zipPath: string,
  destDir: string
): Promise<void> {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  if (process.platform === 'win32') {
    const escapedZip = zipPath.replace(/'/g, "''");
    const escapedDest = destDir.replace(/'/g, "''");
    const cmd = `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${escapedZip}' -DestinationPath '${escapedDest}' -Force"`;
    await execAsync(cmd);
  } else {
    // macOS / Linux 优先使用 unzip
    const escapedZip = zipPath.replace(/"/g, '\\"');
    const escapedDest = destDir.replace(/"/g, '\\"');
    const cmd = `unzip -q -o "${escapedZip}" -d "${escapedDest}"`;
    await execAsync(cmd);
  }
}
