/**
 * Enhanced Command Registry
 * Central registry for all CommandImplementation commands
 * Provides factory functions and type-safe command registration
 */

// Data Commands
import { createEnhancedIncrementCommand, EnhancedIncrementCommand } from './data/enhanced-increment';
import { createEnhancedDecrementCommand, EnhancedDecrementCommand } from './data/enhanced-decrement';
import { createEnhancedSetCommand, EnhancedSetCommand } from './data/enhanced-set';
import { createEnhancedDefaultCommand, EnhancedDefaultCommand } from './data/enhanced-default';

// Creation Commands
import { createEnhancedMakeCommand, EnhancedMakeCommand } from './creation/enhanced-make';

// Content Commands
import { createEnhancedAppendCommand, EnhancedAppendCommand } from './content/enhanced-append';

// Execution Commands
import { createEnhancedCallCommand, createEnhancedGetCommand, EnhancedCallCommand, EnhancedGetCommand } from './execution/enhanced-call';

// Control Flow Commands
import { createEnhancedIfCommand, EnhancedIfCommand } from './control-flow/enhanced-if';
import { createEnhancedHaltCommand, EnhancedHaltCommand } from './control-flow/enhanced-halt';
import { createEnhancedReturnCommand, EnhancedReturnCommand } from './control-flow/enhanced-return';
import { createEnhancedThrowCommand, EnhancedThrowCommand } from './control-flow/enhanced-throw';
import { createEnhancedRepeatCommand, EnhancedRepeatCommand } from './control-flow/enhanced-repeat';
import { createEnhancedUnlessCommand, EnhancedUnlessCommand } from './control-flow/enhanced-unless';
import { createEnhancedContinueCommand, EnhancedContinueCommand } from './control-flow/enhanced-continue';
import { createEnhancedBreakCommand, EnhancedBreakCommand } from './control-flow/enhanced-break';

// Utility Commands
import { createEnhancedPickCommand, EnhancedPickCommand } from './utility/enhanced-pick';
import { createEnhancedLogCommand, EnhancedLogCommand } from './utility/enhanced-log';

// Advanced Commands
import { createEnhancedTellCommand, EnhancedTellCommand } from './advanced/enhanced-tell';
import { createEnhancedJSCommand, EnhancedJSCommand } from './advanced/enhanced-js';
import { createEnhancedBeepCommand, EnhancedBeepCommand } from './advanced/enhanced-beep';
import { createEnhancedAsyncCommand, EnhancedAsyncCommand } from './advanced/enhanced-async';

// Animation Commands
import { createEnhancedSettleCommand, EnhancedSettleCommand } from './animation/enhanced-settle';
import { createEnhancedMeasureCommand, EnhancedMeasureCommand } from './animation/enhanced-measure';
import { createEnhancedTransitionCommand, EnhancedTransitionCommand } from './animation/enhanced-transition';

// Template Commands
import { createEnhancedRenderCommand, EnhancedRenderCommand } from './templates/enhanced-render';

// DOM Commands
import { createAddCommand, AddCommand } from './dom/add';
import { createRemoveCommand, RemoveCommand } from './dom/remove';
import { createToggleCommand, ToggleCommand } from './dom/toggle';
import { createShowCommand, ShowCommand } from './dom/show';
import { createHideCommand, HideCommand } from './dom/hide';
import { createPutCommand, PutCommand } from './dom/put';

// Event Commands
import { createSendCommand, SendCommand } from './events/send';
import { createTriggerCommand, TriggerCommand } from './events/trigger';

// Navigation Commands
import { createGoCommand, GoCommand } from './navigation/go';

// Async Commands - using legacy for now
// NOTE: Legacy commands excluded from TypeScript project (tsconfig.json)
// TODO: Implement enhanced versions of wait and fetch commands
// import { createWaitCommand } from '../legacy/commands/async/wait';
// import { createFetchCommand } from '../legacy/commands/async/fetch';

// Re-export everything
export {
  // Data Commands
  createEnhancedIncrementCommand, EnhancedIncrementCommand,
  createEnhancedDecrementCommand, EnhancedDecrementCommand,
  createEnhancedSetCommand, EnhancedSetCommand,
  createEnhancedDefaultCommand, EnhancedDefaultCommand,
  
  // Creation Commands
  createEnhancedMakeCommand, EnhancedMakeCommand,
  
  // Content Commands
  createEnhancedAppendCommand, EnhancedAppendCommand,
  
  // Execution Commands
  createEnhancedCallCommand, createEnhancedGetCommand, EnhancedCallCommand, EnhancedGetCommand,
  
  // Control Flow Commands
  createEnhancedIfCommand, EnhancedIfCommand,
  createEnhancedHaltCommand, EnhancedHaltCommand,
  createEnhancedReturnCommand, EnhancedReturnCommand,
  createEnhancedThrowCommand, EnhancedThrowCommand,
  createEnhancedRepeatCommand, EnhancedRepeatCommand,
  createEnhancedUnlessCommand, EnhancedUnlessCommand,
  createEnhancedContinueCommand, EnhancedContinueCommand,
  createEnhancedBreakCommand, EnhancedBreakCommand,
  
  // Utility Commands
  createEnhancedPickCommand, EnhancedPickCommand,
  createEnhancedLogCommand, EnhancedLogCommand,
  
  // Advanced Commands
  createEnhancedTellCommand, EnhancedTellCommand,
  createEnhancedJSCommand, EnhancedJSCommand,
  createEnhancedBeepCommand, EnhancedBeepCommand,
  createEnhancedAsyncCommand, EnhancedAsyncCommand,
  
  // Animation Commands
  createEnhancedSettleCommand, EnhancedSettleCommand,
  createEnhancedMeasureCommand, EnhancedMeasureCommand,
  createEnhancedTransitionCommand, EnhancedTransitionCommand,
  
  // Template Commands
  createEnhancedRenderCommand, EnhancedRenderCommand,
  
  // DOM Commands
  createAddCommand, AddCommand,
  createRemoveCommand, RemoveCommand,
  createToggleCommand, ToggleCommand,
  createShowCommand, ShowCommand,
  createHideCommand, HideCommand,
  createPutCommand, PutCommand,
  
  // Event Commands
  createSendCommand, SendCommand,
  createTriggerCommand, TriggerCommand,

  // Navigation Commands
  createGoCommand, GoCommand,

  // Async Commands
  // createWaitCommand,
  // createFetchCommand,
};

import type { CommandImplementation } from '../types/core';
import type { TypedExecutionContext } from '../types/enhanced-core';

/**
 * Enhanced Command Factory Registry
 * Maps command names to their factory functions
 */
export const ENHANCED_COMMAND_FACTORIES = {
  // Data Commands
  increment: createEnhancedIncrementCommand,
  decrement: createEnhancedDecrementCommand,
  set: createEnhancedSetCommand,
  default: createEnhancedDefaultCommand,

  // Creation Commands
  make: createEnhancedMakeCommand,

  // Content Commands
  append: createEnhancedAppendCommand,

  // Execution Commands
  call: createEnhancedCallCommand,
  get: createEnhancedGetCommand,

  // Control Flow Commands
  if: createEnhancedIfCommand,
  halt: createEnhancedHaltCommand,
  return: createEnhancedReturnCommand,
  throw: createEnhancedThrowCommand,
  repeat: createEnhancedRepeatCommand,
  unless: createEnhancedUnlessCommand,
  continue: createEnhancedContinueCommand,
  break: createEnhancedBreakCommand,

  // Utility Commands
  pick: createEnhancedPickCommand,
  log: createEnhancedLogCommand,

  // Advanced Commands
  tell: createEnhancedTellCommand,
  js: createEnhancedJSCommand,
  beep: createEnhancedBeepCommand,
  async: createEnhancedAsyncCommand,

  // Animation Commands
  settle: createEnhancedSettleCommand,
  measure: createEnhancedMeasureCommand,
  transition: createEnhancedTransitionCommand,

  // Template Commands
  render: createEnhancedRenderCommand,
  
  // DOM Commands
  add: createAddCommand,
  remove: createRemoveCommand,
  toggle: createToggleCommand,
  show: createShowCommand,
  hide: createHideCommand,
  put: createPutCommand,
  
  // Event Commands
  send: createSendCommand,
  trigger: createTriggerCommand,

  // Navigation Commands
  go: createGoCommand,

  // Async Commands
  // wait: createWaitCommand,
  // fetch: createFetchCommand,
} as const;

/**
 * Get all enhanced command names
 */
export function getEnhancedCommandNames(): string[] {
  return Object.keys(ENHANCED_COMMAND_FACTORIES);
}

/**
 * Create an enhanced command by name
 */
export function createEnhancedCommand(name: string): CommandImplementation<unknown, unknown, TypedExecutionContext> | null {
  const factory = ENHANCED_COMMAND_FACTORIES[name as keyof typeof ENHANCED_COMMAND_FACTORIES];
  return factory ? factory() as CommandImplementation<unknown, unknown, TypedExecutionContext> : null;
}

/**
 * Create all enhanced commands and return as a Map
 */
export function createAllEnhancedCommands(): Map<string, CommandImplementation<unknown, unknown, TypedExecutionContext>> {
  const commands = new Map();
  
  for (const [name, factory] of Object.entries(ENHANCED_COMMAND_FACTORIES)) {
    commands.set(name, factory());
  }
  
  return commands;
}

/**
 * Command categories for organization
 */
export const ENHANCED_COMMAND_CATEGORIES = {
  data: ['increment', 'decrement', 'set', 'default'],
  creation: ['make'],
  content: ['append'],
  execution: ['call', 'get'],
  flow: ['if', 'halt', 'return', 'throw', 'repeat', 'unless', 'continue', 'break'],
  utility: ['pick'],
  advanced: ['tell', 'js', 'beep', 'async'],
  animation: ['settle', 'measure', 'transition'],
  templates: ['render'],
  dom: ['add', 'remove', 'toggle', 'show', 'hide', 'put'],
} as const;

/**
 * Get commands by category
 */
export function getCommandsByCategory(category: keyof typeof ENHANCED_COMMAND_CATEGORIES): string[] {
  return [...(ENHANCED_COMMAND_CATEGORIES[category] || [])];
}

/**
 * Enhanced command metadata for documentation
 */
export interface CommandMetadata {
  name: string;
  description: string;
  examples: string[];
  syntax: string;
  category: string;
  version: string;
}

/**
 * Get metadata for all enhanced commands
 */
export function getAllCommandMetadata(): CommandMetadata[] {
  const metadata: CommandMetadata[] = [];
  
  for (const [_name, factory] of Object.entries(ENHANCED_COMMAND_FACTORIES)) {
    const command = factory();
    metadata.push(command.metadata);
  }
  
  return metadata;
}

/**
 * Get metadata for a specific command
 */
export function getCommandMetadata(name: string): CommandMetadata | null {
  const command = createEnhancedCommand(name);
  return command ? command.metadata : null;
}