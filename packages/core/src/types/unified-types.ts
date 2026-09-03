/**
 * Unified Type System - Single Source of Truth
 *
 * This file consolidates all core type definitions to resolve architectural
 * conflicts and establish consistent types across the HyperFixi codebase.
 *
 * Type Hierarchy:
 *   CoreExecutionContext (core-context.ts) - Minimal for tree-shaking
 *        ↓
 *   ExecutionContext (this file) - Full runtime with evaluationHistory
 *        ↓
 *   TypedExecutionContext - Type registry + validation cache
 */

import type { CoreExecutionContext } from './core-context';
import type { ExecutionContext, ValidationError, ValidationResult } from './base-types';

// Re-export core context types
export type { CoreExecutionContext } from './core-context';
export {
  createCoreContext,
  isCoreExecutionContext,
  assertHTMLElement,
  asHTMLElement,
} from './core-context';

// ============================================================================
// Core Validation Types - Re-exported from base-types (single source of truth)
// ============================================================================

export type { ValidationError, ValidationResult } from './base-types';

// ============================================================================
// Core Value Types
// ============================================================================

/**
 * Unified HyperScript value type - consolidates all value type definitions
 */
export type HyperScriptValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'element'
  | 'element-list'
  | 'array'
  | 'object'
  | 'promise'
  | 'fragment'
  | 'null'
  | 'undefined'
  | 'function'
  | 'event'
  | 'error'
  | 'unknown';

/**
 * Unified evaluation type - consolidates EvaluationType definitions
 */
export type EvaluationType = HyperScriptValueType | 'Any' | 'Context' | 'Command' | 'Expression';

/**
 * Unified HyperScript value - actual value container
 */
export type HyperScriptValue =
  | string
  | number
  | boolean
  | HTMLElement
  | HTMLElement[]
  | unknown[]
  | Record<string, unknown>
  | Promise<unknown>
  | DocumentFragment
  | null
  | undefined
  | Function
  | Event;

// ============================================================================
// Core Context Types - Re-exported from base-types for single source of truth
// ============================================================================

// Re-export ExecutionContext and TypedExecutionContext from base-types
// This ensures there's only ONE definition used throughout the codebase
export type { ExecutionContext, TypedExecutionContext } from './base-types';

// ============================================================================
// Core Result Types
// ============================================================================

/**
 * Unified result type for operations that can succeed or fail
 */
export interface Result<T = unknown> {
  readonly success: boolean;
  readonly value?: T;
  readonly error?: {
    readonly name: string;
    readonly message: string;
    readonly code?: string;
    readonly suggestions?: string[];
  };
  readonly type?: string;
}

/**
 * Unified typed result with validation information
 */
export interface TypedResult<T = unknown> extends Result<T> {
  readonly errors?: ValidationError[];
  readonly suggestions?: readonly string[] | string[];
}

// ============================================================================
// Core Command Types
// ============================================================================

/**
 * Unified command category - consolidates all command categories
 */
export type CommandCategory =
  | 'dom-manipulation'
  | 'event-handling'
  | 'data-processing'
  | 'control-flow'
  | 'animation'
  | 'network'
  | 'utility'
  | 'navigation'
  | 'templates'
  | 'advanced';

/**
 * Unified side effect types
 */
export type SideEffect =
  | 'dom-mutation'
  | 'network-request'
  | 'local-storage'
  | 'global-state'
  | 'event-emission'
  | 'timer-creation'
  | 'navigation'
  | 'dom-query'
  | 'history'
  | 'async'
  | 'attribute-transfer';

// ============================================================================
// Core Expression Types
// ============================================================================

/**
 * Unified expression category
 */
export type ExpressionCategory =
  | 'Reference'
  | 'Property'
  | 'Logical'
  | 'Mathematical'
  | 'Conversion'
  | 'Positional'
  | 'Special'
  | 'Template';

/**
 * Unified expression metadata
 * Only category and complexity are required; rest is optional documentation
 */
export interface ExpressionMetadata {
  readonly category: ExpressionCategory;
  readonly complexity: 'simple' | 'medium' | 'complex';
  // Optional documentation fields
  readonly sideEffects?: SideEffect[];
  readonly dependencies?: string[];
  readonly returnTypes?: EvaluationType[];
  readonly examples?: Array<{
    readonly input: string;
    readonly description: string;
    readonly expectedOutput: unknown;
    readonly context?: Partial<ExecutionContext>;
  }>;
  readonly relatedExpressions?: string[];
  readonly performance?: {
    readonly averageTime: number;
    readonly complexity: string;
  };
}

// ============================================================================
// Core AST Types
// ============================================================================

/**
 * Unified AST node interface
 */
export interface ASTNode {
  readonly type: string;
  readonly line?: number;
  readonly column?: number;
  readonly start?: number;
  readonly end?: number;
  readonly raw?: string;
  readonly [key: string]: unknown;
}

/**
 * Unified parse error interface
 */
export interface ParseError {
  readonly name?: string;
  readonly message: string;
  readonly line: number;
  readonly column: number;
  readonly position?: number;
  readonly source?: string;
}

// ============================================================================
// Core Documentation Types
// ============================================================================

/**
 * Unified LLM documentation interface
 */
export interface LLMDocumentation {
  readonly summary: string;
  readonly parameters: Array<{
    readonly name: string;
    readonly type: string;
    readonly description: string;
    readonly optional: boolean;
    readonly examples: string[];
  }>;
  readonly returns: {
    readonly type: string;
    readonly description: string;
    readonly examples: string[];
  };
  readonly examples: Array<{
    readonly title: string;
    readonly code: string;
    readonly explanation: string;
    readonly output: unknown;
  }>;
  readonly seeAlso: string[];
  readonly tags: string[];
}

// ============================================================================
// Validation Utilities
// ============================================================================

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for ValidationResult
 */
export function isValidationResult<T>(value: unknown): value is ValidationResult<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isValid' in value &&
    typeof (value as any).isValid === 'boolean' &&
    'errors' in value &&
    Array.isArray((value as any).errors) &&
    'suggestions' in value &&
    Array.isArray((value as any).suggestions)
  );
}

/**
 * Type guard for ExecutionContext
 */
export function isExecutionContext(value: unknown): value is ExecutionContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    'locals' in value &&
    (value as any).locals instanceof Map &&
    'globals' in value &&
    (value as any).globals instanceof Map &&
    'variables' in value &&
    (value as any).variables instanceof Map
  );
}

// ============================================================================
// Exports
// ============================================================================

export const CoreTypes = {
  isValidationResult,
  isExecutionContext,
};
