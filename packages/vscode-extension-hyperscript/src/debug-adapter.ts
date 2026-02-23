/**
 * HyperFixi Debug Adapter — DAP (Debug Adapter Protocol) implementation.
 *
 * Runs inline in the extension host (no separate process).
 * Bridges DAP requests to the WebSocket debug server via DebugClient.
 */

import * as vscode from 'vscode';
import { DebugClient, SerializedSnapshot } from './debug-client';

// ---------------------------------------------------------------------------
// DAP Protocol Types (subset we handle)
// ---------------------------------------------------------------------------

interface DAPRequest {
  seq: number;
  type: 'request';
  command: string;
  arguments?: any;
}

interface DAPResponse {
  seq: number;
  type: 'response';
  request_seq: number;
  success: boolean;
  command: string;
  message?: string;
  body?: any;
}

interface DAPEvent {
  seq: number;
  type: 'event';
  event: string;
  body?: any;
}

interface DAPSource {
  name?: string;
  path?: string;
  sourceReference?: number;
}

interface DAPStackFrame {
  id: number;
  name: string;
  source?: DAPSource;
  line: number;
  column: number;
}

interface DAPScope {
  name: string;
  variablesReference: number;
  expensive: boolean;
}

interface DAPVariable {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
}

// ---------------------------------------------------------------------------
// Variable Reference IDs
// ---------------------------------------------------------------------------

const SCOPE_SPECIAL = 1000; // it, me, you, result, event
const SCOPE_LOCALS = 2000; // :name variables
const SCOPE_ALL = 3000; // everything else

// ---------------------------------------------------------------------------
// Debug Adapter
// ---------------------------------------------------------------------------

export class HyperFixiDebugAdapter implements vscode.DebugAdapter {
  private _onDidSendMessage = new vscode.EventEmitter<vscode.DebugProtocolMessage>();
  readonly onDidSendMessage: vscode.Event<vscode.DebugProtocolMessage> =
    this._onDidSendMessage.event;

  private debugClient: DebugClient;
  private seq = 1;
  private currentSnapshot: SerializedSnapshot | null = null;
  private snapshotHistory: SerializedSnapshot[] = [];
  private disposed = false;

  // Track variable references for expandable objects
  private variableRefs = new Map<number, Record<string, unknown>>();
  private nextVarRef = 10000;

  constructor() {
    this.debugClient = new DebugClient();
  }

  handleMessage(message: vscode.DebugProtocolMessage): void {
    const msg = message as any as DAPRequest;
    if (msg.type !== 'request') return;

    switch (msg.command) {
      case 'initialize':
        this.onInitialize(msg);
        break;
      case 'launch':
        this.onLaunch(msg);
        break;
      case 'attach':
        this.onAttach(msg);
        break;
      case 'disconnect':
        this.onDisconnect(msg);
        break;
      case 'setBreakpoints':
        this.onSetBreakpoints(msg);
        break;
      case 'threads':
        this.onThreads(msg);
        break;
      case 'stackTrace':
        this.onStackTrace(msg);
        break;
      case 'scopes':
        this.onScopes(msg);
        break;
      case 'variables':
        this.onVariables(msg);
        break;
      case 'continue':
        this.onContinue(msg);
        break;
      case 'next':
        this.onNext(msg);
        break;
      case 'stepIn':
        this.onStepIn(msg);
        break;
      case 'stepOut':
        this.onStepOut(msg);
        break;
      case 'pause':
        this.onPause(msg);
        break;
      case 'evaluate':
        this.onEvaluate(msg);
        break;
      case 'configurationDone':
        this.sendResponse(msg, {});
        break;
      default:
        this.sendErrorResponse(msg, `Unsupported command: ${msg.command}`);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.debugClient.dispose();
    this._onDidSendMessage.dispose();
  }

  // ── DAP Handlers ────────────────────────────────────────────────────

  private onInitialize(req: DAPRequest): void {
    this.sendResponse(req, {
      supportsConfigurationDoneRequest: true,
      supportsFunctionBreakpoints: true,
      supportsConditionalBreakpoints: false,
      supportsHitConditionalBreakpoints: false,
      supportsEvaluateForHovers: true,
      supportsStepBack: false,
      supportsSetVariable: false,
      supportsRestartFrame: false,
      supportsGotoTargetsRequest: false,
      supportsStepInTargetsRequest: false,
      supportsCompletionsRequest: false,
      supportsModulesRequest: false,
      supportsExceptionOptions: false,
      supportsValueFormattingOptions: false,
      supportsExceptionInfoRequest: false,
      supportTerminateDebuggee: true,
      supportSuspendDebuggee: true,
    });

    // Send initialized event after capabilities
    this.sendEvent('initialized', {});
  }

  private onLaunch(req: DAPRequest): void {
    const wsUrl = req.arguments?.webSocketUrl || 'ws://localhost:9229';
    this.connectAndWire(wsUrl);
    this.sendResponse(req, {});
  }

  private onAttach(req: DAPRequest): void {
    const wsUrl = req.arguments?.webSocketUrl || 'ws://localhost:9229';
    this.connectAndWire(wsUrl);
    this.sendResponse(req, {});
  }

  private onDisconnect(req: DAPRequest): void {
    this.debugClient.disconnect();
    this.sendResponse(req, {});
  }

  private onSetBreakpoints(req: DAPRequest): void {
    const args = req.arguments || {};
    const breakpoints: any[] = args.breakpoints || [];

    // Map VS Code line breakpoints to command-name breakpoints.
    // Since hyperscript lives in HTML attributes, each breakpoint line
    // may contain a command. We extract the command name from source content.
    const verified = breakpoints.map((bp: any, i: number) => {
      // Try to extract command from source line (best-effort)
      const commandName = bp.condition || `line-${bp.line}`;

      this.debugClient.sendSetBreakpoint({
        type: 'command',
        value: commandName,
        enabled: true,
      });

      return {
        id: i + 1,
        verified: true,
        line: bp.line,
        message: `Breakpoint on: ${commandName}`,
      };
    });

    this.sendResponse(req, { breakpoints: verified });
  }

  private onThreads(req: DAPRequest): void {
    // Hyperscript is single-threaded
    this.sendResponse(req, {
      threads: [{ id: 1, name: 'HyperFixi Main' }],
    });
  }

  private onStackTrace(req: DAPRequest): void {
    const frames: DAPStackFrame[] = [];

    if (this.currentSnapshot) {
      // Build stack from current snapshot depth
      // The topmost frame is the current command
      frames.push({
        id: 1,
        name: this.currentSnapshot.commandName,
        line: 0,
        column: 0,
        source: {
          name: this.currentSnapshot.element || 'hyperscript',
          sourceReference: 0,
        },
      });

      // Add depth context from history
      const depth = this.currentSnapshot.depth;
      for (let d = depth - 1; d >= 0; d--) {
        // Find most recent snapshot at this depth
        const frame = this.findFrameAtDepth(d);
        if (frame) {
          frames.push({
            id: d + 2,
            name: frame.commandName,
            line: 0,
            column: 0,
            source: {
              name: frame.element || 'hyperscript',
              sourceReference: 0,
            },
          });
        }
      }
    }

    this.sendResponse(req, {
      stackFrames: frames,
      totalFrames: frames.length,
    });
  }

  private onScopes(req: DAPRequest): void {
    const scopes: DAPScope[] = [
      {
        name: 'Special',
        variablesReference: SCOPE_SPECIAL,
        expensive: false,
      },
      {
        name: 'Locals',
        variablesReference: SCOPE_LOCALS,
        expensive: false,
      },
      {
        name: 'All Variables',
        variablesReference: SCOPE_ALL,
        expensive: false,
      },
    ];

    this.sendResponse(req, { scopes });
  }

  private onVariables(req: DAPRequest): void {
    const ref = req.arguments?.variablesReference || 0;
    const variables: DAPVariable[] = [];

    if (!this.currentSnapshot) {
      this.sendResponse(req, { variables });
      return;
    }

    const vars = this.currentSnapshot.variables;

    // Check if this is a child reference
    if (ref >= 10000) {
      const obj = this.variableRefs.get(ref);
      if (obj) {
        for (const [key, value] of Object.entries(obj)) {
          variables.push(this.createDAPVariable(key, value));
        }
      }
      this.sendResponse(req, { variables });
      return;
    }

    const specialKeys = new Set(['it', 'result', 'me', 'you', 'event', 'event.type']);

    switch (ref) {
      case SCOPE_SPECIAL:
        for (const key of specialKeys) {
          if (key in vars) {
            variables.push(this.createDAPVariable(key, vars[key]));
          }
        }
        break;

      case SCOPE_LOCALS:
        for (const [key, value] of Object.entries(vars)) {
          if (key.startsWith(':') || key.startsWith('$')) {
            variables.push(this.createDAPVariable(key, value));
          }
        }
        break;

      case SCOPE_ALL:
        for (const [key, value] of Object.entries(vars)) {
          variables.push(this.createDAPVariable(key, value));
        }
        break;
    }

    this.sendResponse(req, { variables });
  }

  private onContinue(req: DAPRequest): void {
    this.debugClient.sendContinue();
    this.sendResponse(req, { allThreadsContinued: true });
  }

  private onNext(req: DAPRequest): void {
    this.debugClient.sendStepOver();
    this.sendResponse(req, {});
  }

  private onStepIn(req: DAPRequest): void {
    this.debugClient.sendStepInto();
    this.sendResponse(req, {});
  }

  private onStepOut(req: DAPRequest): void {
    this.debugClient.sendStepOut();
    this.sendResponse(req, {});
  }

  private onPause(req: DAPRequest): void {
    this.debugClient.sendPause();
    this.sendResponse(req, {});
  }

  private onEvaluate(req: DAPRequest): void {
    const expression = req.arguments?.expression || '';
    const vars = this.currentSnapshot?.variables || {};

    // Simple expression evaluation: look up variable by name
    if (expression in vars) {
      const value = vars[expression];
      this.sendResponse(req, {
        result: this.formatValue(value),
        type: typeof value,
        variablesReference: 0,
      });
    } else {
      this.sendResponse(req, {
        result: `<unknown: ${expression}>`,
        type: 'string',
        variablesReference: 0,
      });
    }
  }

  // ── WebSocket Wiring ────────────────────────────────────────────────

  private connectAndWire(wsUrl: string): void {
    this.debugClient.setUrl(wsUrl);
    this.debugClient.connect();

    this.debugClient.on('paused', (snapshot: SerializedSnapshot) => {
      if (this.disposed) return;
      this.currentSnapshot = snapshot;
      this.snapshotHistory.push(snapshot);
      // Clear variable refs on new pause
      this.variableRefs.clear();
      this.nextVarRef = 10000;

      this.sendEvent('stopped', {
        reason: 'breakpoint',
        threadId: 1,
        allThreadsStopped: true,
        description: `Paused at: ${snapshot.commandName}`,
      });
    });

    this.debugClient.on('resumed', () => {
      if (this.disposed) return;
      this.sendEvent('continued', {
        threadId: 1,
        allThreadsContinued: true,
      });
    });

    this.debugClient.on('disconnected', () => {
      if (this.disposed) return;
      this.sendEvent('terminated', {});
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private findFrameAtDepth(depth: number): SerializedSnapshot | null {
    // Search history backward for most recent snapshot at this depth
    for (let i = this.snapshotHistory.length - 1; i >= 0; i--) {
      if (this.snapshotHistory[i].depth === depth) {
        return this.snapshotHistory[i];
      }
    }
    return null;
  }

  private createDAPVariable(name: string, value: unknown): DAPVariable {
    let variablesReference = 0;

    // If expandable, assign a reference
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const ref = this.nextVarRef++;
      this.variableRefs.set(ref, value as Record<string, unknown>);
      variablesReference = ref;
    } else if (Array.isArray(value)) {
      const ref = this.nextVarRef++;
      const obj: Record<string, unknown> = {};
      value.forEach((item, i) => {
        obj[`[${i}]`] = item;
      });
      obj['length'] = value.length;
      this.variableRefs.set(ref, obj);
      variablesReference = ref;
    }

    return {
      name,
      value: this.formatValue(value),
      type: value === null ? 'null' : typeof value,
      variablesReference,
    };
  }

  private formatValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length <= 3) return `{${keys.join(', ')}}`;
      return `{${keys.slice(0, 3).join(', ')}, ...}`;
    }
    return String(value);
  }

  private sendResponse(req: DAPRequest, body: any): void {
    const response: DAPResponse = {
      seq: this.seq++,
      type: 'response',
      request_seq: req.seq,
      success: true,
      command: req.command,
      body,
    };
    this._onDidSendMessage.fire(response as any);
  }

  private sendErrorResponse(req: DAPRequest, message: string): void {
    const response: DAPResponse = {
      seq: this.seq++,
      type: 'response',
      request_seq: req.seq,
      success: false,
      command: req.command,
      message,
    };
    this._onDidSendMessage.fire(response as any);
  }

  private sendEvent(event: string, body: any): void {
    const evt: DAPEvent = {
      seq: this.seq++,
      type: 'event',
      event,
      body,
    };
    this._onDidSendMessage.fire(evt as any);
  }
}
