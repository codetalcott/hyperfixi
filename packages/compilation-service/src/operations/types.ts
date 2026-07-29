/**
 * Abstract Operation Types
 *
 * The core abstraction layer between semantic roles and output format.
 * Each operation describes a single DOM/state change without prescribing
 * how to emit it — the same operations power test generation (Phase 2)
 * and cross-framework codegen (Phase 3).
 */

// =============================================================================
// Target References
// =============================================================================

/** A reference to the target of an operation */
export type TargetRef =
  { kind: 'self' } | { kind: 'selector'; value: string } | { kind: 'variable'; value: string };

// =============================================================================
// Abstract Operations
// =============================================================================

// --- DOM Class ---
export interface ToggleClassOp {
  op: 'toggleClass';
  className: string;
  target: TargetRef;
}

export interface AddClassOp {
  op: 'addClass';
  className: string;
  target: TargetRef;
}

export interface RemoveClassOp {
  op: 'removeClass';
  className: string;
  target: TargetRef;
}

// --- DOM Content ---
export interface SetContentOp {
  op: 'setContent';
  content: string;
  target: TargetRef;
  position: 'into' | 'before' | 'after' | 'start' | 'end';
}

export interface AppendContentOp {
  op: 'appendContent';
  content: string;
  target: TargetRef;
}

// --- DOM Visibility ---
export interface ShowOp {
  op: 'show';
  target: TargetRef;
}

export interface HideOp {
  op: 'hide';
  target: TargetRef;
}

// --- Variables ---
export interface SetVariableOp {
  op: 'setVariable';
  name: string;
  value: string;
  scope: 'local' | 'element' | 'global';
}

export interface IncrementOp {
  op: 'increment';
  target: TargetRef;
  amount: number;
}

export interface DecrementOp {
  op: 'decrement';
  target: TargetRef;
  amount: number;
}

// --- Navigation ---
export interface NavigateOp {
  op: 'navigate';
  url: string;
}

export interface HistoryBackOp {
  op: 'historyBack';
}

export interface HistoryForwardOp {
  op: 'historyForward';
}

// --- Async ---
export interface FetchOp {
  op: 'fetch';
  url: string;
  format: 'json' | 'text' | 'html';
  target?: TargetRef;
}

export interface WaitOp {
  op: 'wait';
  durationMs: number;
}

// --- Events ---
export interface TriggerEventOp {
  op: 'triggerEvent';
  eventName: string;
  target: TargetRef;
  detail?: string;
}

// --- Focus ---
export interface FocusOp {
  op: 'focus';
  target: TargetRef;
}

export interface BlurOp {
  op: 'blur';
  target: TargetRef;
}

// --- Utility ---
export interface LogOp {
  op: 'log';
  values: string[];
}

/** Union of all abstract operations */
export type AbstractOperation =
  | ToggleClassOp
  | AddClassOp
  | RemoveClassOp
  | SetContentOp
  | AppendContentOp
  | ShowOp
  | HideOp
  | SetVariableOp
  | IncrementOp
  | DecrementOp
  | NavigateOp
  | HistoryBackOp
  | HistoryForwardOp
  | FetchOp
  | WaitOp
  | TriggerEventOp
  | FocusOp
  | BlurOp
  | LogOp;

// =============================================================================
// Behavior Spec
// =============================================================================

/**
 * A complete behavior specification: what triggers it and what it does.
 * Extracted from a semantic event handler node.
 */
export interface BehaviorSpec {
  /** The triggering event */
  trigger: {
    event: string;
    modifiers?: Record<string, unknown>;
  };
  /** The element that listens for the trigger */
  triggerTarget: TargetRef;
  /** The operations performed when triggered */
  operations: AbstractOperation[];
  /** Whether any operation is async */
  async: boolean;
  /** Original hyperscript source (for test naming) */
  source?: string;
}
