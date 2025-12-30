/**
 * Shared test utilities for developer-tools tests
 * Provides mock factories for Express, WebSocket, file system, CLI tools, etc.
 */

import { vi, type Mock } from 'vitest';
import type { Request, Response } from 'express';
import type { WebSocket } from 'ws';
import type { ComponentDefinition } from '../types';

// ========== Express Mocks ==========

export interface MockResponse extends Partial<Response> {
  _data: any;
  _status: number;
  _headers: Record<string, string>;
}

export function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    query: {},
    body: {},
    path: '/',
    method: 'GET',
    headers: {},
    get: vi.fn((name: string) => ''),
    header: vi.fn((name: string) => ''),
    ...overrides,
  } as unknown as Request;
}

export function createMockResponse(): MockResponse & Response {
  const res: MockResponse = {
    _data: null,
    _status: 200,
    _headers: {},

    status: vi.fn(function (this: MockResponse, code: number) {
      this._status = code;
      return this as any;
    }),
    json: vi.fn(function (this: MockResponse, data: any) {
      this._data = data;
      return this as any;
    }),
    send: vi.fn(function (this: MockResponse, data: any) {
      this._data = data;
      return this as any;
    }),
    setHeader: vi.fn(function (this: MockResponse, name: string, value: string) {
      this._headers[name] = value;
      return this as any;
    }),
    header: vi.fn(function (this: MockResponse, name: string, value: string) {
      this._headers[name] = value;
      return this as any;
    }),
    sendStatus: vi.fn(function (this: MockResponse, code: number) {
      this._status = code;
      return this as any;
    }),
    type: vi.fn(function (this: MockResponse) {
      return this as any;
    }),
    end: vi.fn(function (this: MockResponse) {
      return this as any;
    }),
  };

  return res as MockResponse & Response;
}

// ========== WebSocket Mocks ==========

export interface MockWebSocket extends Partial<WebSocket> {
  _messages: string[];
  _closed: boolean;
  simulateMessage: (data: string) => void;
  simulateClose: () => void;
}

export function createMockWebSocket(): MockWebSocket {
  const eventHandlers: Record<string, Function[]> = {};

  const ws: MockWebSocket = {
    _messages: [],
    _closed: false,
    readyState: 1, // WebSocket.OPEN

    send: vi.fn(function (this: MockWebSocket, data: string) {
      this._messages.push(data);
    }),
    close: vi.fn(function (this: MockWebSocket) {
      this._closed = true;
      eventHandlers['close']?.forEach(h => h());
    }),
    on: vi.fn((event: string, handler: Function) => {
      eventHandlers[event] = eventHandlers[event] || [];
      eventHandlers[event].push(handler);
      return ws;
    }),

    simulateMessage(data: string) {
      eventHandlers['message']?.forEach(h => h(data));
    },
    simulateClose() {
      eventHandlers['close']?.forEach(h => h());
    },
  };

  return ws;
}

export interface MockWebSocketServer {
  on: Mock;
  close: Mock;
  clients: Set<MockWebSocket>;
  simulateConnection: (ws: MockWebSocket) => void;
}

export function createMockWebSocketServer(): MockWebSocketServer {
  const clients = new Set<MockWebSocket>();
  const eventHandlers: Record<string, Function[]> = {};

  return {
    on: vi.fn((event: string, handler: Function) => {
      eventHandlers[event] = eventHandlers[event] || [];
      eventHandlers[event].push(handler);
    }),
    close: vi.fn(),
    clients,
    simulateConnection(ws: MockWebSocket) {
      clients.add(ws);
      eventHandlers['connection']?.forEach(h => h(ws));
    },
  };
}

// ========== File System Mocks ==========

export interface MockFsExtra {
  _files: Map<string, string>;
  _directories: Set<string>;
  readFile: Mock;
  writeFile: Mock;
  writeJson: Mock;
  readJson: Mock;
  pathExists: Mock;
  ensureDir: Mock;
  stat: Mock;
  chmod: Mock;
  remove: Mock;
  copy: Mock;
  __setFiles: (files: Record<string, string>) => void;
  __addDirectory: (path: string) => void;
}

export function createMockFsExtra(): MockFsExtra {
  const files = new Map<string, string>();
  const directories = new Set<string>(['.', '/']);

  const mock: MockFsExtra = {
    _files: files,
    _directories: directories,

    readFile: vi.fn(async (path: string, encoding?: string) => {
      if (!files.has(path)) throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      return files.get(path)!;
    }),

    writeFile: vi.fn(async (path: string, content: string) => {
      files.set(path, content);
    }),

    writeJson: vi.fn(async (path: string, data: object, options?: { spaces?: number }) => {
      files.set(path, JSON.stringify(data, null, options?.spaces ?? 2));
    }),

    readJson: vi.fn(async (path: string) => {
      const content = files.get(path);
      if (!content) throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      return JSON.parse(content);
    }),

    pathExists: vi.fn(async (path: string) => {
      return files.has(path) || directories.has(path);
    }),

    ensureDir: vi.fn(async (path: string) => {
      directories.add(path);
    }),

    stat: vi.fn(async (path: string) => {
      if (!files.has(path) && !directories.has(path)) {
        throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
      }
      const content = files.get(path) || '';
      return {
        size: content.length,
        isFile: () => files.has(path),
        isDirectory: () => directories.has(path),
      };
    }),

    chmod: vi.fn(async () => {}),

    remove: vi.fn(async (path: string) => {
      files.delete(path);
      directories.delete(path);
    }),

    copy: vi.fn(async (src: string, dest: string) => {
      const content = files.get(src);
      if (content !== undefined) {
        files.set(dest, content);
      }
    }),

    __setFiles(testFiles: Record<string, string>) {
      files.clear();
      Object.entries(testFiles).forEach(([path, content]) => {
        files.set(path, content);
      });
    },

    __addDirectory(path: string) {
      directories.add(path);
    },
  };

  return mock;
}

// ========== Chokidar Mocks ==========

export interface MockChokidarWatcher {
  on: Mock;
  close: Mock;
  simulateChange: (path: string) => void;
  simulateAdd: (path: string) => void;
  simulateUnlink: (path: string) => void;
  simulateReady: () => void;
}

export interface MockChokidar {
  watch: Mock<[], MockChokidarWatcher>;
}

export function createMockChokidar(): MockChokidar {
  return {
    watch: vi.fn(() => {
      const eventHandlers: Record<string, Function[]> = {};

      const watcher: MockChokidarWatcher = {
        on: vi.fn((event: string, handler: Function) => {
          eventHandlers[event] = eventHandlers[event] || [];
          eventHandlers[event].push(handler);
          return watcher;
        }),
        close: vi.fn(async () => {}),

        simulateChange(path: string) {
          eventHandlers['change']?.forEach(h => h(path));
        },
        simulateAdd(path: string) {
          eventHandlers['add']?.forEach(h => h(path));
        },
        simulateUnlink(path: string) {
          eventHandlers['unlink']?.forEach(h => h(path));
        },
        simulateReady() {
          eventHandlers['ready']?.forEach(h => h());
        },
      };

      return watcher;
    }),
  };
}

// ========== CLI Mocks ==========

export interface MockOraSpinner {
  text: string;
  start: Mock;
  stop: Mock;
  succeed: Mock;
  fail: Mock;
  info: Mock;
  warn: Mock;
}

export function createMockOra(): Mock<[string?], MockOraSpinner> {
  const createSpinner = (): MockOraSpinner => ({
    text: '',
    start: vi.fn(function (this: MockOraSpinner, text?: string) {
      this.text = text || this.text;
      return this;
    }),
    stop: vi.fn(function (this: MockOraSpinner) {
      return this;
    }),
    succeed: vi.fn(function (this: MockOraSpinner, text?: string) {
      this.text = text || this.text;
      return this;
    }),
    fail: vi.fn(function (this: MockOraSpinner, text?: string) {
      this.text = text || this.text;
      return this;
    }),
    info: vi.fn(function (this: MockOraSpinner) {
      return this;
    }),
    warn: vi.fn(function (this: MockOraSpinner) {
      return this;
    }),
  });

  return vi.fn((text?: string) => {
    const spinner = createSpinner();
    spinner.text = text || '';
    return spinner;
  });
}

export interface MockInquirer {
  prompt: Mock;
}

export function createMockInquirer(answers: Record<string, any> = {}): MockInquirer {
  return {
    prompt: vi.fn(async (questions: any[]) => {
      const result: Record<string, any> = {};
      for (const q of questions) {
        result[q.name] = answers[q.name] ?? q.default;
      }
      return result;
    }),
  };
}

// ========== HTTP Server Mocks ==========

export interface MockHttpServer {
  listen: Mock;
  close: Mock;
  on: Mock;
  address: Mock;
  simulateError: (error: Error) => void;
}

export function createMockHttpServer(): MockHttpServer {
  const eventHandlers: Record<string, Function[]> = {};

  return {
    listen: vi.fn((port: number, host: string, callback?: Function) => {
      setTimeout(() => callback?.(), 0);
    }),
    close: vi.fn((callback?: Function) => {
      setTimeout(() => callback?.(), 0);
    }),
    on: vi.fn((event: string, handler: Function) => {
      eventHandlers[event] = eventHandlers[event] || [];
      eventHandlers[event].push(handler);
    }),
    address: vi.fn(() => ({ port: 3000, address: 'localhost' })),

    simulateError(error: Error) {
      eventHandlers['error']?.forEach(h => h(error));
    },
  };
}

// ========== Child Process Mocks ==========

export interface MockChildProcess {
  spawn: Mock;
  exec: Mock;
}

export function createMockChildProcess(exitCode = 0): MockChildProcess {
  return {
    spawn: vi.fn((cmd: string, args: string[], options?: any) => {
      const eventHandlers: Record<string, Function[]> = {};
      return {
        on: vi.fn((event: string, handler: Function) => {
          eventHandlers[event] = eventHandlers[event] || [];
          eventHandlers[event].push(handler);
          if (event === 'close') {
            setTimeout(() => handler(exitCode), 10);
          }
        }),
        stdout: {
          on: vi.fn((event: string, handler: Function) => {}),
        },
        stderr: {
          on: vi.fn((event: string, handler: Function) => {}),
        },
        kill: vi.fn(),
      };
    }),
    exec: vi.fn((cmd: string, callback?: Function) => {
      setTimeout(() => callback?.(null, '', ''), 10);
    }),
  };
}

// ========== Glob Mocks ==========

export function createMockGlob(files: string[] = []): Mock {
  return vi.fn(async (pattern: string) => files);
}

// ========== Sample Test Data ==========

export const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <button id="btn" class="btn-primary" _="on click toggle .active">Click me</button>
  <div data-script="on load log 'Hello'">Content</div>
</body>
</html>`;

export const SAMPLE_HTML_WITH_ISSUES = `<!DOCTYPE html>
<html>
<body>
  <button _="on click then toggle .active">Has duplicate then</button>
  <div _="put 'test' into nowhere">Invalid target</div>
</body>
</html>`;

export const SAMPLE_COMPONENT: ComponentDefinition = {
  id: 'test-button',
  name: 'Test Button',
  description: 'A test button component',
  category: 'interactive',
  icon: '🔘',
  template: '<button>{{text}}</button>',
  hyperscript: 'on click log "clicked"',
  styles: '.btn { color: blue; }',
  properties: [
    {
      name: 'text',
      type: 'string',
      description: 'Button text',
      default: 'Click',
    },
  ],
  events: [{ name: 'click', description: 'Fired when clicked' }],
  slots: [],
  examples: [
    {
      name: 'Basic',
      description: 'Basic button',
      code: '<button _="on click log \'clicked\'">Click</button>',
    },
  ],
};

export const SAMPLE_PROJECT_CONFIG = {
  name: 'test-project',
  description: 'A test project',
  author: 'Test Author',
  license: 'MIT',
  features: [],
  template: 'basic',
};

// ========== Test Helpers ==========

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error(`Timeout waiting for condition`);
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Create a temporary test directory path
 */
export function createTempPath(name: string): string {
  return `/tmp/hyperfixi-test-${name}-${Date.now()}`;
}

/**
 * Strip ANSI codes from string (for testing CLI output)
 */
export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Parse JSON from mock response
 */
export function getResponseJson(res: MockResponse): any {
  return res._data;
}

/**
 * Get status from mock response
 */
export function getResponseStatus(res: MockResponse): number {
  return res._status;
}
