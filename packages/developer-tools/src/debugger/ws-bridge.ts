/**
 * WebSocket Bridge — connects the browser-side DebugController to external tools.
 *
 * Browser side: Serializes debug events and sends them over WebSocket.
 * Receives step commands from external tools and forwards to the controller.
 *
 * This bridges:
 *   Browser (DebugController) <-> WebSocket <-> Node.js (CLI debugger, VS Code, MCP)
 */

import type { DebugSnapshot } from '@hyperfixi/core';

// ---------------------------------------------------------------------------
// Message Protocol (shared between browser client and Node.js server)
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

/** Serialized snapshot (element replaced with string description) */
export interface SerializedSnapshot {
  commandName: string;
  element: string | null;
  variables: Record<string, unknown>;
  timestamp: number;
  depth: number;
  index: number;
}

// ---------------------------------------------------------------------------
// Browser-side WebSocket Client
// ---------------------------------------------------------------------------

export class DebugWSClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private controller: any; // DebugController — avoids import in browser context

  constructor(
    private url = 'ws://localhost:9229',
    private autoReconnect = true
  ) {}

  /** Connect to the WebSocket debug server and wire up the controller */
  connect(controller: any): void {
    this.controller = controller;
    this.doConnect();
  }

  disconnect(): void {
    this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private doConnect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[HyperFixi Debug WS] Connected to', this.url);
        this.sendMessage({ type: 'enabled' });
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg: WSDebugMessage = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (this.autoReconnect) {
          this.reconnectTimer = setTimeout(() => this.doConnect(), 2000);
        }
      };

      this.ws.onerror = () => {
        // onclose will fire after onerror
      };
    } catch {
      if (this.autoReconnect) {
        this.reconnectTimer = setTimeout(() => this.doConnect(), 2000);
      }
    }

    // Wire controller events to WebSocket
    if (this.controller) {
      this.controller.on('paused', (snapshot: DebugSnapshot | undefined) => {
        if (snapshot) {
          this.sendMessage({ type: 'paused', snapshot: serializeSnapshot(snapshot) });
        }
      });
      this.controller.on('resumed', () => {
        this.sendMessage({ type: 'resumed' });
      });
      this.controller.on('snapshot', (snapshot: DebugSnapshot | undefined) => {
        if (snapshot) {
          this.sendMessage({ type: 'snapshot', snapshot: serializeSnapshot(snapshot) });
        }
      });
    }
  }

  private handleServerMessage(msg: WSDebugMessage): void {
    if (!this.controller) return;

    switch (msg.type) {
      case 'continue':
        this.controller.continue();
        break;
      case 'pause':
        this.controller.pause();
        break;
      case 'stepOver':
        this.controller.stepOver();
        break;
      case 'stepInto':
        this.controller.stepInto();
        break;
      case 'stepOut':
        this.controller.stepOut();
        break;
      case 'setBreakpoint':
        this.controller.setBreakpoint(msg.breakpoint);
        break;
      case 'removeBreakpoint':
        this.controller.removeBreakpoint(msg.id);
        break;
      case 'getState':
        this.sendMessage({
          type: 'state',
          state: this.controller.getState(),
        });
        break;
    }
  }

  private sendMessage(msg: WSDebugMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

function serializeSnapshot(snapshot: DebugSnapshot): SerializedSnapshot {
  return {
    commandName: snapshot.commandName,
    element: snapshot.element ? describeElement(snapshot.element) : null,
    variables: snapshot.variables,
    timestamp: snapshot.timestamp,
    depth: snapshot.depth,
    index: snapshot.index,
  };
}

function describeElement(el: Element): string {
  let desc = `<${el.tagName.toLowerCase()}`;
  if (el.id) desc += `#${el.id}`;
  if (el.classList.length > 0) {
    desc += `.${Array.from(el.classList).join('.')}`;
  }
  desc += '>';
  return desc;
}
