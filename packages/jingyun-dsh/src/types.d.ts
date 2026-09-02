import type { ServerResponse, IncomingMessage } from 'http';

export interface RouteHandlerOptions {
  kind: 'exact' | 'prefix' | string;
  path: string;
  handler: (
    req: IncomingMessage & {
      body?: unknown;
      params?: Record<string, string>;
      query?: Record<string, string>;
    },
    res: ServerResponse
  ) => void | Promise<void>;
}

export interface WebServerService {
  register(options: RouteHandlerOptions): void;
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    webServer: WebServerService;
  }
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'sidebar.brand.mark': {
      kind: 'single';
      scope: 'root';
      owner?: { size?: number };
    };
    'sidebar.brand.name': { kind: 'single'; scope: 'root' };
    'conversation.hero.brand.mark': { kind: 'single'; scope: 'root' };
    'sidebar.footer.action': {
      kind: 'list';
      scope: 'root';
      owner?: Record<string, any>;
    };
    'settings.trigger': {
      kind: 'list';
      scope: 'root';
      owner?: Record<string, any>;
    };
    'settings.plugins.tab': {
      kind: 'list';
      scope: 'root';
      owner?: Record<string, any>;
    };
    'conversation.input.left': {
      kind: 'list';
      scope: 'root';
      owner?: Record<string, any>;
    };
  }
}
