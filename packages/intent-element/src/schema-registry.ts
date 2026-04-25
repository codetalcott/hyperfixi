/**
 * Client-side schema registry for <lse-intent>.
 *
 * Schemas registered here are used to validate protocol JSON before execution.
 * Register once per page; the registry is a singleton per module.
 */

import type { CommandSchema } from '@lokascript/intent';

class IntentSchemaRegistry {
  private schemas = new Map<string, CommandSchema>();

  /** Register a command schema. Overwrites any existing schema for the same action. */
  register(schema: CommandSchema): void {
    this.schemas.set(schema.action, schema);
  }

  /** Register multiple schemas at once. */
  registerAll(schemas: CommandSchema[]): void {
    for (const schema of schemas) this.register(schema);
  }

  /** Look up a schema by action name. Returns undefined if not registered. */
  get(action: string): CommandSchema | undefined {
    return this.schemas.get(action);
  }

  /** Check whether a schema is registered for the given action. */
  has(action: string): boolean {
    return this.schemas.has(action);
  }

  /** Remove a schema. */
  unregister(action: string): void {
    this.schemas.delete(action);
  }

  /** Clear all registered schemas. */
  clear(): void {
    this.schemas.clear();
  }

  /** Number of registered schemas. */
  get size(): number {
    return this.schemas.size;
  }

  /**
   * Fetch and register schemas from a JSON endpoint.
   * The endpoint must return an array of CommandSchema objects.
   * Throws if the response is not OK, not an array, or contains malformed schemas.
   */
  async loadFrom(url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to load schemas from ${url}: ${response.status} ${response.statusText}`
      );
    }
    const body: unknown = await response.json();
    if (!Array.isArray(body)) {
      throw new Error(`Expected array of schemas from ${url}, got ${typeof body}`);
    }
    for (let i = 0; i < body.length; i++) {
      const s = body[i] as Record<string, unknown>;
      if (typeof s?.action !== 'string' || !Array.isArray(s?.roles)) {
        throw new Error(
          `Schema at index ${i} from ${url} is missing required fields "action" (string) and "roles" (array)`
        );
      }
    }
    this.registerAll(body as CommandSchema[]);
  }
}

/** Singleton registry — shared across all <lse-intent> elements on the page. */
export const intentRegistry = new IntentSchemaRegistry();
