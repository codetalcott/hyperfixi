/**
 * A JSON-RPC client for the BUILT language server (dist/server.js), for the
 * suites that speak LSP over stdio. Diagnostics are observed: the client
 * records every `textDocument/publishDiagnostics` notification.
 */

import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';

// =============================================================================
// JSON-RPC Protocol Helpers
// =============================================================================

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

export interface LspDiagnostic {
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  severity?: number;
  code?: string | number;
  source?: string;
  message: string;
  data?: unknown;
}

interface PublishDiagnosticsParams {
  uri: string;
  diagnostics: LspDiagnostic[];
}

function encodeMessage(msg: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse): string {
  const content = JSON.stringify(msg);
  return `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n${content}`;
}

// =============================================================================
// LSP Server Test Harness
// =============================================================================

export class LSPTestClient {
  private server: ChildProcess | null = null;
  private responseBuffer: Buffer = Buffer.alloc(0);
  private pendingRequests = new Map<number, (response: JsonRpcResponse) => void>();
  private nextId = 1;
  /** Waiters for the NEXT publishDiagnostics on a uri. */
  private diagnosticWaiters = new Map<string, Array<(p: PublishDiagnosticsParams) => void>>();
  /** Every server→client request seen (method names), e.g. client/registerCapability. */
  readonly serverRequests: string[] = [];
  /** What to answer a `workspace/configuration` request with (pull model). */
  configurationResponse: unknown[] | null = null;
  readonly stderr: string[] = [];

  /** `command` runs another server (an executable and its arguments) in place of this package's. */
  async start(env: NodeJS.ProcessEnv = {}, command?: string[]): Promise<void> {
    const serverPath = fileURLToPath(new URL('../dist/server.js', import.meta.url));
    const [bin, ...args] = command ?? ['node', serverPath, '--stdio'];
    this.server = spawn(bin!, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });
    this.server.stdout?.on('data', (data: Buffer) => {
      this.responseBuffer = Buffer.concat([this.responseBuffer, data]);
      this.processBuffer();
    });
    this.server.stderr?.on('data', (data: Buffer) => {
      this.stderr.push(data.toString());
    });
    // The server top-level-awaits its optional imports before listening; the
    // first request below is only sent once `initialize` answers, so a fixed
    // sleep is not load-bearing — it just avoids an early write to a pipe
    // whose reader is not attached yet.
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private processBuffer(): void {
    while (true) {
      const headerSep = this.responseBuffer.indexOf('\r\n\r\n');
      if (headerSep === -1) break;
      const headerSection = this.responseBuffer.subarray(0, headerSep).toString('utf-8');
      const contentLengthMatch = headerSection.match(/Content-Length:\s*(\d+)/i);
      if (!contentLengthMatch) {
        this.responseBuffer = this.responseBuffer.subarray(headerSep + 4);
        continue;
      }
      const contentLength = parseInt(contentLengthMatch[1], 10);
      const contentStart = headerSep + 4;
      const messageEnd = contentStart + contentLength;
      if (this.responseBuffer.length < messageEnd) break;
      const content = this.responseBuffer.subarray(contentStart, messageEnd).toString('utf-8');
      this.responseBuffer = this.responseBuffer.subarray(messageEnd);

      let message: Record<string, unknown>;
      try {
        message = JSON.parse(content);
      } catch {
        continue;
      }

      // Server → client request (has method AND id): answer it.
      if ('method' in message && 'id' in message && message.id !== undefined) {
        this.respondToServerRequest(message.id as number, message.method as string);
        continue;
      }
      // Response to one of our requests.
      if ('id' in message && message.id !== null && !('method' in message)) {
        const resolver = this.pendingRequests.get(message.id as number);
        if (resolver) {
          resolver(message as unknown as JsonRpcResponse);
          this.pendingRequests.delete(message.id as number);
        }
        continue;
      }
      // Notification.
      if (message.method === 'textDocument/publishDiagnostics') {
        const params = message.params as PublishDiagnosticsParams;
        const waiters = this.diagnosticWaiters.get(params.uri) ?? [];
        this.diagnosticWaiters.delete(params.uri);
        for (const w of waiters) w(params);
      }
    }
  }

  private respondToServerRequest(id: number, method: string): void {
    this.serverRequests.push(method);
    const result = method === 'workspace/configuration' ? this.configurationResponse : null;
    this.server?.stdin?.write(encodeMessage({ jsonrpc: '2.0', id, result }));
  }

  /**
   * Resolves with the NEXT publishDiagnostics for `uri`. Call it BEFORE
   * sending the notification that triggers validation, so a fast server
   * cannot publish in the gap.
   */
  nextDiagnostics(uri: string, timeoutMs = 5000): Promise<LspDiagnostic[]> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`no publishDiagnostics for ${uri} within ${timeoutMs}ms`)),
        timeoutMs
      );
      const list = this.diagnosticWaiters.get(uri) ?? [];
      list.push(p => {
        clearTimeout(timer);
        resolve(p.diagnostics);
      });
      this.diagnosticWaiters.set(uri, list);
    });
  }

  /** Open a document and return the diagnostics the server publishes for it. */
  async open(uri: string, text: string, languageId = 'hyperscript'): Promise<LspDiagnostic[]> {
    const pending = this.nextDiagnostics(uri);
    this.sendNotification('textDocument/didOpen', {
      textDocument: { uri, languageId, version: 1, text },
    });
    return pending;
  }

  async change(uri: string, version: number, text: string): Promise<LspDiagnostic[]> {
    const pending = this.nextDiagnostics(uri);
    this.sendNotification('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: [{ text }],
    });
    return pending;
  }

  async sendRequest(method: string, params?: unknown): Promise<JsonRpcResponse> {
    if (!this.server?.stdin) throw new Error('Server not started');
    const id = this.nextId++;
    const request: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }, 5000);
      this.pendingRequests.set(id, response => {
        clearTimeout(timeout);
        resolve(response);
      });
      this.server!.stdin!.write(encodeMessage(request));
    });
  }

  sendNotification(method: string, params?: unknown): void {
    if (!this.server?.stdin) throw new Error('Server not started');
    const notification: JsonRpcNotification = { jsonrpc: '2.0', method, params };
    this.server.stdin.write(encodeMessage(notification));
  }

  async initialize(
    capabilities: Record<string, unknown> = {},
    initializationOptions?: Record<string, unknown>,
    rootUri: string | null = null
  ): Promise<JsonRpcResponse> {
    const response = await this.sendRequest('initialize', {
      processId: process.pid,
      capabilities,
      rootUri,
      initializationOptions,
    });
    this.sendNotification('initialized', {});
    return response;
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.kill();
      this.server = null;
    }
  }
}
