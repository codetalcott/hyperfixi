/**
 * Semantic Diff Types
 *
 * Types for comparing two hyperscript behaviors at the abstract operation level.
 */

import type { AbstractOperation } from '../operations/types.js';
import type { Diagnostic, ProtocolNodeJSON } from '../types.js';

// =============================================================================
// Request / Response
// =============================================================================

/** One side of a diff comparison — accepts any input format */
export interface DiffInput {
  /** Natural language hyperscript (requires `language`) */
  code?: string;
  /** Explicit syntax: [command role:value ...] */
  explicit?: string;
  /** LLM JSON — structured semantic representation */
  semantic?: ProtocolNodeJSON;
  /** ISO 639-1 language code (required for `code`) */
  language?: string;
}

/** Diff request — compare two hyperscript inputs */
export interface DiffRequest {
  a: DiffInput;
  b: DiffInput;
  /** Minimum confidence for natural language parsing (default 0.7) */
  confidence?: number;
}

/** Diff response — structured comparison result */
export interface DiffResponse {
  /** Whether both sides parsed successfully */
  ok: boolean;
  /** Whether the two behaviors are semantically identical */
  identical: boolean;
  /** Trigger comparison (null when triggers match) */
  trigger: TriggerDiff | null;
  /** Per-operation comparison */
  operations: OperationDiff[];
  /** Human-readable summary */
  summary: string;
  /** Diagnostics from parsing both sides */
  diagnostics: Diagnostic[];
}

// =============================================================================
// Diff Details
// =============================================================================

/** Trigger difference */
export interface TriggerDiff {
  a: { event: string; modifiers?: Record<string, unknown> };
  b: { event: string; modifiers?: Record<string, unknown> };
  changes: string[];
}

/** Kind of operation change */
export type OperationChangeKind = 'added' | 'removed' | 'changed' | 'reordered' | 'unchanged';

/** A single operation difference */
export interface OperationDiff {
  kind: OperationChangeKind;
  index: { a?: number; b?: number };
  a?: AbstractOperation;
  b?: AbstractOperation;
  changes?: string[];
}
