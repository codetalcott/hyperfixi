/**
 * Behavior Registry
 *
 * Central registration point for behaviors. Modeled on semantic/registry.ts.
 * Supports lazy loading, category/tier queries, and tree-shaking.
 *
 * @example
 * ```typescript
 * // Register a behavior
 * registerBehavior('Draggable', DraggableModule);
 *
 * // Query behaviors
 * const uiBehaviors = getBehaviorsByCategory('ui');
 * const coreBehaviors = getBehaviorsByTier('core');
 *
 * // Lazy load on demand
 * const module = await loadBehavior('Resizable');
 * ```
 */

import type {
  BehaviorModule,
  BehaviorSchema,
  BehaviorCategory,
  BehaviorTier,
  HyperFixiInstance,
} from './schemas/types';

// =============================================================================
// Registry State
// =============================================================================

const behaviors = new Map<string, BehaviorModule>();
const schemas = new Map<string, BehaviorSchema>();
const loaders = new Map<string, () => Promise<{ default: BehaviorModule }>>();
const loadingPromises = new Map<string, Promise<BehaviorModule>>();

// =============================================================================
// Registration Functions
// =============================================================================

/**
 * Register a behavior module.
 */
export function registerBehavior(name: string, module: BehaviorModule): void {
  behaviors.set(name, module);
  if (module.metadata) {
    schemas.set(name, module.metadata);
  }
}

/**
 * Register a behavior schema (without the module).
 */
export function registerSchema(schema: BehaviorSchema): void {
  schemas.set(schema.name, schema);
}

/**
 * Register a lazy loader for a behavior.
 * The loader should return a module with a default export.
 */
export function registerLoader(
  name: string,
  loader: () => Promise<{ default: BehaviorModule }>
): void {
  loaders.set(name, loader);
}

// =============================================================================
// Query Functions (Sync)
// =============================================================================

/**
 * Get a behavior module by name.
 * @throws Error if behavior is not registered
 */
export function getBehavior(name: string): BehaviorModule {
  const behavior = behaviors.get(name);
  if (!behavior) {
    const registered = Array.from(behaviors.keys()).join(', ');
    throw new Error(
      `Behavior '${name}' is not registered. ` +
        `Registered behaviors: ${registered || 'none'}. ` +
        `Use loadBehavior('${name}') to lazy load it.`
    );
  }
  return behavior;
}

/**
 * Try to get a behavior, returning undefined if not registered.
 */
export function tryGetBehavior(name: string): BehaviorModule | undefined {
  return behaviors.get(name);
}

/**
 * Get a behavior schema by name.
 * @throws Error if schema is not registered
 */
export function getSchema(name: string): BehaviorSchema {
  const schema = schemas.get(name);
  if (!schema) {
    throw new Error(`Schema for behavior '${name}' is not registered.`);
  }
  return schema;
}

/**
 * Try to get a schema, returning undefined if not registered.
 */
export function tryGetSchema(name: string): BehaviorSchema | undefined {
  return schemas.get(name);
}

/**
 * Check if a behavior is registered.
 */
export function isRegistered(name: string): boolean {
  return behaviors.has(name);
}

/**
 * Check if a loader is registered for a behavior.
 */
export function hasLoader(name: string): boolean {
  return loaders.has(name);
}

/**
 * Get all registered behavior names.
 */
export function getRegisteredBehaviors(): string[] {
  return Array.from(behaviors.keys());
}

/**
 * Get all behavior names that have loaders (including unloaded).
 */
export function getAvailableBehaviors(): string[] {
  const names = new Set([...behaviors.keys(), ...loaders.keys()]);
  return Array.from(names);
}

// =============================================================================
// Query by Metadata
// =============================================================================

/**
 * Get behavior names by category.
 */
export function getBehaviorsByCategory(category: BehaviorCategory): string[] {
  const result: string[] = [];
  for (const [name, schema] of schemas) {
    if (schema.category === category) {
      result.push(name);
    }
  }
  return result;
}

/**
 * Get behavior names by tier.
 */
export function getBehaviorsByTier(tier: BehaviorTier): string[] {
  const result: string[] = [];
  for (const [name, schema] of schemas) {
    if (schema.tier === tier) {
      result.push(name);
    }
  }
  return result;
}

/**
 * Get all schemas.
 */
export function getAllSchemas(): BehaviorSchema[] {
  return Array.from(schemas.values());
}

/**
 * Get all schemas as a record.
 */
export function getAllSchemasRecord(): Record<string, BehaviorSchema> {
  const result: Record<string, BehaviorSchema> = {};
  for (const [name, schema] of schemas) {
    result[name] = schema;
  }
  return result;
}

// =============================================================================
// Lazy Loading (Async)
// =============================================================================

/**
 * Load a behavior by name.
 * If already loaded, returns the cached module.
 * If a loader is registered, loads and caches the module.
 */
export async function loadBehavior(name: string): Promise<BehaviorModule> {
  // Return cached if available
  const cached = behaviors.get(name);
  if (cached) {
    return cached;
  }

  // Check for in-flight load
  const inFlight = loadingPromises.get(name);
  if (inFlight) {
    return inFlight;
  }

  // Check for loader
  const loader = loaders.get(name);
  if (!loader) {
    throw new Error(
      `No loader registered for behavior '${name}'. ` +
        `Available loaders: ${Array.from(loaders.keys()).join(', ') || 'none'}`
    );
  }

  // Load and cache
  const promise = loader().then(mod => {
    const module = mod.default;
    registerBehavior(name, module);
    loadingPromises.delete(name);
    return module;
  });

  loadingPromises.set(name, promise);
  return promise;
}

/**
 * Preload all behaviors in a tier.
 */
export async function preloadTier(tier: BehaviorTier): Promise<void> {
  const names = getBehaviorsByTier(tier);
  await Promise.all(names.map(name => loadBehavior(name).catch(() => {})));
}

/**
 * Preload all behaviors in a category.
 */
export async function preloadCategory(category: BehaviorCategory): Promise<void> {
  const names = getBehaviorsByCategory(category);
  await Promise.all(names.map(name => loadBehavior(name).catch(() => {})));
}

/**
 * Load and register all available behaviors.
 */
export async function loadAll(): Promise<void> {
  const names = getAvailableBehaviors();
  await Promise.all(names.map(name => loadBehavior(name).catch(() => {})));
}

// =============================================================================
// Runtime Registration
// =============================================================================

/**
 * Register a behavior with HyperFixi runtime.
 * Compiles and executes the behavior source.
 */
export async function registerWithRuntime(
  name: string,
  hyperfixi?: HyperFixiInstance
): Promise<void> {
  const module = await loadBehavior(name);
  await module.register(hyperfixi);
}

/**
 * Register all loaded behaviors with HyperFixi runtime.
 */
export async function registerAllWithRuntime(hyperfixi?: HyperFixiInstance): Promise<void> {
  const registrations = Array.from(behaviors.values()).map(module => module.register(hyperfixi));
  await Promise.all(registrations);
}
