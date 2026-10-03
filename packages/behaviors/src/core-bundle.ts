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
import type { HyperscriptHost } from './schemas/types';
import { resolveRuntime } from './schemas/types';

/**
 * Define the core tier behaviors on a hyperscript host.
 */
export async function registerCore(host?: HyperscriptHost): Promise<void> {
  await Promise.all([registerDraggable(host), registerToggleable(host)]);
}

/**
 * Resolves when the core behaviors are defined, when the package was loaded as a script tag
 * after the host; `null` otherwise.
 */
export let ready: Promise<void> | null = null;

const _host = resolveRuntime();
if (_host) {
  ready = registerCore(_host).catch(err => {
    console.error('[behaviors] Core auto-definition failed:', err);
  });
}
