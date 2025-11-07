/**
 * HyperFixi Core - Universal Modern Hyperscript
 * Works in Node.js, Deno, and browsers
 */

// Ambient type declaration for Deno global (when available)
declare const Deno: unknown;

// ============================================================================
// Core Types and Interfaces
// ============================================================================

export type {
  // Unified types from base-types.ts
  BaseTypedExpression,
  TypedExecutionContext,
  TypedResult,
  ValidationResult,
  ExecutionContext,
  LLMDocumentation,
  EvaluationType,
  HyperScriptValueType,
  BaseTypedFeature,
  FeatureMetadata,
  CommandResult,
  BaseCommand,
} from './types/base-types';

export type {
  // Legacy compatibility types
  CommandImplementation,
  ExpressionImplementation,
} from './types/core';

// ============================================================================
// Commands - DOM Manipulation
// ============================================================================

import { HideCommand } from './commands/dom/hide';
import { ShowCommand } from './commands/dom/show';
import { ToggleCommand } from './commands/dom/toggle';

export { HideCommand, createHideCommand } from './commands/dom/hide';
export { ShowCommand } from './commands/dom/show';
export { ToggleCommand } from './commands/dom/toggle';
export { AddCommand } from './commands/dom/add';
export { RemoveCommand } from './commands/dom/remove';

// ============================================================================
// Commands - Events
// ============================================================================

// OnCommand to be implemented
export { TriggerCommand } from './commands/events/trigger';
export { SendCommand } from './commands/events/send';

// ============================================================================
// Commands - Navigation
// ============================================================================

export { GoCommand } from './commands/navigation/go';

// ============================================================================
// Commands - Async Operations
// ============================================================================

// FetchCommand and WaitCommand to be implemented

// ============================================================================
// Commands - Control Flow
// ============================================================================

export { IfCommand } from './commands/control-flow/index';
export { RepeatCommand } from './commands/control-flow/index';

// ============================================================================
// Expressions - All Categories
// ============================================================================

export {
  // Reference expressions (me, you, it, CSS selectors)
  referencesExpressions,
} from './expressions/references/index';

export {
  // Logical expressions (and, or, not, comparisons)
  logicalExpressions,
} from './expressions/logical/index';

export {
  // Type conversion expressions (as keyword)
  conversionExpressions,
} from './expressions/conversion/index';

export {
  // Positional expressions (first, last, etc.)
  positionalExpressions,
} from './expressions/positional/index';

export {
  // Property expressions (possessive syntax)
  propertiesExpressions,
} from './expressions/properties/index';

export {
  // Special expressions (literals, math)
  specialExpressions,
} from './expressions/special/index';

// ============================================================================
// Features - Top-level hyperscript features
// ============================================================================

export { createBehaviorsFeature } from './features/behaviors';
// export { EnhancedInitFeature as InitFeature } from './features/init';
// export { EnhancedDefFeature as DefFeature } from './features/def';
export { createWebWorkerFeature } from './features/webworker';
// Note: Install, Everywhere, Class, JS, Set features need enhanced implementations
// Temporarily commenting out until enhanced versions are created
// export { InstallFeature } from './features/install';
// export { EverywhereFeature } from './features/everywhere';
// export { ClassFeature, type ClassFeatureOptions } from './features/class';
// export { JSFeature } from './features/js';
// export { SetFeature } from './features/set';

// ============================================================================
// Extensions
// ============================================================================

export {
  TailwindExtension,
  type TailwindStrategy,
} from './extensions/tailwind';

// ============================================================================
// Core Runtime and Utilities
// ============================================================================

export { createContext } from './core/context';
export { Parser } from './parser/parser';
export { Tokenizer } from './parser/tokenizer';

// ============================================================================
// Runtime Environment Detection
// ============================================================================

export {
  isDeno,
  isNode,
  isBrowser,
  getRuntimeInfo,
  getLLMRuntimeInfo,
  logger,
  performance,
  UniversalEventTarget,
} from './runtime/environment';

/**
 * Get environment-specific information for LLM agents
 * @deprecated Use getLLMRuntimeInfo() instead
 */
export function getEnvironmentInfo() {
  const isDeno = typeof Deno !== 'undefined';
  const isNode = typeof process !== 'undefined' && process.versions?.node;
  const isBrowser = typeof window !== 'undefined';
  
  return {
    runtime: isDeno ? 'deno' : isNode ? 'node' : isBrowser ? 'browser' : 'unknown',
    hasDOM: typeof document !== 'undefined',
    hasWebAPIs: typeof fetch !== 'undefined',
    typescript: true, // HyperFixi is always TypeScript
    version: '1.0.0',
  };
}

// ============================================================================
// Factory Functions for Tree-shaking
// ============================================================================

/**
 * Create a minimal runtime with core functionality
 * @llm-bundle-size 5KB
 * @llm-description Basic expression evaluation and DOM commands
 */
export function createMinimalRuntime() {
  return {
    commands: new Map(),
    expressions: new Map(),
    features: new Map(),
    extensions: new Map(),
    
    addCommand(command: any) {
      this.commands.set(command.name, command);
      return this;
    },
    
    addExpression(expression: any) {
      this.expressions.set(expression.name, expression);
      return this;
    },
    
    environment: getEnvironmentInfo(),
  };
}

/**
 * Create a full-featured runtime
 * @llm-bundle-size 25KB
 * @llm-description Complete hyperscript implementation
 */
export function createFullRuntime() {
  const runtime = createMinimalRuntime();
  
  // Add all commands
  runtime.addCommand(new HideCommand());
  runtime.addCommand(new ShowCommand());
  runtime.addCommand(new ToggleCommand());
  // ... etc
  
  return runtime;
}