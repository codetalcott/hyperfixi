/**
 * Type-safe Plugin Definitions
 * Enhanced types with better inference and safety
 */

import type { 
  Plugin,
  CommandPlugin,
  FeaturePlugin,
  RuntimeContext,
  ElementContext,
  InitContext
} from './types';

/**
 * Strongly typed command arguments
 */
export interface CommandArgs {
  on: [event: string, ...handlers: string[]];
  toggle: [what: 'class' | 'attribute' | 'visible', ...params: string[]];
  send: [eventName: string, detail?: any];
  add: [what: string, to?: string];
  remove: [what: string, from?: string];
  set: [what: string, to: string];
  call: [method: string, ...args: any[]];
}

/**
 * Strongly typed modifiers
 */
export interface CommandModifiers {
  on: 'once' | 'capture' | 'passive' | 'prevent' | 'stop' | 'window' | 'document' | 'outside';
  toggle: 'all';
  send: 'bubbles' | 'cancelable';
  add: 'all' | 'start' | 'end';
  remove: 'all';
  set: never;
  call: 'async';
}

/**
 * Type-safe Command Plugin
 * Uses intersection types instead of extends to avoid exactOptionalPropertyTypes conflicts
 */
export type TypedCommandPlugin<K extends keyof CommandArgs> = Omit<CommandPlugin, 'name' | 'execute'> & {
  name: K;
  execute: (ctx: TypedRuntimeContext<K>) => Promise<void> | void;
};

/**
 * Type-safe Runtime Context
 * Uses intersection types instead of extends to avoid exactOptionalPropertyTypes conflicts
 */
export type TypedRuntimeContext<K extends keyof CommandArgs> = Omit<RuntimeContext, 'args' | 'modifiers'> & {
  args: CommandArgs[K];
  modifiers: Map<CommandModifiers[K], Set<string>>;
};

/**
 * Feature plugin with strong typing
 * Uses intersection types instead of extends to avoid exactOptionalPropertyTypes conflicts
 */
export type TypedFeaturePlugin<TConfig = any> = Omit<FeaturePlugin, 'onElementInit'> & {
  defaultConfig?: TConfig;
  parseConfig?: (element: Element) => TConfig;
  onElementInit?: (ctx: TypedElementContext<TConfig>) => void | (() => void);
};

export type TypedElementContext<TConfig> = ElementContext & {
  config: TConfig;
};

/**
 * Plugin builder functions for better DX
 */
export function defineCommand<K extends keyof CommandArgs>(
  name: K,
  options: {
    pattern?: RegExp | string;
    execute: (ctx: TypedRuntimeContext<K>) => Promise<void> | void;
  }
): TypedCommandPlugin<K> {
  return {
    type: 'command',
    name,
    pattern: options.pattern || new RegExp(`^${name}\\s+`),
    execute: options.execute as any
  };
}

export function defineFeature<TConfig = any>(
  name: string,
  options: {
    defaultConfig?: TConfig;
    parseConfig?: (element: Element) => TConfig;
    onGlobalInit?: (ctx: InitContext) => void;
    onElementInit?: (ctx: TypedElementContext<TConfig>) => void | (() => void);
  }
): TypedFeaturePlugin<TConfig> {
  return {
    type: 'feature',
    name,
    ...options
  };
}

/**
 * Type guard functions
 */
export function isCommandPlugin(plugin: Plugin): plugin is CommandPlugin {
  return plugin.type === 'command';
}

export function isFeaturePlugin(plugin: Plugin): plugin is FeaturePlugin {
  return plugin.type === 'feature';
}

export function isTypedCommandPlugin<K extends keyof CommandArgs>(
  plugin: Plugin,
  name: K
): plugin is CommandPlugin & { name: K } {
  return plugin.type === 'command' && plugin.name === name;
}

/**
 * Performance optimization types
 */
export type OptimizedPlugin = Plugin & {
  compiledPattern?: RegExp;
  priority?: number;
  cacheable?: boolean;
};

export interface PluginMetrics {
  executionTime: number[];
  callCount: number;
  errorCount: number;
  lastError?: Error;
}
