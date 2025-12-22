/**
 * Behavior Schemas
 *
 * Central export point for all behavior schemas.
 * Used by the registry and code generation.
 */

// Types
export type {
  BehaviorSchema,
  BehaviorCategory,
  BehaviorTier,
  ParameterSchema,
  EventSchema,
  BehaviorModule,
  HyperFixiInstance,
} from './types';

// Individual schemas
export { draggableSchema } from './draggable.schema';
export { sortableSchema } from './sortable.schema';
export { resizableSchema } from './resizable.schema';
export { removableSchema } from './removable.schema';
export { toggleableSchema } from './toggleable.schema';

// All schemas as a collection
import { draggableSchema } from './draggable.schema';
import { sortableSchema } from './sortable.schema';
import { resizableSchema } from './resizable.schema';
import { removableSchema } from './removable.schema';
import { toggleableSchema } from './toggleable.schema';
import type { BehaviorSchema } from './types';

/**
 * All behavior schemas indexed by name.
 */
export const ALL_SCHEMAS: Record<string, BehaviorSchema> = {
  Draggable: draggableSchema,
  Sortable: sortableSchema,
  Resizable: resizableSchema,
  Removable: removableSchema,
  Toggleable: toggleableSchema,
};

/**
 * Get all schema names.
 */
export function getSchemaNames(): string[] {
  return Object.keys(ALL_SCHEMAS);
}

/**
 * Get a schema by name.
 */
export function getSchema(name: string): BehaviorSchema | undefined {
  return ALL_SCHEMAS[name];
}
