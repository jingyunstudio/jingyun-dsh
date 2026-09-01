export function sendJson(res: any, data: any, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(JSON.stringify(data));
}

export function sendError(res: any, errorMsg: string, status = 500) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify({ success: false, error: errorMsg }));
}
