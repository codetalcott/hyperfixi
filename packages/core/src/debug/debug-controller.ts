/**
 * DebugController — Interactive step-through debugger for HyperFixi
 *
 * Registers itself as a runtime hook via HookRegistry. The core mechanism
 * is a Promise-based pause: the beforeExecute hook returns a Promise that
 * only resolves when the user signals continue/step. Because command-adapter.ts
 * already `await`s runBeforeExecute(), this naturally pauses execution.
 */

import type { HookContext, RuntimeHooks } from '../types/hooks';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StepMode = 'continue' | 'over' | 'into' | 'out' | 'pause';

export interface BreakpointCondition {
  id: string;
  type: 'command' | 'element' | 'expression';
  /** Command name, CSS selector, or expression string */
  value: string;
  enabled: boolean;
  hitCount: number;
}

export interface DebugSnapshot {
  commandName: string;
  element: Element | null;
  /** Serialized snapshot of execution state */
  variables: Record<string, unknown>;
  timestamp: number;
  /** Nesting depth (0 = top-level command in handler) */
  depth: number;
  /** Sequential index in this debug session */
  index: number;
}

export interface DebugState {
  enabled: boolean;
  paused: boolean;
  stepMode: StepMode;
  callDepth: number;
  pauseDepth: number;
  currentSnapshot: DebugSnapshot | null;
}

export type DebugEventType = 'paused' | 'resumed' | 'snapshot' | 'enabled' | 'disabled';
export type DebugEventListener = (data: DebugSnapshot | undefined) => void;

// ---------------------------------------------------------------------------
// Ring Buffer for execution history
// ---------------------------------------------------------------------------

class RingBuffer<T> {
  private items: T[];
  private head = 0;
  private count = 0;

  constructor(private capacity: number) {
    this.items = new Array(capacity);
  }

  push(item: T): void {
    this.items[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  toArray(): T[] {
    if (this.count < this.capacity) {
      return this.items.slice(0, this.count);
    }
    // Wrap around: oldest items start at head
    return [...this.items.slice(this.head), ...this.items.slice(0, this.head)];
  }

  get length(): number {
    return this.count;
  }

  clear(): void {
    this.head = 0;
    this.count = 0;
  }

  last(): T | undefined {
    if (this.count === 0) return undefined;
    const idx = (this.head - 1 + this.capacity) % this.capacity;
    return this.items[idx];
  }
}

// ---------------------------------------------------------------------------
// DebugController
// ---------------------------------------------------------------------------

const HISTORY_CAPACITY = 200;

export class DebugController {
  private state: DebugState = {
    enabled: false,
    paused: false,
    stepMode: 'continue',
    callDepth: 0,
    pauseDepth: 0,
    currentSnapshot: null,
  };

  private history = new RingBuffer<DebugSnapshot>(HISTORY_CAPACITY);
  private breakpoints = new Map<string, BreakpointCondition>();
  private snapshotIndex = 0;

  private _resumeResolver: (() => void) | null = null;
  private listeners = new Map<DebugEventType, Set<DebugEventListener>>();

  // The RuntimeHooks object registered with the HookRegistry
  readonly hooks: RuntimeHooks;

  constructor() {
    // Bind hooks to this controller instance
    this.hooks = {
      beforeExecute: this.beforeExecute.bind(this),
      afterExecute: this.afterExecute.bind(this),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Event Emitter
  // ─────────────────────────────────────────────────────────────

  on(event: DebugEventType, listener: DebugEventListener): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => set!.delete(listener);
  }

  private emit(event: DebugEventType, data?: DebugSnapshot): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        try {
          listener(data);
        } catch {
          // Don't let listener errors break the debugger
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Enable / Disable
  // ─────────────────────────────────────────────────────────────

  enable(): void {
    this.state.enabled = true;
    this.emit('enabled');
  }

  disable(): void {
    // If paused, resume first
    if (this.state.paused && this._resumeResolver) {
      this._resumeResolver();
      this._resumeResolver = null;
    }
    this.state.enabled = false;
    this.state.paused = false;
    this.state.stepMode = 'continue';
    this.state.callDepth = 0;
    this.emit('disabled');
  }

  get enabled(): boolean {
    return this.state.enabled;
  }

  // ─────────────────────────────────────────────────────────────
  // Step Controls
  // ─────────────────────────────────────────────────────────────

  /** Resume execution, only stopping at breakpoints */
  continue(): void {
    this.state.stepMode = 'continue';
    this.resume();
  }

  /** Pause at the very next command */
  pause(): void {
    this.state.stepMode = 'pause';
  }

  /** Execute current command, pause at next command at same or shallower depth */
  stepOver(): void {
    this.state.stepMode = 'over';
    this.state.pauseDepth = this.state.callDepth;
    this.resume();
  }

  /** Pause at the very next command (enters nested execution) */
  stepInto(): void {
    this.state.stepMode = 'into';
    this.resume();
  }

  /** Resume until returning to a shallower call depth */
  stepOut(): void {
    this.state.stepMode = 'out';
    this.state.pauseDepth = this.state.callDepth;
    this.resume();
  }

  private resume(): void {
    if (this._resumeResolver) {
      this.state.paused = false;
      this.emit('resumed');
      this._resumeResolver();
      this._resumeResolver = null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Breakpoints
  // ─────────────────────────────────────────────────────────────

  setBreakpoint(condition: Omit<BreakpointCondition, 'id' | 'hitCount'>): string {
    const id = `bp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.breakpoints.set(id, { ...condition, id, hitCount: 0 });
    return id;
  }

  removeBreakpoint(id: string): boolean {
    return this.breakpoints.delete(id);
  }

  getBreakpoints(): BreakpointCondition[] {
    return Array.from(this.breakpoints.values());
  }

  clearBreakpoints(): void {
    this.breakpoints.clear();
  }

  // ─────────────────────────────────────────────────────────────
  // State & History
  // ─────────────────────────────────────────────────────────────

  getState(): Readonly<DebugState> {
    return { ...this.state };
  }

  getHistory(): DebugSnapshot[] {
    return this.history.toArray();
  }

  clearHistory(): void {
    this.history.clear();
    this.snapshotIndex = 0;
  }

  // ─────────────────────────────────────────────────────────────
  // Hook Implementations (called by HookRegistry)
  // ─────────────────────────────────────────────────────────────

  private async beforeExecute(ctx: HookContext): Promise<void> {
    if (!this.state.enabled) return;

    this.state.callDepth++;

    const snapshot = this.captureSnapshot(ctx);
    this.history.push(snapshot);
    this.emit('snapshot', snapshot);

    if (this.shouldPause(ctx)) {
      this.state.paused = true;
      this.state.currentSnapshot = snapshot;
      this.emit('paused', snapshot);

      // This Promise blocks execution until the user signals continue/step
      await new Promise<void>(resolve => {
        this._resumeResolver = resolve;
      });

      this.state.currentSnapshot = null;
    }
  }

  private async afterExecute(ctx: HookContext, result: unknown): Promise<void> {
    if (!this.state.enabled) return;

    // Enrich the last snapshot with the command's result
    const lastSnapshot = this.history.last();
    if (lastSnapshot) {
      lastSnapshot.variables['__result'] = serializeValue(result);
    }

    this.state.callDepth = Math.max(0, this.state.callDepth - 1);
  }

  // ─────────────────────────────────────────────────────────────
  // Pause Decision Logic
  // ─────────────────────────────────────────────────────────────

  private shouldPause(ctx: HookContext): boolean {
    // Always check breakpoints first (regardless of step mode)
    if (this.hitBreakpoint(ctx)) return true;

    switch (this.state.stepMode) {
      case 'pause':
        // Manual pause — stop at next command, then switch to 'into' for subsequent stepping
        this.state.stepMode = 'into';
        return true;

      case 'into':
        // Step into — pause at every command
        return true;

      case 'over':
        // Step over — pause only at same depth or shallower
        return this.state.callDepth <= this.state.pauseDepth;

      case 'out':
        // Step out — pause only when returned to shallower depth
        return this.state.callDepth < this.state.pauseDepth;

      case 'continue':
        // Continue — only pause at breakpoints (already checked above)
        return false;
    }
  }

  private hitBreakpoint(ctx: HookContext): boolean {
    for (const bp of this.breakpoints.values()) {
      if (!bp.enabled) continue;

      let hit = false;

      switch (bp.type) {
        case 'command':
          hit = ctx.commandName === bp.value;
          break;

        case 'element':
          if (ctx.element) {
            try {
              hit = ctx.element.matches(bp.value);
            } catch {
              // Invalid selector — skip
            }
          }
          break;

        case 'expression':
          // Expression breakpoints evaluate a simple condition
          // For now, support checking variable values: "it === 'hello'"
          hit = this.evaluateCondition(bp.value, ctx);
          break;
      }

      if (hit) {
        bp.hitCount++;
        return true;
      }
    }
    return false;
  }

  private evaluateCondition(expression: string, ctx: HookContext): boolean {
    // Simple condition evaluation for breakpoint expressions
    // Supports: "commandName === 'toggle'", "it === 'value'"
    try {
      const ec = ctx.executionContext;
      const vars: Record<string, unknown> = {
        commandName: ctx.commandName,
        it: ec.it,
        result: ec.result,
        me: ec.me,
      };
      // Add locals
      if (ec.locals) {
        for (const [k, v] of ec.locals) {
          vars[k] = v;
        }
      }
      // Use Function constructor for simple expression evaluation
      const keys = Object.keys(vars);
      const values = keys.map(k => vars[k]);
      const fn = new Function(...keys, `return (${expression});`);
      return !!fn(...values);
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Snapshot Capture
  // ─────────────────────────────────────────────────────────────

  private captureSnapshot(ctx: HookContext): DebugSnapshot {
    const ec = ctx.executionContext;
    const variables: Record<string, unknown> = {};

    // Core execution state
    variables['it'] = serializeValue(ec.it);
    variables['result'] = serializeValue(ec.result);

    // Element references
    if (ec.me) variables['me'] = describeElement(ec.me as Element);
    if (ec.you) variables['you'] = describeElement(ec.you as Element);

    // Event info
    if (ctx.event) {
      variables['event.type'] = ctx.event.type;
      if ((ctx.event as Event & { target: Element }).target) {
        variables['event.target'] = describeElement(
          (ctx.event as Event & { target: Element }).target
        );
      }
    }

    // Local variables (user-defined with : prefix)
    if (ec.locals) {
      for (const [key, value] of ec.locals) {
        if (!key.startsWith('__')) {
          variables[`:${key}`] = serializeValue(value);
        }
      }
    }

    return {
      commandName: ctx.commandName,
      element: ctx.element,
      variables,
      timestamp: Date.now(),
      depth: this.state.callDepth,
      index: this.snapshotIndex++,
    };
  }
}

// ---------------------------------------------------------------------------
// Serialization Helpers
// ---------------------------------------------------------------------------

function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Element) {
    return describeElement(value);
  }
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  if (value instanceof Map) {
    return `Map(${value.size})`;
  }
  if (value instanceof Set) {
    return `Set(${value.size})`;
  }
  if (typeof value === 'function') {
    return `\u0192 ${(value as { name?: string }).name || 'anonymous'}()`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as object);
    if (keys.length <= 3) {
      return `{${keys.join(', ')}}`;
    }
    return `{${keys.slice(0, 3).join(', ')}, ...${keys.length - 3} more}`;
  }
  return String(value);
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
