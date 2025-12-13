/**
 * Core Execution Context - Minimal, Tree-Shakeable Foundation
 *
 * This file provides the minimal context interface that all execution contexts extend.
 * Designed for tree-shaking: minimal bundles can import only CoreExecutionContext.
 *
 * Type Hierarchy:
 *   CoreExecutionContext (this file) - Minimal runtime requirements
 *        ↓
 *   ExecutionContext (base-types.ts) - Full runtime with legacy support
 *        ↓
 *   TypedExecutionContext - Type registry + validation cache
 */

// ============================================================================
// Core Execution Context (Tier 1 - Minimal)
// ============================================================================

/**
 * Minimal execution context for tree-shakeable bundles.
 * Uses Element (not HTMLElement) for maximum compatibility since HTMLElement extends Element.
 *
 * This is the foundation that all contexts build upon. It contains only the
 * properties that are absolutely required for basic hyperscript execution.
 */
export interface CoreExecutionContext {
  /** Current element context ('me' reference) - mutable for runtime context updates */
  me: Element | null;

  /** Target element for operations ('you' reference) - mutable for runtime context updates */
  you: Element | null;

  /** Result of last expression evaluation ('it' reference) - mutable for runtime */
  it: unknown;

  /** Current event being handled (optional - may not be in event handler) */
  readonly event?: Event | null;

  /** Local variables scoped to current execution */
  readonly locals: Map<string, unknown>;

  /** Global variables shared across executions */
  readonly globals: Map<string, unknown>;
}

// ============================================================================
// Context Factory Types
// ============================================================================

/**
 * Options for creating a minimal execution context
 */
export interface CoreContextOptions {
  /** Element to use as 'me' context */
  me?: Element | null;
  /** Element to use as 'you' context */
  you?: Element | null;
  /** Initial 'it' value */
  it?: unknown;
  /** Event being handled */
  event?: Event | null;
  /** Initial local variables */
  locals?: Map<string, unknown>;
  /** Initial global variables */
  globals?: Map<string, unknown>;
}

/**
 * Create a minimal execution context with defaults.
 * Use this for tree-shakeable minimal bundles.
 */
export function createCoreContext(options: CoreContextOptions = {}): CoreExecutionContext {
  return {
    me: options.me ?? null,
    you: options.you ?? null,
    it: options.it ?? null,
    event: options.event ?? null,
    locals: options.locals ?? new Map(),
    globals: options.globals ?? new Map(),
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a CoreExecutionContext
 */
export function isCoreExecutionContext(value: unknown): value is CoreExecutionContext {
  if (!value || typeof value !== 'object') return false;
  const ctx = value as Record<string, unknown>;
  return (
    'me' in ctx &&
    'you' in ctx &&
    'it' in ctx &&
    'event' in ctx &&
    'locals' in ctx &&
    'globals' in ctx &&
    (ctx.locals instanceof Map || ctx.locals === undefined) &&
    (ctx.globals instanceof Map || ctx.globals === undefined)
  );
}

/**
 * Assert that context.me is an HTMLElement (for DOM operations that require it)
 */
export function assertHTMLElement(element: Element | null, name: string = 'element'): HTMLElement {
  if (!element) {
    throw new Error(`${name} is null`);
  }
  if (!(element instanceof HTMLElement)) {
    throw new Error(`${name} is not an HTMLElement`);
  }
  return element;
}

/**
 * Safely cast Element to HTMLElement if possible, otherwise return null
 */
export function asHTMLElement(element: Element | null): HTMLElement | null {
  if (element instanceof HTMLElement) {
    return element;
  }
  return null;
}
