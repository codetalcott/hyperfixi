/**
 * HyperFixi Registry System
 *
 * Unified extensibility API for commands and event sources.
 *
 * Usage:
 *   import { registry } from '@hyperfixi/core';
 *
 *   // Register commands
 *   registry.commands.register('respond', respondCommand);
 *   registry.commands.register('redirect', redirectCommand);
 *
 *   // Register event sources
 *   registry.eventSources.register('request', requestEventSource);
 *   registry.eventSources.register('websocket', websocketEventSource);
 *
 * The context-provider registry that used to sit beside these (lazy getters
 * spliced onto every execution context through a Proxy) was deleted in Arc 6b:
 * no production caller ever registered a provider, and Arc 4c had already
 * taken the Proxy off the hot path.
 */

// Re-export core types needed by event sources
export type { ExecutionContext, TypedExecutionContext } from '../types/core';

// Re-export registries
export {
  EventSourceRegistry,
  createEventSourceRegistry,
  getDefaultEventSourceRegistry,
  type EventSource,
  type EventSourceHandler,
  type EventSourcePayload,
  type EventSourceSubscription,
  type EventSourceSubscribeOptions,
} from './event-source-registry';

// Re-export command registry from existing location
export {
  CommandRegistryV2,
  CommandAdapterV2,
  createCommandRegistryV2,
  type CommandWithParseInput,
  type RuntimeCommand,
} from '../runtime/command-adapter';

import { CommandRegistryV2 } from '../runtime/command-adapter';
import { debug } from '../utils/debug';
import { EventSourceRegistry, createEventSourceRegistry } from './event-source-registry';
import type { CommandWithParseInput } from '../runtime/command-adapter';
import type { EventSource } from './event-source-registry';

/**
 * Unified registry interface
 *
 * Provides a single point of access to all extension registries:
 * - commands: Register custom hyperscript commands
 * - eventSources: Register custom event sources (request, websocket, etc.)
 */
export interface LokaScriptRegistry {
  /** Command registry for registering custom commands */
  readonly commands: CommandRegistryV2;

  /** Event source registry for custom event sources */
  readonly eventSources: EventSourceRegistry;

  /**
   * Register a plugin that can add commands and event sources
   */
  use(plugin: LokaScriptPlugin): void;

  /**
   * Reset all registries to default state
   */
  reset(): void;
}

/**
 * Plugin interface for bundled extensions
 *
 * Plugins can register multiple commands and event sources in a single
 * installation.
 */
export interface LokaScriptPlugin {
  /** Plugin name */
  name: string;

  /** Plugin version */
  version?: string;

  /** Commands to register */
  commands?: CommandWithParseInput[];

  /** Event sources to register */
  eventSources?: EventSource[];

  /**
   * Optional setup function called when plugin is installed
   */
  setup?(registry: LokaScriptRegistry): void | Promise<void>;

  /**
   * Optional teardown function called when plugin is uninstalled
   */
  teardown?(registry: LokaScriptRegistry): void | Promise<void>;
}

/**
 * Create a unified registry
 */
export function createRegistry(options?: {
  commands?: CommandRegistryV2;
  eventSources?: EventSourceRegistry;
}): LokaScriptRegistry {
  const commands = options?.commands ?? new CommandRegistryV2();
  const eventSources = options?.eventSources ?? createEventSourceRegistry();

  const installedPlugins = new Set<string>();

  const registry: LokaScriptRegistry = {
    commands,
    eventSources,

    use(plugin: LokaScriptPlugin): void {
      if (installedPlugins.has(plugin.name)) {
        debug.runtime(`[LokaScriptRegistry] Plugin '${plugin.name}' is already installed`);
        return;
      }

      // Register commands
      if (plugin.commands) {
        for (const command of plugin.commands) {
          commands.register(command);
        }
      }

      // Register event sources
      if (plugin.eventSources) {
        for (const source of plugin.eventSources) {
          eventSources.register(source.name, source);
        }
      }

      // Run setup
      plugin.setup?.(registry);

      installedPlugins.add(plugin.name);
    },

    reset(): void {
      // Note: This creates new instances, doesn't clear existing
      // For a full reset, create a new registry
      installedPlugins.clear();
    },
  };

  return registry;
}

/**
 * Default global registry instance
 */
let defaultRegistry: LokaScriptRegistry | null = null;

/**
 * Get the default registry (creates one if needed)
 */
export function getDefaultRegistry(): LokaScriptRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createRegistry();
  }
  return defaultRegistry;
}

/**
 * Shorthand access to default registries
 *
 * Usage:
 *   import { commands, eventSources } from '@hyperfixi/core/registry';
 *
 *   commands.register('respond', respondCommand);
 *   eventSources.register('request', requestEventSource);
 */
export const commands = {
  /**
   * Register a command in the default registry
   */
  register(command: CommandWithParseInput): void {
    getDefaultRegistry().commands.register(command);
  },

  /**
   * Check if a command is registered
   */
  has(name: string): boolean {
    return getDefaultRegistry().commands.has(name);
  },

  /**
   * Get all registered command names
   */
  names(): string[] {
    return getDefaultRegistry().commands.getCommandNames();
  },
};

export const eventSources = {
  /**
   * Register an event source in the default registry
   */
  register(name: string, source: EventSource): void {
    getDefaultRegistry().eventSources.register(name, source);
  },

  /**
   * Check if an event source is registered
   */
  has(name: string): boolean {
    return getDefaultRegistry().eventSources.has(name);
  },

  /**
   * Get all registered event source names
   */
  names(): string[] {
    return getDefaultRegistry().eventSources.getSourceNames();
  },
};

/**
 * Type-safe plugin builder
 *
 * Usage:
 *   const myPlugin = definePlugin({
 *     name: 'my-server-plugin',
 *     commands: [respondCommand, redirectCommand],
 *     eventSources: [requestEventSource],
 *   });
 */
export function definePlugin(plugin: LokaScriptPlugin): LokaScriptPlugin {
  return plugin;
}

// Re-export runtime integration
export {
  RegistryIntegration,
  createRegistryIntegration,
  getDefaultRegistryIntegration,
  resetDefaultRegistryIntegration,
  type RegistryIntegrationOptions,
} from './runtime-integration';
