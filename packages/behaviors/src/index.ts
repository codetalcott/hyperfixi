/**
 * @hyperfixi/behaviors
 *
 * Reusable hyperscript behaviors for HyperFixi.
 * Each behavior can be imported individually for tree-shaking,
 * or all behaviors can be registered at once.
 *
 * @example Individual import (tree-shakeable)
 * ```javascript
 * import { registerDraggable } from '@hyperfixi/behaviors/draggable';
 * await registerDraggable();
 * ```
 *
 * @example Import all
 * ```javascript
 * import { registerAll } from '@hyperfixi/behaviors';
 * await registerAll();
 * ```
 *
 * @example Registry-based lazy loading
 * ```javascript
 * import { loadBehavior, getBehaviorsByCategory } from '@hyperfixi/behaviors';
 * await loadBehavior('Draggable');
 * const uiBehaviors = getBehaviorsByCategory('ui');
 * ```
 *
 * @example CDN usage
 * ```html
 * <script src="hyperfixi-browser.js"></script>
 * <script src="@hyperfixi/behaviors/draggable.browser.js"></script>
 * <!-- Draggable is auto-registered -->
 * ```
 */

// =============================================================================
// Re-export individual behaviors
// =============================================================================

export {
  draggableSource,
  draggableMetadata,
  registerDraggable,
  default as Draggable,
} from './behaviors/draggable';

export {
  removableSource,
  removableMetadata,
  registerRemovable,
  default as Removable,
} from './behaviors/removable';

export {
  toggleableSource,
  toggleableMetadata,
  registerToggleable,
  default as Toggleable,
} from './behaviors/toggleable';

export {
  sortableSource,
  sortableMetadata,
  registerSortable,
  default as Sortable,
} from './behaviors/sortable';

export {
  resizableSource,
  resizableMetadata,
  registerResizable,
  default as Resizable,
} from './behaviors/resizable';

// =============================================================================
// Types
// =============================================================================

export type {
  BehaviorSchema,
  BehaviorCategory,
  BehaviorTier,
  ParameterSchema,
  EventSchema,
  BehaviorModule,
  HyperFixiInstance,
} from './schemas/types';

// =============================================================================
// Initialize registry with loaders (populates schemas and loaders)
// =============================================================================

import './loaders';

// =============================================================================
// Registry exports
// =============================================================================

export {
  // Registration
  registerBehavior,
  registerSchema,
  registerLoader,
  // Query (sync)
  getBehavior,
  tryGetBehavior,
  getSchema,
  tryGetSchema,
  isRegistered,
  hasLoader,
  getRegisteredBehaviors,
  getAvailableBehaviors,
  // Query by metadata
  getBehaviorsByCategory,
  getBehaviorsByTier,
  getAllSchemas,
  getAllSchemasRecord,
  // Lazy loading (async)
  loadBehavior,
  preloadTier,
  preloadCategory,
  loadAll,
  // Runtime registration
  registerWithRuntime,
  registerAllWithRuntime,
} from './registry';

// =============================================================================
// Generated types and metadata
// =============================================================================

export type {
  BehaviorName,
  UIBehavior,
  DataBehavior,
  AnimationBehavior,
  FormBehavior,
  LayoutBehavior,
  CoreBehavior,
  CommonBehavior,
  OptionalBehavior,
} from './generated/types';

export {
  ALL_BEHAVIOR_NAMES,
  BEHAVIORS_BY_CATEGORY,
  BEHAVIORS_BY_TIER,
  BEHAVIOR_CATEGORIES,
  BEHAVIOR_TIERS,
} from './generated/metadata';

// =============================================================================
// Convenience functions
// =============================================================================

import { registerDraggable } from './behaviors/draggable';
import { registerRemovable } from './behaviors/removable';
import { registerToggleable } from './behaviors/toggleable';
import { registerSortable } from './behaviors/sortable';
import { registerResizable } from './behaviors/resizable';
import type { HyperFixiInstance } from './schemas/types';

/**
 * Register all behaviors with HyperFixi.
 *
 * @param hyperfixi - The hyperfixi instance (defaults to window.hyperfixi)
 * @returns Promise that resolves when all behaviors are registered
 *
 * @example
 * ```javascript
 * import { registerAll } from '@hyperfixi/behaviors';
 * await registerAll();
 * ```
 */
export async function registerAll(hyperfixi?: HyperFixiInstance): Promise<void> {
  await Promise.all([
    registerDraggable(hyperfixi),
    registerRemovable(hyperfixi),
    registerToggleable(hyperfixi),
    registerSortable(hyperfixi),
    registerResizable(hyperfixi),
  ]);
}

// =============================================================================
// Auto-registration for browser
// =============================================================================

/**
 * Promise that resolves when all behaviors are registered.
 * This is set when the package auto-registers in browser environments.
 */
export let ready: Promise<void> | null = null;

// Auto-register all behaviors when loaded in browser with hyperfixi available
if (typeof window !== 'undefined' && (window as any).hyperfixi) {
  ready = registerAll();

  (window as any).__hyperfixi_behaviors_ready = ready;

  ready.then(() => {
    const hyperfixi = (window as any).hyperfixi;
    const savedPromise = (window as any).__hyperfixi_behaviors_ready;
    delete (window as any).__hyperfixi_behaviors_ready;

    if (hyperfixi.attributeProcessor?.scanAndProcessAll) {
      hyperfixi.attributeProcessor.scanAndProcessAll().finally(() => {
        (window as any).__hyperfixi_behaviors_ready = savedPromise;
      });
    } else if (hyperfixi.processNode) {
      hyperfixi.processNode(document);
      (window as any).__hyperfixi_behaviors_ready = savedPromise;
    }
  });
}
