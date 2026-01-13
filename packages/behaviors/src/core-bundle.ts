/**
 * Core Tier Bundle
 *
 * Includes only core tier behaviors (Draggable, Toggleable).
 * Use this for minimal bundle size when you only need essential behaviors.
 */

export { registerDraggable, draggableSource, draggableMetadata } from './behaviors/draggable';

export { registerToggleable, toggleableSource, toggleableMetadata } from './behaviors/toggleable';

import { registerDraggable } from './behaviors/draggable';
import { registerToggleable } from './behaviors/toggleable';
import type { HyperFixiInstance } from './schemas/types';

/**
 * Register all core tier behaviors.
 */
export async function registerCore(hyperfixi?: HyperFixiInstance): Promise<void> {
  await Promise.all([registerDraggable(hyperfixi), registerToggleable(hyperfixi)]);
}

// Auto-register when loaded in browser
if (typeof window !== 'undefined' && (window as any).hyperfixi) {
  registerCore().catch(console.error);
}
