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
  LokaScriptInstance,
} from './types';

// Individual schemas
export { draggableSchema } from './draggable.schema';
export { sortableSchema } from './sortable.schema';
export { resizableSchema } from './resizable.schema';
export { removableSchema } from './removable.schema';
export { toggleableSchema } from './toggleable.schema';
export { clipboardSchema } from './clipboard.schema';
export { autoDismissSchema } from './autodismiss.schema';
export { clickOutsideSchema } from './clickoutside.schema';
export { focusTrapSchema } from './focustrap.schema';
export { scrollRevealSchema } from './scrollreveal.schema';
export { tabsSchema } from './tabs.schema';

// All schemas as a collection
import { draggableSchema } from './draggable.schema';
import { sortableSchema } from './sortable.schema';
import { resizableSchema } from './resizable.schema';
import { removableSchema } from './removable.schema';
import { toggleableSchema } from './toggleable.schema';
import { clipboardSchema } from './clipboard.schema';
import { autoDismissSchema } from './autodismiss.schema';
import { clickOutsideSchema } from './clickoutside.schema';
import { focusTrapSchema } from './focustrap.schema';
import { scrollRevealSchema } from './scrollreveal.schema';
import { tabsSchema } from './tabs.schema';
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
  Clipboard: clipboardSchema,
  AutoDismiss: autoDismissSchema,
  ClickOutside: clickOutsideSchema,
  FocusTrap: focusTrapSchema,
  ScrollReveal: scrollRevealSchema,
  Tabs: tabsSchema,
};

/**
 * Get all schema names.
 */
export function getSchemaNames(): string[] {
  return Object.keys(ALL_SCHEMAS);
}

/**
 * Find a schema by name. Returns undefined if not found.
 *
 * Note: For the throwing version, use `getSchema()` from the registry
 * (exported from '@hyperfixi/behaviors').
 */
export function findSchema(name: string): BehaviorSchema | undefined {
  return ALL_SCHEMAS[name];
}
