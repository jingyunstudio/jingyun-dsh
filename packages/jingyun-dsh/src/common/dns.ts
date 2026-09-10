import dns from 'node:dns';

/**
 * 符合 RFC 6761 规范：将 localhost 及其所有子域名（如 *.localhost）在 Node.js 解析层
 * 统一路由至本地回环地址（127.0.0.1 / ::1），防止被操作系统上游 DNS、Fake IP 或代理软件拦截导致连接失败。
 */
export function setupLoopbackDns(): void {
  const origLookup = dns.lookup;
  const customLookup: any = function (
    this: any,
    hostname: any,
    options: any,
    callback: any
  ) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    } else if (typeof options === 'number') {
      options = { family: options };
    }

    if (typeof hostname === 'string') {
      const lower = hostname.toLowerCase();
      if (lower === 'localhost' || lower.endsWith('.localhost')) {
        const family = options?.family === 6 ? 6 : 4;
        const ip = family === 6 ? '::1' : '127.0.0.1';
        if (options?.all) {
          return callback(null, [{ address: ip, family }]);
        }
        return callback(null, ip, family);
      }
    }

    return Reflect.apply(origLookup, this, [hostname, options, callback]);
  };
  dns.lookup = customLookup;

  if (dns.promises?.lookup) {
    const origPromisesLookup = dns.promises.lookup;
    const customPromisesLookup: any = async function (
      this: any,
      hostname: any,
      options: any
    ) {
      if (typeof options === 'number') {
        options = { family: options };
      }

      if (typeof hostname === 'string') {
        const lower = hostname.toLowerCase();
        if (lower === 'localhost' || lower.endsWith('.localhost')) {
          const family = options?.family === 6 ? 6 : 4;
          const ip = family === 6 ? '::1' : '127.0.0.1';
          if (options?.all) {
            return [{ address: ip, family }];
          }
          return { address: ip, family };
        }
      }

      return Reflect.apply(origPromisesLookup, this, [hostname, options]);
    };
    dns.promises.lookup = customPromisesLookup;
  }
}

// 模块载入时立即生效
setupLoopbackDns();
