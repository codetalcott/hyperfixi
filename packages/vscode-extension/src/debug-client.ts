/**
 * VS Code Debug Client — WebSocket connection to the HyperFixi debug server.
 *
 * Mirrors the browser-side DebugWSClient protocol from
 * packages/developer-tools/src/debugger/ws-bridge.ts
 */

import WebSocket from 'ws';

// ---------------------------------------------------------------------------
// Protocol types (inlined from ws-bridge.ts to avoid cross-package dep)
// ---------------------------------------------------------------------------

export type WSDebugMessage =
  | { type: 'paused'; snapshot: SerializedSnapshot }
  | { type: 'resumed' }
  | { type: 'snapshot'; snapshot: SerializedSnapshot }
  | { type: 'enabled' }
  | { type: 'disabled' }
  | { type: 'continue' }
  | { type: 'pause' }
  | { type: 'stepOver' }
  | { type: 'stepInto' }
  | { type: 'stepOut' }
  | { type: 'setBreakpoint'; breakpoint: { type: string; value: string; enabled: boolean } }
  | { type: 'removeBreakpoint'; id: string }
  | { type: 'getState' }
  | { type: 'state'; state: Record<string, unknown> };

export interface SerializedSnapshot {
  commandName: string;
  element: string | null;
  variables: Record<string, unknown>;
  timestamp: number;
  depth: number;
  index: number;
}

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export type DebugClientEventType =
  | 'connected'
  | 'disconnected'
  | 'paused'
  | 'resumed'
  | 'snapshot'
  | 'enabled'
  | 'disabled'
  | 'state';

export type DebugClientListener = (data?: any) => void;

// ---------------------------------------------------------------------------
// DebugClient
// ---------------------------------------------------------------------------

export class DebugClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Map<DebugClientEventType, Set<DebugClientListener>>();
  private _connected = false;
  private _paused = false;
  private _lastSnapshot: SerializedSnapshot | null = null;

  constructor(
    private url: string = 'ws://localhost:9229',
    private autoReconnect: boolean = false
  ) {}

  // ── Connection ──────────────────────────────────────────────────────

  connect(): void {
    this.doConnect();
  }

  disconnect(): void {
    this.autoReconnect = false;
    this.clearReconnect();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setConnected(false);
  }

  isConnected(): boolean {
    return this._connected;
  }

  isPaused(): boolean {
    return this._paused;
  }

  get lastSnapshot(): SerializedSnapshot | null {
    return this._lastSnapshot;
  }

  setUrl(url: string): void {
    this.url = url;
  }

  // ── Outgoing commands ───────────────────────────────────────────────

  sendContinue(): void {
    this.send({ type: 'continue' });
    this._paused = false;
  }

  sendPause(): void {
    this.send({ type: 'pause' });
  }

  sendStepOver(): void {
    this.send({ type: 'stepOver' });
  }

  sendStepInto(): void {
    this.send({ type: 'stepInto' });
  }

  sendStepOut(): void {
    this.send({ type: 'stepOut' });
  }

  sendSetBreakpoint(breakpoint: { type: string; value: string; enabled: boolean }): void {
    this.send({ type: 'setBreakpoint', breakpoint });
  }

  sendRemoveBreakpoint(id: string): void {
    this.send({ type: 'removeBreakpoint', id });
  }

  sendGetState(): void {
    this.send({ type: 'getState' });
  }

  // ── Event emitter ───────────────────────────────────────────────────

  on(event: DebugClientEventType, listener: DebugClientListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  // ── Internal ────────────────────────────────────────────────────────

  private doConnect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        this.setConnected(true);
        this.clearReconnect();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const msg: WSDebugMessage = JSON.parse(data.toString());
          this.handleMessage(msg);
        } catch {
          // Ignore malformed messages
        }
      });

      this.ws.on('close', () => {
        this.ws = null;
        this.setConnected(false);
        if (this.autoReconnect) {
          this.reconnectTimer = setTimeout(() => this.doConnect(), 3000);
        }
      });

      this.ws.on('error', () => {
        // onclose fires after onerror
      });
    } catch {
      if (this.autoReconnect) {
        this.reconnectTimer = setTimeout(() => this.doConnect(), 3000);
      }
    }
  }

  private handleMessage(msg: WSDebugMessage): void {
    switch (msg.type) {
      case 'paused':
        this._paused = true;
        this._lastSnapshot = msg.snapshot;
        this.emit('paused', msg.snapshot);
        break;

      case 'resumed':
        this._paused = false;
        this.emit('resumed');
        break;

      case 'snapshot':
        this._lastSnapshot = msg.snapshot;
        this.emit('snapshot', msg.snapshot);
        break;

      case 'enabled':
        this.emit('enabled');
        break;

      case 'disabled':
        this.emit('disabled');
        break;

      case 'state':
        this.emit('state', msg.state);
        break;
    }
  }

  private send(msg: WSDebugMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private setConnected(connected: boolean): void {
    const changed = this._connected !== connected;
    this._connected = connected;
    if (changed) {
      this.emit(connected ? 'connected' : 'disconnected');
      if (!connected) {
        this._paused = false;
        this._lastSnapshot = null;
      }
    }
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private emit(event: DebugClientEventType, data?: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        listener(data);
      }
    }
  }

  dispose(): void {
    this.disconnect();
    this.listeners.clear();
  }
}
