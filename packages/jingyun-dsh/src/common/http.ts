import type { IncomingMessage, ServerResponse } from 'http';

export function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function sendJson(res: ServerResponse | any, data: any, status = 200) {
  setCorsHeaders(res);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(JSON.stringify(data));
}

export function sendError(
  res: ServerResponse | any,
  errorMsg: string,
  status = 500
) {
  setCorsHeaders(res);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(JSON.stringify({ success: false, error: errorMsg }));
}

export function parseJsonBody<T = any>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer | string) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body.trim()) {
        return resolve({} as T);
      }
      try {
        resolve(JSON.parse(body) as T);
      } catch (err: any) {
        reject(new Error(`JSON parse failed: ${err.message}`));
      }
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}
