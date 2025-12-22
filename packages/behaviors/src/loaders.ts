/**
 * Behavior Loaders
 *
 * Registers lazy loaders for all behaviors.
 * Import this module to enable on-demand loading without bundling all behaviors.
 *
 * @example
 * ```typescript
 * // Enable lazy loading
 * import '@hyperfixi/behaviors/loaders';
 *
 * // Now load behaviors on demand
 * import { loadBehavior } from '@hyperfixi/behaviors/registry';
 * await loadBehavior('Draggable');
 * ```
 */

import { registerLoader, registerSchema } from './registry';

// Register schemas for metadata queries before loading
import { draggableSchema } from './schemas/draggable.schema';
import { sortableSchema } from './schemas/sortable.schema';
import { resizableSchema } from './schemas/resizable.schema';
import { removableSchema } from './schemas/removable.schema';
import { toggleableSchema } from './schemas/toggleable.schema';

// Register all schemas
registerSchema(draggableSchema);
registerSchema(sortableSchema);
registerSchema(resizableSchema);
registerSchema(removableSchema);
registerSchema(toggleableSchema);

// Register lazy loaders - behaviors are only loaded when requested
registerLoader('Draggable', () => import('./behaviors/draggable'));
registerLoader('Sortable', () => import('./behaviors/sortable'));
registerLoader('Resizable', () => import('./behaviors/resizable'));
registerLoader('Removable', () => import('./behaviors/removable'));
registerLoader('Toggleable', () => import('./behaviors/toggleable'));
