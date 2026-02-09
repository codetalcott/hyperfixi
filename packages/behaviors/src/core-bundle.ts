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
import type { LokaScriptInstance, LokaScriptWindow } from './schemas/types';

/**
 * Register all core tier behaviors.
 */
export async function registerCore(hyperfixi?: LokaScriptInstance): Promise<void> {
  await Promise.all([registerDraggable(hyperfixi), registerToggleable(hyperfixi)]);
}

/**
 * Promise that resolves when core behaviors are registered.
 * Set when the package auto-registers in browser environments.
 */
export let ready: Promise<void> | null = null;

// Auto-register when loaded in browser
if (typeof window !== 'undefined' && (window as unknown as LokaScriptWindow).lokascript) {
  ready = registerCore();
  ready.catch(err => {
    console.error('[behaviors] Core auto-registration failed:', err);
  });
}
