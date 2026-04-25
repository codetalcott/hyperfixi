/**
 * Sortable Behavior — Imperative Implementation
 *
 * Drag-and-drop reordering of list items.
 * Apply to a container element; children become sortable.
 *
 * Note: This behavior fires lifecycle events but does NOT automatically
 * reorder DOM elements. Users must handle actual reordering in their
 * `sortable:move` event handlers.
 *
 * @example
 * ```html
 * <ul _="install Sortable">
 *   <li>Item 1</li>
 *   <li>Item 2</li>
 * </ul>
 * ```
 */

import { sortableSchema } from '../schemas/sortable.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const sortableSource = sortableSchema.source;
export const sortableMetadata = sortableSchema;

/**
 * Imperative installer for Sortable behavior.
 */
function installSortable(element: HTMLElement, params: Record<string, any>): void {
  const dragClass = params.dragClass || 'sorting';
  const handleSelector = params.handle || null;

  element.addEventListener('pointerdown', (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    const item = target.closest('li');
    if (!item || !element.contains(item)) return;

    // If a handle selector is specified, only start drag from the handle
    if (handleSelector) {
      const handleEl = target.closest(handleSelector);
      if (!handleEl) return;
    }

    e.preventDefault();
    item.classList.add(dragClass);
    element.dispatchEvent(new CustomEvent('sortable:start', { bubbles: true, detail: { item } }));

    function onMove(ev: PointerEvent) {
      element.dispatchEvent(
        new CustomEvent('sortable:move', {
          bubbles: true,
          detail: { clientY: ev.clientY, item },
        })
      );
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      item!.classList.remove(dragClass);
      element.dispatchEvent(new CustomEvent('sortable:end', { bubbles: true, detail: { item } }));
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
}

/**
 * Register the Sortable behavior with LokaScript.
 */
export async function registerSortable(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const syntheticNode = {
    type: 'behavior',
    name: 'Sortable',
    parameters: ['dragClass'],
    eventHandlers: [],
    imperativeInstaller: installSortable,
  };
  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(syntheticNode, ctx);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerSortable().catch(console.error);
}

export default {
  source: sortableSchema.source,
  metadata: sortableSchema,
  register: registerSortable,
};
