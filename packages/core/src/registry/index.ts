/**
 * HyperFixi Registry System
 *
 * Unified extensibility API for commands, event sources, and context providers.
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
 *   // Register context providers
 *   registry.context.register('request', () => currentRequest);
 *   registry.context.register('response', () => responseBuilder);
 *
 * Server-side Example:
 *   // In Express middleware
 *   app.use((req, res, next) => {
 *     registry.context.register('request', () => req);
 *     registry.context.register('response', () => res);
 *     next();
 *   });
 *
 *   // Hyperscript can now use:
 *   // on request(GET, /api/users) respond with <json> users </json>
 */

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

export {
  ContextProviderRegistry,
  createContextProviderRegistry,
  getDefaultContextProviderRegistry,
  type ContextProvider,
  type ContextProviderFn,
  type ContextProviderOptions,
  meProvider,
  itProvider,
  youProvider,
  eventProvider,
} from './context-provider-registry';

// Re-export command registry from existing location
export {
  CommandRegistryV2,
  CommandAdapterV2,
  createCommandRegistryV2,
  type CommandWithParseInput,
  type RuntimeCommand,
} from '../runtime/command-adapter';

import { CommandRegistryV2 } from '../runtime/command-adapter';
import { EventSourceRegistry, createEventSourceRegistry } from './event-source-registry';
import {
  ContextProviderRegistry,
  createContextProviderRegistry,
} from './context-provider-registry';
import type { CommandWithParseInput } from '../runtime/command-adapter';
import type { EventSource } from './event-source-registry';
import type { ContextProviderFn, ContextProviderOptions } from './context-provider-registry';

/**
 * Unified registry interface
 *
 * Provides a single point of access to all extension registries:
 * - commands: Register custom hyperscript commands
 * - eventSources: Register custom event sources (request, websocket, etc.)
 * - context: Register dynamic context providers
 */
export interface HyperFixiRegistry {
  /** Command registry for registering custom commands */
  readonly commands: CommandRegistryV2;

  /** Event source registry for custom event sources */
  readonly eventSources: EventSourceRegistry;

  /** Context provider registry for dynamic context values */
  readonly context: ContextProviderRegistry;

  /**
   * Register a plugin that can add commands, event sources, and context providers
   */
  use(plugin: HyperFixiPlugin): void;

  /**
   * Reset all registries to default state
   */
  reset(): void;
}

/**
 * Plugin interface for bundled extensions
 *
 * Plugins can register multiple commands, event sources, and context providers
 * in a single installation.
 */
export interface HyperFixiPlugin {
  /** Plugin name */
  name: string;

  /** Plugin version */
  version?: string;

  /** Commands to register */
  commands?: CommandWithParseInput[];

  /** Event sources to register */
  eventSources?: EventSource[];

  /** Context providers to register */
  contextProviders?: Array<{
    name: string;
    provide: ContextProviderFn;
    options?: ContextProviderOptions;
  }>;

  /**
   * Optional setup function called when plugin is installed
   */
  setup?(registry: HyperFixiRegistry): void | Promise<void>;

  /**
   * Optional teardown function called when plugin is uninstalled
   */
  teardown?(registry: HyperFixiRegistry): void | Promise<void>;
}

/**
 * Create a unified registry
 */
export function createRegistry(options?: {
  commands?: CommandRegistryV2;
  eventSources?: EventSourceRegistry;
  context?: ContextProviderRegistry;
}): HyperFixiRegistry {
  const commands = options?.commands ?? new CommandRegistryV2();
  const eventSources = options?.eventSources ?? createEventSourceRegistry();
  const context = options?.context ?? createContextProviderRegistry();

  const installedPlugins = new Set<string>();

  const registry: HyperFixiRegistry = {
    commands,
    eventSources,
    context,

    use(plugin: HyperFixiPlugin): void {
      if (installedPlugins.has(plugin.name)) {
        console.warn(`[HyperFixiRegistry] Plugin '${plugin.name}' is already installed`);
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

      // Register context providers
      if (plugin.contextProviders) {
        for (const { name, provide, options } of plugin.contextProviders) {
          context.register(name, provide, options);
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
let defaultRegistry: HyperFixiRegistry | null = null;

/**
 * Get the default registry (creates one if needed)
 */
export function getDefaultRegistry(): HyperFixiRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createRegistry();
  }
  return defaultRegistry;
}

/**
 * Shorthand access to default registries
 *
 * Usage:
 *   import { commands, eventSources, context } from '@hyperfixi/core/registry';
 *
 *   commands.register('respond', respondCommand);
 *   eventSources.register('request', requestEventSource);
 *   context.register('request', () => currentRequest);
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

export const context = {
  /**
   * Register a context provider in the default registry
   */
  register<T>(
    name: string,
    provide: ContextProviderFn<T>,
    options?: ContextProviderOptions<T>
  ): void {
    getDefaultRegistry().context.register(name, provide, options);
  },

  /**
   * Check if a context provider is registered
   */
  has(name: string): boolean {
    return getDefaultRegistry().context.has(name);
  },

  /**
   * Get all registered provider names
   */
  names(): string[] {
    return getDefaultRegistry().context.getProviderNames();
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
 *     contextProviders: [
 *       { name: 'request', provide: () => currentRequest },
 *     ],
 *   });
 */
export function definePlugin(plugin: HyperFixiPlugin): HyperFixiPlugin {
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
