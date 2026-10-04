/**
 * The debug API the overlay and the WebSocket bridge drive: a host's `debug` object.
 *
 * `@hyperfixi/core` 3.x's runtime provided it (`hyperscript.debug`, its DebugController,
 * which paused execution through a runtime hook). `@hyperfixi/engine` — what `hyperfixi.js`
 * is since 4.0 — has no debugger hooks, so no shipped bundle provides it today: the overlay
 * finds no API and says so. Declared here structurally (until Phase C4 the types came from
 * `@hyperfixi/core`'s root, which re-exports the engine at 4.0).
 */

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

export interface DebugController {
  on(event: DebugEventType, listener: DebugEventListener): () => void;
  enable(): void;
  disable(): void;
  readonly enabled: boolean;
  continue(): void;
  pause(): void;
  stepOver(): void;
  stepInto(): void;
  stepOut(): void;
  setBreakpoint(condition: Omit<BreakpointCondition, 'id' | 'hitCount'>): string;
  removeBreakpoint(id: string): boolean;
  getBreakpoints(): BreakpointCondition[];
  clearBreakpoints(): void;
  getState(): Readonly<DebugState>;
  getHistory(): DebugSnapshot[];
  clearHistory(): void;
}
