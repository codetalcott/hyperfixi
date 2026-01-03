/**
 * Template Capabilities
 *
 * Documents which commands and blocks are available in generated lite bundles
 * versus those that require the full runtime.
 */

/**
 * Commands available in generated lite bundles.
 * These have simplified implementations that cover common use cases.
 */
export const AVAILABLE_COMMANDS = [
  // DOM manipulation
  'toggle',
  'add',
  'remove',
  'removeClass',
  'show',
  'hide',
  'put',
  'append',
  'take',
  // Data/variables
  'set',
  'get',
  'increment',
  'decrement',
  // Async/timing
  'wait',
  'transition',
  // Events
  'send',
  'trigger',
  // Utility
  'log',
  'call',
  // Navigation
  'go',
  // Focus
  'focus',
  'blur',
  // Control flow
  'return',
  'break',
  'continue',
] as const;

/**
 * Blocks available in generated lite bundles.
 */
export const AVAILABLE_BLOCKS = ['if', 'repeat', 'for', 'while', 'fetch'] as const;

/**
 * Commands NOT available in lite bundles (require full runtime).
 * These either have complex implementations or depend on features
 * not included in lite bundles.
 */
export const FULL_RUNTIME_ONLY_COMMANDS = [
  // Advanced execution
  'async',
  'js',
  // DOM operations (complex)
  'make',
  'swap',
  'morph',
  'process-partials',
  // Data binding
  'bind',
  'persist',
  'default',
  // Utility (complex)
  'beep',
  'tell',
  'copy',
  'pick',
  // Navigation (complex)
  'push-url',
  'replace-url',
  // Control flow (advanced)
  'halt',
  'exit',
  'throw',
  'unless',
  // Animation (advanced)
  'settle',
  'measure',
  // Behaviors
  'install',
] as const;

/** Type for available command names */
export type AvailableCommand = (typeof AVAILABLE_COMMANDS)[number];

/** Type for available block names */
export type AvailableBlock = (typeof AVAILABLE_BLOCKS)[number];

/** Type for full runtime only command names */
export type FullRuntimeOnlyCommand = (typeof FULL_RUNTIME_ONLY_COMMANDS)[number];

/**
 * Check if a command is available in lite bundles
 */
export function isAvailableCommand(command: string): command is AvailableCommand {
  return (AVAILABLE_COMMANDS as readonly string[]).includes(command);
}

/**
 * Check if a block is available in lite bundles
 */
export function isAvailableBlock(block: string): block is AvailableBlock {
  return (AVAILABLE_BLOCKS as readonly string[]).includes(block);
}

/**
 * Check if a command requires the full runtime
 */
export function requiresFullRuntime(command: string): boolean {
  return (FULL_RUNTIME_ONLY_COMMANDS as readonly string[]).includes(command);
}
