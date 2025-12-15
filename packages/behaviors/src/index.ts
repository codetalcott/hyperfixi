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
 * @example CDN usage
 * ```html
 * <script src="hyperfixi-browser.js"></script>
 * <script src="@hyperfixi/behaviors/draggable.browser.js"></script>
 * <!-- Draggable is auto-registered -->
 * ```
 */

// Re-export individual behaviors
export {
  draggableSource,
  draggableMetadata,
  registerDraggable,
  default as Draggable,
} from './draggable';

export {
  removableSource,
  removableMetadata,
  registerRemovable,
  default as Removable,
} from './removable';

export {
  toggleableSource,
  toggleableMetadata,
  registerToggleable,
  default as Toggleable,
} from './toggleable';

export {
  sortableSource,
  sortableMetadata,
  registerSortable,
  default as Sortable,
} from './sortable';

export {
  resizableSource,
  resizableMetadata,
  registerResizable,
  default as Resizable,
} from './resizable';

// Behavior registry type
export interface BehaviorModule {
  source: string;
  metadata: {
    name: string;
    version: string;
    description: string;
    parameters?: Array<{
      name: string;
      type: string;
      optional?: boolean;
      default?: string;
      description: string;
    }>;
    events?: Array<{
      name: string;
      description: string;
    }>;
  };
  register: (hyperfixi?: any) => Promise<void>;
}

// Import all behaviors for registerAll
import { registerDraggable } from './draggable';
import { registerRemovable } from './removable';
import { registerToggleable } from './toggleable';
import { registerSortable } from './sortable';
import { registerResizable } from './resizable';

/**
 * All available behaviors and their registration functions.
 */
export const behaviors = {
  Draggable: registerDraggable,
  Removable: registerRemovable,
  Toggleable: registerToggleable,
  Sortable: registerSortable,
  Resizable: registerResizable,
} as const;

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
export async function registerAll(
  hyperfixi?: { compile: (code: string) => any; execute: (ast: any, ctx: any) => Promise<any>; createContext: () => any }
): Promise<void> {
  const registrations = Object.values(behaviors).map(register => register(hyperfixi));
  await Promise.all(registrations);
}

/**
 * Get a list of all available behavior names.
 */
export function getAvailableBehaviors(): string[] {
  return Object.keys(behaviors);
}

// Import metadata for getAllBehaviorMetadata
import { draggableMetadata } from './draggable';
import { removableMetadata } from './removable';
import { toggleableMetadata } from './toggleable';
import { sortableMetadata } from './sortable';
import { resizableMetadata } from './resizable';

/**
 * Get metadata for all behaviors.
 */
export function getAllBehaviorMetadata(): Array<BehaviorModule['metadata']> {
  return [
    draggableMetadata,
    removableMetadata,
    toggleableMetadata,
    sortableMetadata,
    resizableMetadata,
  ];
}

/**
 * Promise that resolves when all behaviors are registered.
 * This is set when the package auto-registers in browser environments.
 */
export let ready: Promise<void> | null = null;

// Auto-register all behaviors when loaded in browser with hyperfixi available
if (typeof window !== 'undefined' && (window as any).hyperfixi) {
  // Register all behaviors and track the promise
  ready = registerAll();
  // Expose on window so attribute processor can wait for it
  (window as any).__hyperfixi_behaviors_ready = ready;
}
