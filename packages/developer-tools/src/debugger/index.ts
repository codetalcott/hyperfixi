/**
 * HyperScript Debugger - Debug hyperscript execution
 *
 * Provides breakpoint management, step execution, variable inspection,
 * and WebSocket-based communication for browser debugging.
 */

import { WebSocket, WebSocketServer } from 'ws';
import type {
  DebugConfig,
  DebugBreakpoint,
  DebugSession,
  DebugFrame,
  DebugVariable,
} from '../types';

export { BreakpointManager } from './breakpoint-manager';
export type { Breakpoint } from './breakpoint-manager';
export { VariableInspector } from './variable-inspector';
export type { InspectedVariable } from './variable-inspector';

/**
 * Debug event types
 */
export type DebugEventType =
  | 'started'
  | 'stopped'
  | 'paused'
  | 'resumed'
  | 'breakpointHit'
  | 'stepCompleted'
  | 'variablesUpdated'
  | 'output'
  | 'error';

/**
 * Debug event
 */
export interface DebugEvent {
  type: DebugEventType;
  sessionId: string;
  timestamp: number;
  data?: any;
}

/**
 * Debug message from client
 */
export interface DebugMessage {
  type:
    | 'continue'
    | 'pause'
    | 'stepOver'
    | 'stepInto'
    | 'stepOut'
    | 'setBreakpoint'
    | 'removeBreakpoint'
    | 'evaluate'
    | 'getVariables';
  data?: any;
}

/**
 * HyperScript Debugger class
 */
export class HyperScriptDebugger {
  private config: DebugConfig;
  private session: DebugSession | null = null;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private eventListeners: Map<DebugEventType, Array<(event: DebugEvent) => void>> = new Map();
  private breakpoints: Map<string, DebugBreakpoint[]> = new Map();
  private isPaused: boolean = false;
  private callStack: DebugFrame[] = [];
  private variables: Map<number, DebugVariable[]> = new Map();
  private output: string[] = [];

  constructor(config: Partial<DebugConfig> = {}) {
    this.config = {
      port: config.port ?? 9229,
      breakpoints: config.breakpoints ?? [],
      watchExpressions: config.watchExpressions ?? [],
      logLevel: config.logLevel ?? 'info',
      sourceMap: config.sourceMap ?? true,
    };

    // Initialize breakpoints from config
    for (const bp of this.config.breakpoints) {
      this.setBreakpoint(bp);
    }
  }

  /**
   * Start debug session
   */
  async startSession(): Promise<DebugSession> {
    if (this.session) {
      throw new Error('Debug session already active');
    }

    this.session = {
      id: `debug-${Date.now()}`,
      status: 'running',
      callStack: [],
      variables: [],
      output: [],
    };

    // Start WebSocket server for browser connections
    await this.startWebSocketServer();

    this.emit('started', { sessionId: this.session.id });
    return this.session;
  }

  /**
   * Stop debug session
   */
  async stopSession(): Promise<void> {
    if (!this.session) return;

    this.emit('stopped', { sessionId: this.session.id });

    // Close WebSocket connections
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.session = null;
    this.isPaused = false;
    this.callStack = [];
    this.variables.clear();
    this.output = [];
  }

  /**
   * Start WebSocket server for debug connections
   */
  private async startWebSocketServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.config.port });

        this.wss.on('connection', ws => {
          this.clients.add(ws);
          this.log('info', 'Debug client connected');

          // Send current state
          this.sendToClient(ws, {
            type: 'init',
            session: this.session,
            breakpoints: Array.from(this.breakpoints.entries()),
          });

          ws.on('message', data => {
            this.handleClientMessage(ws, data.toString());
          });

          ws.on('close', () => {
            this.clients.delete(ws);
            this.log('info', 'Debug client disconnected');
          });
        });

        this.wss.on('listening', () => {
          this.log('info', `Debug server listening on port ${this.config.port}`);
          resolve();
        });

        this.wss.on('error', error => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle message from debug client
   */
  private handleClientMessage(ws: WebSocket, data: string): void {
    try {
      const message: DebugMessage = JSON.parse(data);

      switch (message.type) {
        case 'continue':
          this.continue();
          break;

        case 'pause':
          this.pause();
          break;

        case 'stepOver':
          this.stepOver();
          break;

        case 'stepInto':
          this.stepInto();
          break;

        case 'stepOut':
          this.stepOut();
          break;

        case 'setBreakpoint':
          this.setBreakpoint(message.data);
          break;

        case 'removeBreakpoint':
          this.removeBreakpoint(message.data.file, message.data.line);
          break;

        case 'evaluate':
          const result = this.evaluateExpression(message.data.expression, message.data.frameId);
          this.sendToClient(ws, { type: 'evaluateResult', result });
          break;

        case 'getVariables':
          const vars = this.getVariables(message.data.frameId);
          this.sendToClient(ws, { type: 'variables', variables: vars });
          break;
      }
    } catch (error) {
      this.log('error', `Failed to handle message: ${error}`);
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all clients
   */
  private broadcast(message: any): void {
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  /**
   * Set a breakpoint
   */
  setBreakpoint(breakpoint: DebugBreakpoint): void {
    const key = breakpoint.file;
    if (!this.breakpoints.has(key)) {
      this.breakpoints.set(key, []);
    }

    // Check if breakpoint already exists
    const existing = this.breakpoints.get(key)!;
    const exists = existing.some(bp => bp.line === breakpoint.line);

    if (!exists) {
      existing.push(breakpoint);
      this.broadcast({ type: 'breakpointSet', breakpoint });
    }
  }

  /**
   * Remove a breakpoint
   */
  removeBreakpoint(file: string, line: number): void {
    const breakpoints = this.breakpoints.get(file);
    if (breakpoints) {
      const index = breakpoints.findIndex(bp => bp.line === line);
      if (index !== -1) {
        breakpoints.splice(index, 1);
        this.broadcast({ type: 'breakpointRemoved', file, line });
      }
    }
  }

  /**
   * Check if there's a breakpoint at location
   */
  hasBreakpoint(file: string, line: number): boolean {
    const breakpoints = this.breakpoints.get(file);
    if (!breakpoints) return false;

    return breakpoints.some(bp => bp.line === line && bp.enabled);
  }

  /**
   * Continue execution
   */
  continue(): void {
    if (!this.session) return;

    this.isPaused = false;
    this.session.status = 'running';
    this.emit('resumed', {});
    this.broadcast({ type: 'resumed' });
  }

  /**
   * Pause execution
   */
  pause(): void {
    if (!this.session) return;

    this.isPaused = true;
    this.session.status = 'paused';
    this.emit('paused', { callStack: this.callStack });
    this.broadcast({ type: 'paused', callStack: this.callStack });
  }

  /**
   * Step over current statement
   */
  stepOver(): void {
    if (!this.session || !this.isPaused) return;

    // In a real implementation, this would coordinate with the runtime
    this.emit('stepCompleted', { type: 'over' });
    this.broadcast({ type: 'stepCompleted', stepType: 'over' });
  }

  /**
   * Step into function call
   */
  stepInto(): void {
    if (!this.session || !this.isPaused) return;

    this.emit('stepCompleted', { type: 'into' });
    this.broadcast({ type: 'stepCompleted', stepType: 'into' });
  }

  /**
   * Step out of current function
   */
  stepOut(): void {
    if (!this.session || !this.isPaused) return;

    this.emit('stepCompleted', { type: 'out' });
    this.broadcast({ type: 'stepCompleted', stepType: 'out' });
  }

  /**
   * Get variables for a stack frame
   */
  getVariables(frameId: number): DebugVariable[] {
    return this.variables.get(frameId) || [];
  }

  /**
   * Update variables for a stack frame
   */
  setVariables(frameId: number, variables: DebugVariable[]): void {
    this.variables.set(frameId, variables);
    this.emit('variablesUpdated', { frameId, variables });
    this.broadcast({ type: 'variablesUpdated', frameId, variables });
  }

  /**
   * Evaluate an expression in context
   */
  evaluateExpression(expression: string, frameId: number = 0): any {
    // In a real implementation, this would evaluate in the hyperscript context
    // For now, return a placeholder
    return {
      expression,
      result: `[evaluation of "${expression}" not implemented]`,
      type: 'string',
    };
  }

  /**
   * Add watch expression
   */
  addWatchExpression(expression: string): void {
    if (!this.config.watchExpressions.includes(expression)) {
      this.config.watchExpressions.push(expression);
    }
  }

  /**
   * Remove watch expression
   */
  removeWatchExpression(expression: string): void {
    const index = this.config.watchExpressions.indexOf(expression);
    if (index !== -1) {
      this.config.watchExpressions.splice(index, 1);
    }
  }

  /**
   * Push a stack frame
   */
  pushFrame(frame: DebugFrame): void {
    this.callStack.push(frame);
    if (this.session) {
      this.session.callStack = this.callStack;
    }
  }

  /**
   * Pop a stack frame
   */
  popFrame(): DebugFrame | undefined {
    const frame = this.callStack.pop();
    if (this.session) {
      this.session.callStack = this.callStack;
    }
    return frame;
  }

  /**
   * Log output
   */
  logOutput(message: string): void {
    this.output.push(message);
    if (this.session) {
      this.session.output = this.output;
    }
    this.emit('output', { message });
    this.broadcast({ type: 'output', message });
  }

  /**
   * Get current session
   */
  getSession(): DebugSession | null {
    return this.session;
  }

  /**
   * Check if paused
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Add event listener
   */
  on(event: DebugEventType, listener: (event: DebugEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(event: DebugEventType, listener: (event: DebugEvent) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit debug event
   */
  private emit(type: DebugEventType, data?: any): void {
    const event: DebugEvent = {
      type,
      sessionId: this.session?.id || '',
      timestamp: Date.now(),
      data,
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }

  /**
   * Log message
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) >= levels.indexOf(this.config.logLevel)) {
      console.log(`[debugger:${level}] ${message}`);
    }
  }
}

/**
 * Create a debugger instance
 */
export function createDebugger(config?: Partial<DebugConfig>): HyperScriptDebugger {
  return new HyperScriptDebugger(config);
}

export default HyperScriptDebugger;
