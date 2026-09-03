/**
 * Runtime Integration for Registry System
 *
 * Provides integration layer between the registry system and runtime,
 * enabling custom event source handling. (Its context-provider half — lazy
 * getters spliced onto every execution context — was deleted in Arc 6b.)
 *
 * Usage in Runtime:
 *   import { RegistryIntegration } from '../registry/runtime-integration';
 *
 *   // In runtime constructor:
 *   this.registryIntegration = new RegistryIntegration(this);
 *
 *   // When handling 'on' commands:
 *   const eventSource = this.registryIntegration.getEventSource(eventName);
 */

import type { ExecutionContext } from '../types/core';
import type { EventSource, EventSourceSubscribeOptions } from './event-source-registry';
import type { EventSourceRegistry } from './event-source-registry';
import { getDefaultRegistry } from './index';
import { debug } from '../utils/debug';

/**
 * Options for runtime integration
 */
export interface RegistryIntegrationOptions {
  /** Enable custom event sources (default: true) */
  enableEventSources?: boolean;

  /** Use specific registry instead of default */
  registry?: {
    eventSources?: EventSourceRegistry;
  };
}

/**
 * Integration layer between registry and runtime
 */
export class RegistryIntegration {
  private options: Required<RegistryIntegrationOptions>;
  private eventSourceRegistry: EventSourceRegistry;

  constructor(options: RegistryIntegrationOptions = {}) {
    const defaultRegistry = getDefaultRegistry();

    this.options = {
      enableEventSources: options.enableEventSources ?? true,
      registry: options.registry ?? {},
    };

    this.eventSourceRegistry = this.options.registry.eventSources ?? defaultRegistry.eventSources;

    debug.runtime(`[RegistryIntegration] Initialized (events=${this.options.enableEventSources})`);
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
   * Cleanup: destroy all event sources
   */
  destroy(): void {
    this.eventSourceRegistry.destroy();
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
