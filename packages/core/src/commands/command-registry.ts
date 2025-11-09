/**
 * Enhanced Command Registry
 * Central registry for all CommandImplementation commands
 * Provides factory functions and type-safe command registration
 */

// Data Commands
import { createIncrementCommand, IncrementCommand } from './data/increment';
import { createDecrementCommand, DecrementCommand } from './data/decrement';
import { createSetCommand, SetCommand } from './data/set';
import { createDefaultCommand, DefaultCommand } from './data/default';

// Creation Commands
import { createMakeCommand, MakeCommand } from './creation/make';

// Content Commands
import { createAppendCommand, AppendCommand } from './content/append';

// Execution Commands
import {
  createCallCommand,
  createEnhancedGetCommand,
  CallCommand,
  EnhancedGetCommand,
} from './execution/call';
import { createPseudoCommand, PseudoCommand } from './execution/pseudo-command';

// Control Flow Commands
import { createIfCommand, IfCommand } from './control-flow/if';
import { createHaltCommand, HaltCommand } from './control-flow/halt';
import { createExitCommand, ExitCommand } from './control-flow/exit';
import { createReturnCommand, ReturnCommand } from './control-flow/return';
import { createThrowCommand, ThrowCommand } from './control-flow/throw';
import { createRepeatCommand, RepeatCommand } from './control-flow/repeat';
import { createUnlessCommand, UnlessCommand } from './control-flow/unless';
import { createContinueCommand, ContinueCommand } from './control-flow/continue';
import { createBreakCommand, BreakCommand } from './control-flow/break';

// Utility Commands
import { createPickCommand, PickCommand } from './utility/pick';
import { createLogCommand, LogCommand } from './utility/log';

// Advanced Commands
import { createTellCommand, TellCommand } from './advanced/tell';
import { createJSCommand, JSCommand } from './advanced/js';
import { createBeepCommand, BeepCommand } from './advanced/beep';
import { createAsyncCommand, AsyncCommand } from './advanced/async';

// Animation Commands
import { createSettleCommand, SettleCommand } from './animation/settle';
import { createMeasureCommand, MeasureCommand } from './animation/measure';
import { createTransitionCommand, TransitionCommand } from './animation/transition';

// Template Commands
import { createRenderCommand, RenderCommand } from './templates/render';

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

// Behavior Commands
import { installCommand, InstallCommand } from './behaviors/install';

// Async Commands
import { createWaitCommand, WaitCommand } from './async/wait';
// NOTE: Fetch command still needs implementation
// import { createFetchCommand } from '../legacy/commands/async/fetch';

// Re-export everything
export {
  // Data Commands
  createIncrementCommand,
  IncrementCommand,
  createDecrementCommand,
  DecrementCommand,
  createSetCommand,
  SetCommand,
  createDefaultCommand,
  DefaultCommand,

  // Creation Commands
  createMakeCommand,
  MakeCommand,

  // Content Commands
  createAppendCommand,
  AppendCommand,

  // Execution Commands
  createCallCommand,
  createEnhancedGetCommand,
  CallCommand,
  EnhancedGetCommand,
  createPseudoCommand,
  PseudoCommand,

  // Control Flow Commands
  createIfCommand,
  IfCommand,
  createHaltCommand,
  HaltCommand,
  createExitCommand,
  ExitCommand,
  createReturnCommand,
  ReturnCommand,
  createThrowCommand,
  ThrowCommand,
  createRepeatCommand,
  RepeatCommand,
  createUnlessCommand,
  UnlessCommand,
  createContinueCommand,
  ContinueCommand,
  createBreakCommand,
  BreakCommand,

  // Utility Commands
  createPickCommand,
  PickCommand,
  createLogCommand,
  LogCommand,

  // Advanced Commands
  createTellCommand,
  TellCommand,
  createJSCommand,
  JSCommand,
  createBeepCommand,
  BeepCommand,
  createAsyncCommand,
  AsyncCommand,

  // Animation Commands
  createSettleCommand,
  SettleCommand,
  createMeasureCommand,
  MeasureCommand,
  createTransitionCommand,
  TransitionCommand,

  // Template Commands
  createRenderCommand,
  RenderCommand,

  // DOM Commands
  createAddCommand,
  AddCommand,
  createRemoveCommand,
  RemoveCommand,
  createToggleCommand,
  ToggleCommand,
  createShowCommand,
  ShowCommand,
  createHideCommand,
  HideCommand,
  createPutCommand,
  PutCommand,

  // Event Commands
  createSendCommand,
  SendCommand,
  createTriggerCommand,
  TriggerCommand,

  // Navigation Commands
  createGoCommand,
  GoCommand,

  // Behavior Commands
  InstallCommand,

  // Async Commands
  createWaitCommand,
  WaitCommand,
  // createFetchCommand,
};

import type { CommandImplementation } from '../types/core';
import type { TypedExecutionContext } from '../types/command-types';

/**
 * Enhanced Command Factory Registry
 * Maps command names to their factory functions
 */
export const ENHANCED_COMMAND_FACTORIES = {
  // Data Commands
  increment: createIncrementCommand,
  decrement: createDecrementCommand,
  set: createSetCommand,
  default: createDefaultCommand,

  // Creation Commands
  make: createMakeCommand,

  // Content Commands
  append: createAppendCommand,

  // Execution Commands
  call: createCallCommand,
  get: createEnhancedGetCommand,
  'pseudo-command': createPseudoCommand,

  // Control Flow Commands
  if: createIfCommand,
  halt: createHaltCommand,
  exit: createExitCommand,
  return: createReturnCommand,
  throw: createThrowCommand,
  repeat: createRepeatCommand,
  unless: createUnlessCommand,
  continue: createContinueCommand,
  break: createBreakCommand,

  // Utility Commands
  pick: createPickCommand,
  log: createLogCommand,

  // Advanced Commands
  tell: createTellCommand,
  js: createJSCommand,
  beep: createBeepCommand,
  async: createAsyncCommand,

  // Animation Commands
  settle: createSettleCommand,
  measure: createMeasureCommand,
  transition: createTransitionCommand,

  // Template Commands
  render: createRenderCommand,

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

  // Behavior Commands
  install: () => installCommand,

  // Async Commands
  wait: createWaitCommand,
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
export function createEnhancedCommand(
  name: string
): CommandImplementation<unknown, unknown, TypedExecutionContext> | null {
  const factory = ENHANCED_COMMAND_FACTORIES[name as keyof typeof ENHANCED_COMMAND_FACTORIES];
  return factory
    ? (factory() as CommandImplementation<unknown, unknown, TypedExecutionContext>)
    : null;
}

/**
 * Create all enhanced commands and return as a Map
 */
export function createAllEnhancedCommands(): Map<
  string,
  CommandImplementation<unknown, unknown, TypedExecutionContext>
> {
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
  execution: ['call', 'get', 'pseudo-command'],
  flow: ['if', 'halt', 'exit', 'return', 'throw', 'repeat', 'unless', 'continue', 'break'],
  utility: ['pick'],
  advanced: ['tell', 'js', 'beep', 'async'],
  animation: ['settle', 'measure', 'transition'],
  templates: ['render'],
  dom: ['add', 'remove', 'toggle', 'show', 'hide', 'put'],
  behaviors: ['install'],
} as const;

/**
 * Get commands by category
 */
export function getCommandsByCategory(
  category: keyof typeof ENHANCED_COMMAND_CATEGORIES
): string[] {
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
