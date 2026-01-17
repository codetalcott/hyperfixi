/**
 * Context Provider Registry
 *
 * Enables registration of dynamic context values that are resolved at runtime.
 * This extends the static CoreExecutionContext (me, it, you, event) with custom
 * values like request, response, session, etc.
 *
 * Usage:
 *   context.register('request', () => currentRequest);
 *   context.register('response', () => responseBuilder);
 *   context.register('session', () => getSession());
 *
 * Context providers are:
 *   - Lazily evaluated when accessed
 *   - Scoped to specific execution contexts
 *   - Support both sync and async resolution
 */

import type { ExecutionContext, TypedExecutionContext } from '../types/core';

/**
 * Context provider function signature
 * Can return a value synchronously or a Promise
 */
export type ContextProviderFn<T = unknown> = (context: ExecutionContext) => T | Promise<T>;

/**
 * Context provider definition
 */
export interface ContextProvider<T = unknown> {
  /** Provider name (used as the context key) */
  readonly name: string;

  /** Human-readable description */
  readonly description?: string;

  /** Provider function that returns the context value */
  readonly provide: ContextProviderFn<T>;

  /** Whether this provider's value should be cached per-execution */
  readonly cache?: boolean;

  /** Whether this provider is async */
  readonly async?: boolean;

  /** Dependencies on other providers (for ordering) */
  readonly dependencies?: string[];
}

/**
 * Options for registering a context provider
 */
export interface ContextProviderOptions<T = unknown> {
  /** Human-readable description */
  description?: string;

  /** Whether to cache the value per-execution (default: true) */
  cache?: boolean;

  /** Dependencies on other providers */
  dependencies?: string[];
}

/**
 * Registry for dynamic context providers
 *
 * Example:
 *   const registry = new ContextProviderRegistry();
 *
 *   // Register providers
 *   registry.register('request', () => currentRequest);
 *   registry.register('user', async (ctx) => await getUser(ctx.locals.get('sessionId')));
 *
 *   // Resolve values
 *   const request = await registry.resolve('request', context);
 *   const user = await registry.resolve('user', context);
 *
 *   // Create enhanced context with all providers
 *   const enhanced = await registry.enhance(context);
 *   console.log(enhanced.request, enhanced.user);
 */
export class ContextProviderRegistry {
  private providers = new Map<string, ContextProvider>();
  private globalProviders = new Map<string, ContextProvider>();

  /**
   * Register a context provider
   * @param name Provider name (becomes context property)
   * @param provider Provider function or full provider definition
   * @param options Optional provider options
   */
  register<T>(
    name: string,
    provider: ContextProviderFn<T> | ContextProvider<T>,
    options?: ContextProviderOptions<T>
  ): void {
    const normalizedName = name.toLowerCase();

    const fullProvider: ContextProvider<T> =
      typeof provider === 'function'
        ? {
            name: normalizedName,
            provide: provider,
            cache: options?.cache ?? true,
            description: options?.description,
            dependencies: options?.dependencies,
          }
        : provider;

    this.providers.set(normalizedName, fullProvider as ContextProvider);
  }

  /**
   * Register a global context provider (available in all contexts)
   * @param name Provider name
   * @param provider Provider function or full provider definition
   * @param options Optional provider options
   */
  registerGlobal<T>(
    name: string,
    provider: ContextProviderFn<T> | ContextProvider<T>,
    options?: ContextProviderOptions<T>
  ): void {
    const normalizedName = name.toLowerCase();

    const fullProvider: ContextProvider<T> =
      typeof provider === 'function'
        ? {
            name: normalizedName,
            provide: provider,
            cache: options?.cache ?? true,
            description: options?.description,
            dependencies: options?.dependencies,
          }
        : provider;

    this.globalProviders.set(normalizedName, fullProvider as ContextProvider);
  }

  /**
   * Unregister a context provider
   * @param name Provider name
   */
  unregister(name: string): boolean {
    return this.providers.delete(name.toLowerCase());
  }

  /**
   * Unregister a global context provider
   * @param name Provider name
   */
  unregisterGlobal(name: string): boolean {
    return this.globalProviders.delete(name.toLowerCase());
  }

  /**
   * Get a registered provider
   * @param name Provider name
   */
  get(name: string): ContextProvider | undefined {
    const normalizedName = name.toLowerCase();
    return this.providers.get(normalizedName) ?? this.globalProviders.get(normalizedName);
  }

  /**
   * Check if a provider is registered
   * @param name Provider name
   */
  has(name: string): boolean {
    const normalizedName = name.toLowerCase();
    return this.providers.has(normalizedName) || this.globalProviders.has(normalizedName);
  }

  /**
   * Resolve a context value
   * @param name Provider name
   * @param context Execution context
   * @param cache Optional cache map for this execution
   * @returns Resolved value or undefined if provider not found
   */
  async resolve<T = unknown>(
    name: string,
    context: ExecutionContext,
    cache?: Map<string, unknown>
  ): Promise<T | undefined> {
    const provider = this.get(name);

    if (!provider) {
      return undefined;
    }

    // Check cache
    const cacheKey = `__provider_${provider.name}`;
    if (provider.cache && cache?.has(cacheKey)) {
      return cache.get(cacheKey) as T;
    }

    // Resolve dependencies first
    if (provider.dependencies) {
      for (const dep of provider.dependencies) {
        await this.resolve(dep, context, cache);
      }
    }

    // Resolve value
    const value = await provider.provide(context);

    // Cache if enabled
    if (provider.cache && cache) {
      cache.set(cacheKey, value);
    }

    return value as T;
  }

  /**
   * Resolve a context value synchronously (throws if provider is async)
   * @param name Provider name
   * @param context Execution context
   * @param cache Optional cache map
   */
  resolveSync<T = unknown>(
    name: string,
    context: ExecutionContext,
    cache?: Map<string, unknown>
  ): T | undefined {
    const provider = this.get(name);

    if (!provider) {
      return undefined;
    }

    // Check cache
    const cacheKey = `__provider_${provider.name}`;
    if (provider.cache && cache?.has(cacheKey)) {
      return cache.get(cacheKey) as T;
    }

    // Resolve value
    const value = provider.provide(context);

    // Check if async
    if (value instanceof Promise) {
      throw new Error(
        `Context provider '${name}' is async. Use resolve() instead of resolveSync().`
      );
    }

    // Cache if enabled
    if (provider.cache && cache) {
      cache.set(cacheKey, value);
    }

    return value as T;
  }

  /**
   * Create an enhanced context with all providers as getters
   * @param context Base execution context
   * @returns Proxy with lazy provider resolution
   */
  enhance<T extends ExecutionContext>(context: T): T & Record<string, unknown> {
    const registry = this;
    const cache = new Map<string, unknown>();

    return new Proxy(context, {
      get(target, prop, receiver) {
        // Check if it's a registered provider
        if (typeof prop === 'string') {
          const provider = registry.get(prop);
          if (provider) {
            // Try sync resolution first
            try {
              return registry.resolveSync(prop, target, cache);
            } catch {
              // Return a promise for async providers
              return registry.resolve(prop, target, cache);
            }
          }
        }

        // Fall back to original property
        return Reflect.get(target, prop, receiver);
      },

      has(target, prop) {
        if (typeof prop === 'string' && registry.has(prop)) {
          return true;
        }
        return Reflect.has(target, prop);
      },
    }) as T & Record<string, unknown>;
  }

  /**
   * Pre-resolve all providers and return values as a plain object
   * @param context Execution context
   * @returns Object with all resolved provider values
   */
  async resolveAll(context: ExecutionContext): Promise<Record<string, unknown>> {
    const cache = new Map<string, unknown>();
    const result: Record<string, unknown> = {};

    // Resolve all providers (respecting dependencies)
    const allProviders = [...this.globalProviders.entries(), ...this.providers.entries()];

    for (const [name, provider] of allProviders) {
      try {
        result[name] = await this.resolve(name, context, cache);
      } catch (error) {
        console.warn(`[ContextProviderRegistry] Failed to resolve '${name}':`, error);
        result[name] = undefined;
      }
    }

    return result;
  }

  /**
   * Get all registered provider names
   */
  getProviderNames(): string[] {
    return [...new Set([...this.globalProviders.keys(), ...this.providers.keys()])];
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear();
    this.globalProviders.clear();
  }
}

/**
 * Factory function for creating context provider registry
 */
export function createContextProviderRegistry(): ContextProviderRegistry {
  return new ContextProviderRegistry();
}

/**
 * Default global context provider registry instance
 */
let defaultRegistry: ContextProviderRegistry | null = null;

/**
 * Get the default context provider registry (creates one if needed)
 */
export function getDefaultContextProviderRegistry(): ContextProviderRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createContextProviderRegistry();
  }
  return defaultRegistry;
}

/**
 * Built-in context provider for 'me' element
 */
export const meProvider: ContextProvider<Element | null> = {
  name: 'me',
  description: 'Current element context',
  provide: ctx => ctx.me,
  cache: false, // me can change during execution
};

/**
 * Built-in context provider for 'it' (last result)
 */
export const itProvider: ContextProvider<unknown> = {
  name: 'it',
  description: 'Result of last expression',
  provide: ctx => ctx.it,
  cache: false, // it changes frequently
};

/**
 * Built-in context provider for 'you' (target element)
 */
export const youProvider: ContextProvider<Element | null> = {
  name: 'you',
  description: 'Target element for operations',
  provide: ctx => ctx.you,
  cache: false,
};

/**
 * Built-in context provider for current event
 */
export const eventProvider: ContextProvider<Event | null | undefined> = {
  name: 'event',
  description: 'Current DOM event',
  provide: ctx => ctx.event,
  cache: false,
};
