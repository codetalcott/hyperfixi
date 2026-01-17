/**
 * Runtime Integration for Registry System
 *
 * Provides integration layer between the registry system and runtime,
 * enabling automatic context enhancement and custom event source handling.
 *
 * Usage in Runtime:
 *   import { RegistryIntegration } from '../registry/runtime-integration';
 *
 *   // In runtime constructor:
 *   this.registryIntegration = new RegistryIntegration(this);
 *
 *   // When creating execution contexts:
 *   const context = this.registryIntegration.enhanceContext(baseContext);
 *
 *   // When handling 'on' commands:
 *   const eventSource = this.registryIntegration.getEventSource(eventName);
 */

import type { ExecutionContext } from '../types/core';
import type { EventSource, EventSourceSubscribeOptions } from './event-source-registry';
import type { ContextProviderRegistry } from './context-provider-registry';
import type { EventSourceRegistry } from './event-source-registry';
import { getDefaultRegistry } from './index';
import { debug } from '../utils/debug';

/**
 * Options for runtime integration
 */
export interface RegistryIntegrationOptions {
  /** Enable automatic context enhancement (default: true) */
  enableContextProviders?: boolean;

  /** Enable custom event sources (default: true) */
  enableEventSources?: boolean;

  /** Use specific registry instead of default */
  registry?: {
    context?: ContextProviderRegistry;
    eventSources?: EventSourceRegistry;
  };
}

/**
 * Integration layer between registry and runtime
 */
export class RegistryIntegration {
  private options: Required<RegistryIntegrationOptions>;
  private contextRegistry: ContextProviderRegistry;
  private eventSourceRegistry: EventSourceRegistry;
  private contextCache: WeakMap<ExecutionContext, ExecutionContext> = new WeakMap();

  constructor(options: RegistryIntegrationOptions = {}) {
    const defaultRegistry = getDefaultRegistry();

    this.options = {
      enableContextProviders: options.enableContextProviders ?? true,
      enableEventSources: options.enableEventSources ?? true,
      registry: options.registry ?? {},
    };

    this.contextRegistry = this.options.registry.context ?? defaultRegistry.context;
    this.eventSourceRegistry = this.options.registry.eventSources ?? defaultRegistry.eventSources;

    debug.runtime(
      `[RegistryIntegration] Initialized (context=${this.options.enableContextProviders}, events=${this.options.enableEventSources})`
    );
  }

  /**
   * Enhance an execution context with registered context providers
   *
   * Providers are added as lazy getters on the context object, allowing
   * hyperscript code to access them naturally:
   *   set user to request.user
   *   log session.id
   */
  enhanceContext(baseContext: ExecutionContext): ExecutionContext {
    if (!this.options.enableContextProviders) {
      return baseContext;
    }

    // Check cache first
    const cached = this.contextCache.get(baseContext);
    if (cached) {
      return cached;
    }

    try {
      const enhanced = this.contextRegistry.enhance(baseContext);
      this.contextCache.set(baseContext, enhanced);

      debug.runtime(
        `[RegistryIntegration] Enhanced context with ${this.contextRegistry.getProviderNames().length} providers`
      );

      return enhanced;
    } catch (error) {
      debug.runtime(
        `[RegistryIntegration] Failed to enhance context: ${error instanceof Error ? error.message : String(error)}`
      );
      return baseContext;
    }
  }

  /**
   * Get a registered event source by name
   *
   * Returns the event source if registered, or undefined if not found.
   * This allows the runtime to check for custom event sources before
   * falling back to standard DOM events.
   */
  getEventSource(eventName: string): EventSource | undefined {
    if (!this.options.enableEventSources) {
      return undefined;
    }

    // First try exact match
    const source = this.eventSourceRegistry.get(eventName);
    if (source) {
      debug.runtime(`[RegistryIntegration] Found event source for '${eventName}'`);
      return source;
    }

    // Try finding a source that supports this event
    const sourceName = this.eventSourceRegistry.findSourceForEvent(eventName);
    if (sourceName) {
      const foundSource = this.eventSourceRegistry.get(sourceName);
      debug.runtime(
        `[RegistryIntegration] Found event source '${sourceName}' supporting '${eventName}'`
      );
      return foundSource;
    }

    return undefined;
  }

  /**
   * Check if an event is handled by a custom event source
   */
  hasEventSource(eventName: string): boolean {
    return this.getEventSource(eventName) !== undefined;
  }

  /**
   * Subscribe to a custom event source
   *
   * This is called by the runtime when processing 'on' commands that
   * reference a registered event source.
   */
  subscribeToEventSource(
    eventSourceName: string,
    options: EventSourceSubscribeOptions,
    context: ExecutionContext
  ) {
    if (!this.options.enableEventSources) {
      throw new Error('Event sources are disabled in this runtime');
    }

    const subscription = this.eventSourceRegistry.subscribe(eventSourceName, options, context);

    if (!subscription) {
      throw new Error(`Failed to subscribe to event source '${eventSourceName}'`);
    }

    debug.runtime(
      `[RegistryIntegration] Subscribed to '${eventSourceName}' event '${options.event}' (id: ${subscription.id})`
    );

    return subscription;
  }

  /**
   * Get all registered event source names
   */
  getEventSourceNames(): string[] {
    return this.eventSourceRegistry.getSourceNames();
  }

  /**
   * Get all registered context provider names
   */
  getContextProviderNames(): string[] {
    return this.contextRegistry.getProviderNames();
  }

  /**
   * Cleanup: destroy all event sources
   */
  destroy(): void {
    this.eventSourceRegistry.destroy();
    this.contextCache = new WeakMap();
    debug.runtime('[RegistryIntegration] Destroyed');
  }
}

/**
 * Create a registry integration instance
 */
export function createRegistryIntegration(
  options?: RegistryIntegrationOptions
): RegistryIntegration {
  return new RegistryIntegration(options);
}

/**
 * Global default integration instance
 * This can be used by runtimes that don't need custom configuration
 */
let defaultIntegration: RegistryIntegration | null = null;

/**
 * Get the default registry integration (creates one if needed)
 */
export function getDefaultRegistryIntegration(): RegistryIntegration {
  if (!defaultIntegration) {
    defaultIntegration = new RegistryIntegration();
  }
  return defaultIntegration;
}

/**
 * Reset the default integration (useful for testing)
 */
export function resetDefaultRegistryIntegration(): void {
  defaultIntegration = null;
}
