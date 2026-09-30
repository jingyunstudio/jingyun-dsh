import type { JingyunTunnelState, TunnelMessage } from './jingyun-tunnel-types';

export class JingyunTunnelClient {
  private ws: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shouldReconnect = false;
  private localWsStreams = new Map<string, WebSocket>();
  private localWsQueues = new Map<
    string,
    Array<Uint8Array<ArrayBuffer> | string>
  >();

  private cloudWsUrl = '';
  private deviceId = '';
  private deviceToken = '';
  private localPort = 3080;

  private state: JingyunTunnelState = {
    status: 'disconnected',
  };

  private stateChangeListeners: Array<(state: JingyunTunnelState) => void> = [];

  public getState(): JingyunTunnelState {
    return { ...this.state };
  }

  public onStateChange(
    listener: (state: JingyunTunnelState) => void
  ): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(
        (l) => l !== listener
      );
    };
  }

  private setState(partial: Partial<JingyunTunnelState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.stateChangeListeners) {
      try {
        listener(this.getState());
      } catch (err) {
        console.error('[JingyunTunnelClient] Listener error:', err);
      }
    }
  }

  public connect(params: {
    cloudWsUrl: string;
    deviceId: string;
    deviceToken: string;
    deviceName?: string;
    localPort?: number;
  }): Promise<JingyunTunnelState> {
    this.disconnect(false);

    this.cloudWsUrl = params.cloudWsUrl;
    this.deviceId = params.deviceId;
    this.deviceToken = params.deviceToken;
    this.localPort =
      params.localPort ??
      (process.env.DSH_PORT ? Number(process.env.DSH_PORT) : 3080);
    this.shouldReconnect = true;

    this.setState({
      status: 'connecting',
      deviceId: this.deviceId,
      deviceName: params.deviceName,
      cloudUrl: this.cloudWsUrl,
      error: undefined,
    });

    const { promise, resolve } = Promise.withResolvers<JingyunTunnelState>();
    const timer = setTimeout(() => {
      off();
      resolve(this.getState());
    }, 5000);
    const off = this.onStateChange((st) => {
      if (st.status === 'connected' || st.status === 'error') {
        clearTimeout(timer);
        off();
        resolve(st);
      }
    });
    this.initWebSocket();
    return promise;
  }

  public disconnect(manual = true): void {
    if (manual) {
      this.shouldReconnect = false;
    }
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    for (const stream of this.localWsStreams.values()) {
      try {
        stream.close();
      } catch (err) {
        console.debug(
          '[JingyunTunnelClient] Local WS stream close error:',
          err
        );
      }
    }
    this.localWsStreams.clear();

    if (this.ws) {
      try {
        this.ws.close();
      } catch (err) {
        console.debug('[JingyunTunnelClient] Tunnel WS close error:', err);
      }
      this.ws = null;
    }

    this.setState({
      status: 'disconnected',
    });
  }

  private initWebSocket(): void {
    if (!this.cloudWsUrl || !this.deviceId || !this.deviceToken) {
      this.setState({
        status: 'error',
        error: '缺少连接凭证 (cloudWsUrl, deviceId, deviceToken)',
      });
      return;
    }

    try {
      const url = new URL(this.cloudWsUrl);
      url.searchParams.set('device_id', this.deviceId);
      url.searchParams.set('token', this.deviceToken);

      const ws = new WebSocket(url.toString());
      this.ws = ws;

      ws.onopen = () => {
        if (this.ws !== ws) return;
        console.info(
          `[JingyunTunnelClient] Tunnel connected to ${this.cloudWsUrl} for device ${this.deviceId}`
        );
        this.setState({
          status: 'connected',
          lastConnectedAt: Date.now(),
          lastHeartbeatAt: Date.now(),
          error: undefined,
          proxyUrl: 'dsh',
        });
        this.startHeartbeat();
      };

      ws.onmessage = (event: MessageEvent) => {
        if (this.ws !== ws) return;
        this.handleMessage(event.data);
      };

      ws.onerror = (err: Event) => {
        if (this.ws !== ws) return;
        console.error('[JingyunTunnelClient] Tunnel WebSocket error:', err);
      };

      ws.onclose = () => {
        if (this.ws !== ws) return;
        console.warn('[JingyunTunnelClient] Tunnel WebSocket closed');
        this.stopHeartbeat();
        this.ws = null;

        if (this.shouldReconnect) {
          this.setState({
            status: 'connecting',
            error: '连接意外断开，正在尝试重连...',
          });
          this.reconnectTimer = setTimeout(() => {
            if (this.shouldReconnect) {
              this.initWebSocket();
            }
          }, 3000);
        } else {
          this.setState({
            status: 'disconnected',
          });
        }
      };
    } catch (err: unknown) {
      console.error('[JingyunTunnelClient] Init connection error:', err);
      this.setState({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping', id: 'hb' });
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private send(msg: TunnelMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private async handleMessage(raw: unknown): Promise<void> {
    try {
      let str = '';
      if (typeof raw === 'string') {
        str = raw;
      } else if (raw instanceof ArrayBuffer) {
        str = new TextDecoder().decode(raw);
      } else if (typeof Blob !== 'undefined' && raw instanceof Blob) {
        str = await raw.text();
      }

      if (!str) return;
      const msg: TunnelMessage = JSON.parse(str);

      switch (msg.type) {
        case 'pong':
          this.setState({ lastHeartbeatAt: Date.now() });
          break;
        case 'ping':
          this.send({ type: 'pong', id: msg.id || 'p' });
          break;
        case 'http_req':
          await this.forwardHttpRequest(msg);
          break;
        case 'ws_open':
          this.openLocalWebSocket(msg);
          break;
        case 'ws_msg':
          this.sendToLocalWebSocket(msg);
          break;
        case 'ws_close':
          this.closeLocalWebSocket(msg);
          break;
      }
    } catch (err) {
      console.error('[JingyunTunnelClient] Error handling message:', err);
    }
  }

  private async forwardHttpRequest(msg: TunnelMessage): Promise<void> {
    const targetUrl = `http://127.0.0.1:${this.localPort}${msg.path || '/'}`;
    try {
      const headers = new Headers();
      if (msg.headers) {
        for (const [k, v] of Object.entries(msg.headers)) {
          if (Array.isArray(v) && v.length > 0) {
            headers.set(k, v.join(', '));
          }
        }
      }
      // 强制主机头为本地并禁用压缩以便直接透传明文
      headers.set('host', `127.0.0.1:${this.localPort}`);
      headers.set('accept-encoding', 'identity');

      let body: Uint8Array | undefined;
      if (msg.body) {
        body = new Uint8Array(Buffer.from(msg.body, 'base64'));
      }

      const res = await fetch(targetUrl, {
        method: msg.method || 'GET',
        headers,
        body:
          msg.method !== 'GET' && msg.method !== 'HEAD'
            ? (body as unknown as BodyInit)
            : undefined,
        redirect: 'manual',
      });

      const resHeaders: Record<string, string[]> = {};
      res.headers.forEach((val, key) => {
        const lower = key.toLowerCase();
        if (
          lower !== 'content-encoding' &&
          lower !== 'content-length' &&
          lower !== 'transfer-encoding' &&
          lower !== 'connection'
        ) {
          resHeaders[key] = [val];
        }
      });

      if (!res.body) {
        this.send({
          type: 'http_res',
          id: msg.id,
          status: res.status,
          headers: resHeaders,
          done: true,
        });
        return;
      }
      const reader = res.body.getReader();
      let firstSent = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          this.send({
            type: 'http_res',
            id: msg.id,
            status: firstSent ? undefined : res.status,
            headers: firstSent ? undefined : resHeaders,
            done: true,
          });
          break;
        }
        const chunkB64 = Buffer.from(value).toString('base64');
        this.send({
          type: 'http_res',
          id: msg.id,
          status: firstSent ? undefined : res.status,
          headers: firstSent ? undefined : resHeaders,
          body: chunkB64,
          done: false,
        });
        firstSent = true;
      }
    } catch (err: unknown) {
      console.error(
        `[JingyunTunnelClient] Failed to proxy HTTP request to ${targetUrl}:`,
        err
      );
      this.send({
        type: 'http_res',
        id: msg.id,
        status: 502,
        headers: { 'content-type': ['text/plain; charset=utf-8'] },
        body: Buffer.from(
          `本地 DSH 服务未就绪: ${err instanceof Error ? err.message : String(err)}`
        ).toString('base64'),
        done: true,
      });
    }
  }

  private openLocalWebSocket(msg: TunnelMessage): void {
    const streamId = msg.id;
    const targetWsUrl = `ws://127.0.0.1:${this.localPort}${msg.path || '/'}`;

    try {
      const localWs = new WebSocket(targetWsUrl);
      this.localWsStreams.set(streamId, localWs);
      this.localWsQueues.set(streamId, []);

      localWs.onopen = () => {
        const q = this.localWsQueues.get(streamId);
        if (q) {
          while (q.length > 0) {
            const item = q.shift()!;
            localWs.send(item);
          }
        }
      };
      localWs.onmessage = async (event: MessageEvent) => {
        let b64 = '';
        let pType = 1;
        if (typeof event.data === 'string') {
          b64 = Buffer.from(event.data, 'utf-8').toString('base64');
          pType = 1;
        } else if (event.data instanceof ArrayBuffer) {
          b64 = Buffer.from(event.data).toString('base64');
          pType = 2;
        } else if (typeof Blob !== 'undefined' && event.data instanceof Blob) {
          const ab = await event.data.arrayBuffer();
          b64 = Buffer.from(ab).toString('base64');
          pType = 2;
        }

        this.send({
          type: 'ws_msg',
          id: streamId,
          payload_type: pType,
          body: b64,
        });
      };

      localWs.onclose = () => {
        this.localWsStreams.delete(streamId);
        this.localWsQueues.delete(streamId);
        this.send({
          type: 'ws_close',
          id: streamId,
        });
      };

      localWs.onerror = (err) => {
        console.error(
          `[JingyunTunnelClient] Local WS stream ${streamId} error:`,
          err
        );
      };
    } catch (err) {
      console.error(
        `[JingyunTunnelClient] Failed to open local WS to ${targetWsUrl}:`,
        err
      );
      this.send({
        type: 'ws_close',
        id: streamId,
      });
    }
  }

  private sendToLocalWebSocket(msg: TunnelMessage): void {
    const localWs = this.localWsStreams.get(msg.id);
    if (!localWs || !msg.body) return;

    const buf = Buffer.from(msg.body, 'base64');
    const payload =
      msg.payload_type === 2
        ? new Uint8Array(
            buf.buffer.slice(
              buf.byteOffset,
              buf.byteOffset + buf.byteLength
            ) as ArrayBuffer
          )
        : buf.toString('utf-8');

    if (localWs.readyState === WebSocket.OPEN) {
      localWs.send(payload);
    } else if (localWs.readyState === WebSocket.CONNECTING) {
      this.localWsQueues.get(msg.id)?.push(payload);
    }
  }

  private closeLocalWebSocket(msg: TunnelMessage): void {
    const localWs = this.localWsStreams.get(msg.id);
    if (localWs) {
      try {
        localWs.close();
      } catch (err) {
        console.debug('[JingyunTunnelClient] Local WS close error:', err);
      }
      this.localWsStreams.delete(msg.id);
    }
  }
}

export const jingyunTunnelClient = new JingyunTunnelClient();
