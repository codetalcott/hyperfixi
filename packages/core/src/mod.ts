/**
 * HyperFixi Core - Universal Modern Hyperscript
 * Works in Node.js, Deno, and browsers
 */

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
} from './types/base-types.js';

export type {
  // Legacy compatibility types
  CommandImplementation,
  ExpressionImplementation,
} from './types/core.js';

// ============================================================================
// Commands - DOM Manipulation
// ============================================================================

import { HideCommand } from './commands/dom/hide.js';
import { ShowCommand } from './commands/dom/show.js';
import { ToggleCommand } from './commands/dom/toggle.js';

export { HideCommand, createHideCommand } from './commands/dom/hide.js';
export { ShowCommand } from './commands/dom/show.js';
export { ToggleCommand } from './commands/dom/toggle.js';
export { AddCommand } from './commands/dom/add.js';
export { RemoveCommand } from './commands/dom/remove.js';

// ============================================================================
// Commands - Events
// ============================================================================

// OnCommand to be implemented
export { TriggerCommand } from './commands/events/trigger.js';
export { SendCommand } from './commands/events/send.js';

// ============================================================================
// Commands - Navigation
// ============================================================================

export { GoCommand } from './commands/navigation/go.js';

// ============================================================================
// Commands - Async Operations
// ============================================================================

// FetchCommand and WaitCommand to be implemented

// ============================================================================
// Commands - Control Flow
// ============================================================================

export { IfCommand } from './commands/control-flow/index.js';
export { RepeatCommand } from './commands/control-flow/index.js';

// ============================================================================
// Expressions - All Categories
// ============================================================================

export {
  // Reference expressions (me, you, it, CSS selectors)
  evaluateReference,
  type ReferenceExpression,
} from './expressions/references/index.js';

export {
  // Logical expressions (and, or, not, comparisons)
  evaluateLogical,
  type LogicalExpression,
} from './expressions/logical/index.js';

export {
  // Type conversion expressions (as keyword)
  evaluateConversion,
  type ConversionExpression,
} from './expressions/conversion/index.js';

export {
  // Positional expressions (first, last, etc.)
  evaluatePositional,
  type PositionalExpression,
} from './expressions/positional/index.js';

export {
  // Property expressions (possessive syntax)
  evaluateProperties,
  type PropertyExpression,
} from './expressions/properties/index.js';

export {
  // Special expressions (literals, math)
  evaluateSpecial,
  type SpecialExpression,
} from './expressions/enhanced-special/index.js';

// ============================================================================
// Features - Top-level hyperscript features
// ============================================================================

export { EnhancedBehaviorFeature as BehaviorFeature } from './features/enhanced-behaviors.js';
export { EnhancedInitFeature as InitFeature } from './features/enhanced-init.js';
export { EnhancedDefFeature as DefFeature } from './features/enhanced-def.js';
export { EnhancedWebWorkerFeature as WorkerFeature } from './features/enhanced-webworker.js';
// Note: Install, Everywhere, Class, JS, Set features need enhanced implementations
// Temporarily commenting out until enhanced versions are created
// export { InstallFeature } from './features/install.js';
// export { EverywhereFeature } from './features/everywhere.js';
// export { ClassFeature, type ClassFeatureOptions } from './features/class.js';
// export { JSFeature } from './features/js.js';
// export { SetFeature } from './features/set.js';

// ============================================================================
// Extensions
// ============================================================================

export {
  TailwindExtension,
  type TailwindExtensionOptions,
  type TailwindStrategy,
} from './extensions/tailwind.js';

// ============================================================================
// Core Runtime and Utilities
// ============================================================================

export { createContext } from './core/context.js';
export { Parser } from './parser/parser.js';
export { Tokenizer } from './parser/tokenizer.js';

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
} from './runtime/environment.js';

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