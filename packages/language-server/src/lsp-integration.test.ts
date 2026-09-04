/**
 * LSP Integration Tests
 *
 * Spawns the BUILT language server (dist/server.js — `pretest` rebuilds it)
 * as a subprocess and speaks JSON-RPC over stdio. This is the only suite that
 * reaches server.ts, so every advertised LSP feature has an end-to-end case
 * here, and diagnostics are OBSERVED: the client records every
 * `textDocument/publishDiagnostics` notification. (It used to drop
 * notifications, which is how "does not flag Spanish as error" stayed green
 * while the server published a parse error for it.)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';

// =============================================================================
// JSON-RPC Protocol Helpers
// =============================================================================

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
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

interface LspDiagnostic {
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  severity?: number;
  code?: string | number;
  source?: string;
  message: string;
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

class LSPTestClient {
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

  async start(env: NodeJS.ProcessEnv = {}): Promise<void> {
    const serverPath = join(__dirname, '..', 'dist', 'server.js');
    this.server = spawn('node', [serverPath, '--stdio'], {
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
    initializationOptions?: Record<string, unknown>
  ): Promise<JsonRpcResponse> {
    const response = await this.sendRequest('initialize', {
      processId: process.pid,
      capabilities,
      rootUri: null,
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

const codes = (diags: LspDiagnostic[]) => diags.map(d => String(d.code));

// =============================================================================
// Core LSP features (default `auto` mode → lokascript)
// =============================================================================

describe('LSP Integration', () => {
  let client: LSPTestClient;

  beforeAll(async () => {
    client = new LSPTestClient();
    await client.start();
  });

  afterAll(async () => {
    await client.stop();
  });

  describe('Initialize', () => {
    it('responds to initialize with the advertised capabilities', async () => {
      const response = await client.initialize();
      expect(response.error).toBeUndefined();
      const { capabilities } = response.result as { capabilities: Record<string, unknown> };
      expect(capabilities.textDocumentSync).toBeDefined();
      expect(capabilities.completionProvider).toBeDefined();
      expect(capabilities.hoverProvider).toBe(true);
      expect(capabilities.documentSymbolProvider).toBe(true);
      expect(capabilities.codeActionProvider).toBeDefined();
      expect(capabilities.definitionProvider).toBe(true);
      expect(capabilities.referencesProvider).toBe(true);
      expect(capabilities.renameProvider).toEqual({ prepareProvider: true });
      expect(capabilities.documentFormattingProvider).toBe(true);
    });

    it('registers for configuration changes after initialized', async () => {
      // The server asks the client to register DidChangeConfiguration.
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(client.serverRequests).toContain('client/registerCapability');
    });
  });

  describe('Text Document Sync and diagnostics', () => {
    const testUri = 'file:///test/document.hs';

    it('publishes diagnostics on didOpen (clean code → none)', async () => {
      const diags = await client.open(testUri, 'on click toggle .active');
      expect(diags).toEqual([]);
    });

    it('re-publishes on didChange and reports a real syntax error', async () => {
      const diags = await client.change(testUri, 2, "on click put 'x into me");
      expect(diags.length).toBeGreaterThan(0);
      expect(diags.every(d => d.severity === 1)).toBe(true);
    });

    it('clears the error once the text is fixed', async () => {
      const diags = await client.change(testUri, 3, "on click put 'x' into me");
      expect(diags).toEqual([]);
      client.sendNotification('textDocument/didClose', { textDocument: { uri: testUri } });
    });

    it('does not flag an apostrophe inside a -- comment', async () => {
      const uri = 'file:///test/comment.hs';
      const diags = await client.open(uri, "on click -- don't\n  put #x's textContent into me");
      expect(diags).toEqual([]);
    });
  });

  describe('Completions', () => {
    const testUri = 'file:///test/completions.hs';

    beforeAll(async () => {
      await client.open(testUri, 'on ');
    });

    it('offers event names after `on `', async () => {
      const response = await client.sendRequest('textDocument/completion', {
        textDocument: { uri: testUri },
        position: { line: 0, character: 3 },
      });
      expect(response.error).toBeUndefined();
      const labels = (response.result as Array<{ label: string }>).map(i => i.label);
      expect(labels).toContain('click');
    });

    it('offers commands after an event', async () => {
      await client.change(testUri, 2, 'on click ');
      const response = await client.sendRequest('textDocument/completion', {
        textDocument: { uri: testUri },
        position: { line: 0, character: 9 },
      });
      const labels = (response.result as Array<{ label: string }>).map(i => i.label);
      expect(labels).toContain('toggle');
      // lokascript mode: extensions are offered too
      expect(labels).toContain('morph');
    });

    it('offers selector snippets after a preposition', async () => {
      await client.change(testUri, 3, 'on click add .x to ');
      const response = await client.sendRequest('textDocument/completion', {
        textDocument: { uri: testUri },
        position: { line: 0, character: 19 },
      });
      const labels = (response.result as Array<{ label: string }>).map(i => i.label);
      expect(labels).toEqual(expect.arrayContaining(['#', '.', '<']));
    });

    it('offers caret-var names from the document after `^`', async () => {
      await client.change(testUri, 4, 'set ^count to 1\nlog ^');
      const response = await client.sendRequest('textDocument/completion', {
        textDocument: { uri: testUri },
        position: { line: 1, character: 5 },
      });
      const labels = (response.result as Array<{ label: string }>).map(i => i.label);
      expect(labels).toContain('count');
    });
  });

  describe('Hover', () => {
    const testUri = 'file:///test/hover.hs';

    beforeAll(async () => {
      await client.open(testUri, 'on click toggle .active');
    });

    it('documents a keyword under the cursor', async () => {
      const response = await client.sendRequest('textDocument/hover', {
        textDocument: { uri: testUri },
        position: { line: 0, character: 10 }, // "toggle"
      });
      expect(response.error).toBeUndefined();
      const hover = response.result as { contents: { value: string } } | null;
      expect(hover).not.toBeNull();
      expect(hover!.contents.value).toContain('toggle');
    });

    // `fromCoreAST` names roles for `set`/`go` only unless server.ts injects the
    // schema-driven inferrer, and the framework re-infers the simple cases
    // itself when rendering LSE — so only a case it cannot re-infer proves the
    // injection is wired: without it `add .x to me` renders `[add patient:.x]`
    // (2026-09-03, 4 of 28 corpus feature sources differ).
    it('hover LSE carries the schema-inferred destination role', async () => {
      const rolesUri = 'file:///test/hover-roles.hs';
      await client.open(rolesUri, 'on click add .x to me');
      const response = await client.sendRequest('textDocument/hover', {
        textDocument: { uri: rolesUri },
        position: { line: 0, character: 9 }, // "add"
      });
      expect(response.error).toBeUndefined();
      const hover = response.result as { contents: { value: string } } | null;
      expect(hover).not.toBeNull();
      expect(hover!.contents.value).toContain('**LSE:**');
      expect(hover!.contents.value).toContain('destination:me');
    });

    it('returns null past the end of the line', async () => {
      const response = await client.sendRequest('textDocument/hover', {
        textDocument: { uri: testUri },
        position: { line: 0, character: 99 },
      });
      expect(response.error).toBeUndefined();
      expect(response.result).toBeNull();
    });

    it('works inside an HTML _="…" attribute with mapped positions', async () => {
      const htmlUri = 'file:///test/hover.html';
      await client.open(htmlUri, '<button _="on click toggle .active">x</button>', 'html');
      const response = await client.sendRequest('textDocument/hover', {
        textDocument: { uri: htmlUri },
        position: { line: 0, character: 22 }, // inside "toggle"
      });
      const hover = response.result as {
        contents: { value: string };
        range: { start: { character: number }; end: { character: number } };
      } | null;
      expect(hover).not.toBeNull();
      expect(hover!.contents.value).toContain('toggle');
      expect(hover!.range.start.character).toBe(20);
      expect(hover!.range.end.character).toBe(26);
    });
  });

  describe('Document Symbols', () => {
    const testUri = 'file:///test/symbols.hs';

    beforeAll(async () => {
      await client.open(
        testUri,
        `on click toggle .active on me
on mouseenter add .init to me
behavior Modal
def helper()`
      );
    });

    it('lists handlers, behaviors and functions — and nothing spurious', async () => {
      const response = await client.sendRequest('textDocument/documentSymbol', {
        textDocument: { uri: testUri },
      });
      expect(response.error).toBeUndefined();
      const names = (response.result as Array<{ name: string }>).map(s => s.name);
      expect(names).toEqual(['on click', 'on mouseenter', 'behavior Modal', 'def helper']);
    });
  });

  describe('Definition, References, Rename', () => {
    const testUri = 'file:///test/nav.hs';
    const text = 'behavior Modal\n  on open show me\nend\ninstall Modal\ninstall Modal(x: 1)';

    beforeAll(async () => {
      await client.open(testUri, text);
    });

    it('goes to the behavior definition from an install site', async () => {
      const response = await client.sendRequest('textDocument/definition', {
        textDocument: { uri: testUri },
        position: { line: 3, character: 10 },
      });
      expect(response.error).toBeUndefined();
      const loc = response.result as { uri: string; range: { start: { line: number } } };
      expect(loc.uri).toBe(testUri);
      expect(loc.range.start).toEqual({ line: 0, character: 9 });
    });

    it('finds the definition plus both usages', async () => {
      const response = await client.sendRequest('textDocument/references', {
        textDocument: { uri: testUri },
        position: { line: 0, character: 10 },
        context: { includeDeclaration: true },
      });
      const locs = response.result as Array<{ range: { start: { line: number } } }>;
      expect(locs.map(l => l.range.start.line).sort()).toEqual([0, 3, 4]);
    });

    it('prepares and performs a rename with one edit per site', async () => {
      const prepare = await client.sendRequest('textDocument/prepareRename', {
        textDocument: { uri: testUri },
        position: { line: 4, character: 9 },
      });
      expect((prepare.result as { placeholder: string }).placeholder).toBe('Modal');

      const rename = await client.sendRequest('textDocument/rename', {
        textDocument: { uri: testUri },
        position: { line: 4, character: 9 },
        newName: 'Dialog',
      });
      const edits = (rename.result as { changes: Record<string, Array<{ newText: string }>> })
        .changes[testUri];
      expect(edits).toHaveLength(3);
      expect(edits.every(e => e.newText === 'Dialog')).toBe(true);
    });
  });

  describe('Formatting', () => {
    it('re-indents a .hs file and refuses HTML', async () => {
      const uri = 'file:///test/format.hs';
      await client.open(uri, 'behavior Modal\non open show me\nend');
      const response = await client.sendRequest('textDocument/formatting', {
        textDocument: { uri },
        options: { tabSize: 2, insertSpaces: true },
      });
      const edits = response.result as Array<{ newText: string }>;
      expect(edits).toHaveLength(1);
      expect(edits[0].newText).toBe('behavior Modal\n  on open show me\nend');

      const htmlUri = 'file:///test/format.html';
      await client.open(htmlUri, '<div _="on click log 1"></div>', 'html');
      const html = await client.sendRequest('textDocument/formatting', {
        textDocument: { uri: htmlUri },
        options: { tabSize: 2, insertSpaces: true },
      });
      expect(html.result).toBeNull();
    });
  });

  describe('Code Actions', () => {
    // The handler keys purely on the diagnostics the client hands back in
    // `context` (as VS Code does), so the request is driven with the
    // diagnostic shape the server publishes. NOTE (2026-09 audit): the
    // server-side PRODUCER of `missing-role` is effectively unreachable —
    // handler-wrapped code parses as action `on`, and a bare `toggle` scores
    // confidence 0 — so this pins the wiring, not a live end-to-end path.
    it('offers a quick fix for a missing-role diagnostic', async () => {
      const uri = 'file:///test/actions.hs';
      await client.open(uri, 'toggle');
      const missing = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 6 } },
        severity: 2,
        code: 'missing-role',
        source: 'lokascript',
        message: 'toggle command missing target (add .class, @attr, or selector)',
      };
      const response = await client.sendRequest('textDocument/codeAction', {
        textDocument: { uri },
        range: missing.range,
        context: { diagnostics: [missing] },
      });
      const actions = response.result as Array<{ title: string; kind: string }>;
      expect(actions.map(a => a.title)).toContain('Add class target to toggle');
    });
  });

  describe('lokascript/translateWithVerification', () => {
    it('is wired as a custom request', async () => {
      const response = await client.sendRequest('lokascript/translateWithVerification', {
        code: 'on click toggle .active',
        from: 'en',
        to: 'es',
      });
      expect(response.error).toBeUndefined();
      const result = response.result as {
        ok: boolean;
        code?: string;
        verification?: { ok: boolean; faithful?: boolean };
      };
      expect(result.ok).toBe(true);
      expect(result.code).toBeTruthy();
      expect(result.code).not.toBe('on click toggle .active');
      expect(result.verification?.ok).toBe(true);
    });
  });

  describe('Shutdown', () => {
    it('responds to shutdown with null and then exits', async () => {
      const response = await client.sendRequest('shutdown');
      expect(response.error).toBeUndefined();
      expect(response.result).toBe(null);
      client.sendNotification('exit');
      const rejected = await client
        .sendRequest('textDocument/hover', {
          textDocument: { uri: 'file:///x.hs' },
          position: { line: 0, character: 0 },
        })
        .then(
          () => false,
          () => true
        );
      expect(rejected).toBe(true);
    });
  });
});

// =============================================================================
// Protocol robustness
// =============================================================================

describe('LSP Protocol Compliance', () => {
  let client: LSPTestClient;

  beforeAll(async () => {
    client = new LSPTestClient();
    await client.start();
    await client.initialize();
  });

  afterAll(async () => {
    await client.stop();
  });

  it('answers an unknown method with MethodNotFound', async () => {
    const response = await client.sendRequest('unknownMethod', {});
    expect(response.error?.code).toBe(-32601);
  });

  it('handles rapid sequential requests', async () => {
    const testUri = 'file:///test/rapid.hs';
    await client.open(testUri, 'on click toggle .active');
    const responses = await Promise.all([
      client.sendRequest('textDocument/hover', {
        textDocument: { uri: testUri },
        position: { line: 0, character: 10 },
      }),
      client.sendRequest('textDocument/documentSymbol', { textDocument: { uri: testUri } }),
      client.sendRequest('textDocument/completion', {
        textDocument: { uri: testUri },
        position: { line: 0, character: 23 },
      }),
    ]);
    responses.forEach(response => expect(response.error).toBeUndefined());
  });

  it('handles concurrent document opens', async () => {
    const docs = ['file:///test/doc1.hs', 'file:///test/doc2.hs', 'file:///test/doc3.hs'];
    const published = await Promise.all(
      docs.map((uri, i) => client.open(uri, `on click toggle .class${i}`))
    );
    published.forEach(diags => expect(diags).toEqual([]));
    const responses = await Promise.all(
      docs.map(uri => client.sendRequest('textDocument/documentSymbol', { textDocument: { uri } }))
    );
    responses.forEach(response => {
      expect(response.error).toBeUndefined();
      expect((response.result as unknown[]).length).toBe(1);
    });
  });
});

// =============================================================================
// Multilingual — the server's headline claim, observed through diagnostics
// =============================================================================

describe('Multilingual Auto-Detection', () => {
  let client: LSPTestClient;

  beforeAll(async () => {
    client = new LSPTestClient();
    await client.start();
    await client.initialize();
  });

  afterAll(async () => {
    await client.stop();
  });

  it('does not flag Spanish hyperscript as an error', async () => {
    const diags = await client.open('file:///test/spanish.hs', 'al hacer clic alternar .active');
    expect(codes(diags)).not.toContain('parse-error');
    expect(diags.filter(d => d.severity === 1)).toEqual([]);
  });

  it('does not flag Japanese hyperscript as an error', async () => {
    const diags = await client.open('file:///test/japanese.hs', 'クリック で .active を トグル');
    expect(codes(diags)).not.toContain('parse-error');
    expect(diags.filter(d => d.severity === 1)).toEqual([]);
  });

  it('still reports a real syntax error in Spanish code', async () => {
    const diags = await client.open('file:///test/spanish-error.hs', "poner 'hola en #mensaje");
    expect(diags.length).toBeGreaterThan(0);
    expect(diags.every(d => d.severity === 1)).toBe(true);
  });

  it('still reports a real parse error in English code', async () => {
    const diags = await client.open(
      'file:///test/english-error.hs',
      'on click toggle .a then then'
    );
    expect(codes(diags)).toContain('parse-error');
  });
});

// =============================================================================
// Configuration: push model, pull model, initializationOptions, env default
// =============================================================================

describe('Configuration and modes', () => {
  it('applies a pushed `lokascript` section and re-validates open documents', async () => {
    const client = new LSPTestClient();
    await client.start();
    await client.initialize();
    const uri = 'file:///test/config-push.hs';
    const before = await client.open(uri, 'on click prepend "x" to #list');
    expect(codes(before)).not.toContain('lokascript-only');

    const flagged = client.nextDiagnostics(uri);
    client.sendNotification('workspace/didChangeConfiguration', {
      settings: { lokascript: { mode: 'hyperscript' } },
    });
    expect(codes(await flagged)).toContain('lokascript-only');

    // A partial object merges over the defaults: switching back must not lose
    // `language`/`maxDiagnostics` (that regression produced an error on every
    // document before the audit).
    const cleared = client.nextDiagnostics(uri);
    client.sendNotification('workspace/didChangeConfiguration', {
      settings: { lokascript: { mode: 'lokascript' } },
    });
    expect(codes(await cleared)).not.toContain('lokascript-only');
    await client.stop();
  });

  it('accepts the `hyperscript` namespace too', async () => {
    const client = new LSPTestClient();
    await client.start();
    await client.initialize();
    const uri = 'file:///test/config-hs.hs';
    await client.open(uri, 'on click prepend "x" to #list');
    const flagged = client.nextDiagnostics(uri);
    client.sendNotification('workspace/didChangeConfiguration', {
      settings: { hyperscript: { mode: 'hyperscript' } },
    });
    expect(codes(await flagged)).toContain('lokascript-only');
    await client.stop();
  });

  it('pulls workspace/configuration when the push carries no payload', async () => {
    // This is what vscode-languageclient sends when the client did not set
    // `synchronize.configurationSection`: `{ settings: null }`.
    const client = new LSPTestClient();
    await client.start();
    client.configurationResponse = [{ mode: 'hyperscript' }, null];
    await client.initialize({ workspace: { configuration: true } });
    // The server pulls once right after `initialized`; wait for that to land
    // so the document below is validated in hyperscript mode.
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(client.serverRequests).toContain('workspace/configuration');
    const uri = 'file:///test/config-pull.hs';
    const diags = await client.open(uri, 'on click prepend "x" to #list');
    expect(codes(diags)).toContain('lokascript-only');
    await client.stop();
  });

  it('honours initializationOptions.language', async () => {
    const client = new LSPTestClient();
    await client.start();
    await client.initialize({}, { language: 'es' });
    const uri = 'file:///test/init-lang.hs';
    await client.open(uri, 'al hacer clic ');
    const response = await client.sendRequest('textDocument/completion', {
      textDocument: { uri },
      position: { line: 0, character: 14 },
    });
    const labels = (response.result as Array<{ label: string }>).map(i => i.label);
    // Default-context completions come back with the Spanish keywords from the
    // semantic profile (`init` → `inicio`) instead of the English ones.
    expect(labels).toContain('inicio');
    expect(labels).not.toContain('init');
    await client.stop();
  });

  it('HYPERSCRIPT_LS_DEFAULT_MODE makes hyperscript the default mode', async () => {
    const client = new LSPTestClient();
    await client.start({ HYPERSCRIPT_LS_DEFAULT_MODE: 'hyperscript' });
    await client.initialize();
    const diags = await client.open('file:///test/env-mode.hs', 'on click prepend "x" to #list');
    expect(codes(diags)).toContain('lokascript-only');
    expect(diags.find(d => d.code === 'lokascript-only')?.source).toBe('hyperscript');
    await client.stop();
  });
});
