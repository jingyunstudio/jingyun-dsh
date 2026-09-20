import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * 解密企微多模态附件 (AES-256-CBC, IV 为 Key 前 16 字节, PKCS#7 填充)
 */
export function decryptWecomMedia(
  encryptedBuf: Buffer,
  aeskey: string
): Buffer {
  const key = Buffer.from(aeskey, 'base64');
  const iv = key.subarray(0, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  decipher.setAutoPadding(false);

  const decrypted = Buffer.concat([
    decipher.update(encryptedBuf),
    decipher.final(),
  ]);

  const pad = decrypted[decrypted.length - 1];
  if (pad < 1 || pad > 32 || pad > decrypted.length) {
    throw new Error(`Invalid PKCS#7 padding: ${pad}`);
  }
  for (let i = decrypted.length - pad; i < decrypted.length; i++) {
    if (decrypted[i] !== pad) {
      throw new Error('Invalid PKCS#7 padding mismatch');
    }
  }

  return decrypted.subarray(0, decrypted.length - pad);
}

/**
 * 下载企微媒体文件并自动解密暂存至本地临时目录
 */
export async function downloadWecomMedia(
  url: string,
  aeskey?: string,
  filenameOrExt = '.bin'
): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    throw new Error(`Failed to download media: HTTP ${res.status}`);
  }

  const rawBuf = Buffer.from(await res.arrayBuffer());
  const finalBuf = aeskey ? decryptWecomMedia(rawBuf, aeskey) : rawBuf;

  const tempDir = path.join(os.tmpdir(), 'jingyun-wecom-media');
  await fs.mkdir(tempDir, { recursive: true });

  const ext =
    path.extname(filenameOrExt) ||
    (filenameOrExt.startsWith('.') ? filenameOrExt : '.bin');
  const outPath = path.join(
    tempDir,
    `wecom_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`
  );

  await fs.writeFile(outPath, finalBuf);
  return outPath;
}
