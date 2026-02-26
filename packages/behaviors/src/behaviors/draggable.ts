/**
 * Draggable Behavior — Imperative Implementation
 *
 * Makes elements draggable with pointer events.
 * Uses direct DOM APIs instead of compiling hyperscript source,
 * bypassing the complex repeat-until-event + wait-for async pattern.
 *
 * @example
 * ```html
 * <!-- Basic usage -->
 * <div _="install Draggable">Drag me!</div>
 *
 * <!-- With custom drag handle -->
 * <div _="install Draggable(dragHandle: .titlebar)">
 *   <div class="titlebar">Drag here</div>
 *   <div class="content">Content</div>
 * </div>
 * ```
 */

import { draggableSchema } from '../schemas/draggable.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const draggableSource = draggableSchema.source;
export const draggableMetadata = draggableSchema;

/**
 * Imperative installer for Draggable behavior.
 * Called directly by the runtime when `install Draggable` is executed.
 */
function installDraggable(element: HTMLElement, params: Record<string, any>): void {
  // Resolve drag handle: parameter value, CSS selector, or the element itself
  let dragHandle: HTMLElement = element;
  if (params.dragHandle && params.dragHandle !== 'me') {
    if (typeof params.dragHandle === 'string') {
      const found = element.querySelector(params.dragHandle);
      if (found instanceof HTMLElement) dragHandle = found;
    } else if (params.dragHandle instanceof HTMLElement) {
      dragHandle = params.dragHandle;
    }
  }

  dragHandle.addEventListener('pointerdown', (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    element.dispatchEvent(new CustomEvent('draggable:start', { bubbles: true }));

    const startX = element.offsetLeft;
    const startY = element.offsetTop;
    const xoff = e.clientX - startX;
    const yoff = e.clientY - startY;

    function onMove(ev: PointerEvent) {
      element.style.left = `${ev.clientX - xoff}px`;
      element.style.top = `${ev.clientY - yoff}px`;
      element.dispatchEvent(new CustomEvent('draggable:move', { bubbles: true }));
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      element.dispatchEvent(new CustomEvent('draggable:end', { bubbles: true }));
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
}

/**
 * Register the Draggable behavior with LokaScript.
 * Uses imperative installer via synthetic behavior node.
 */
export async function registerDraggable(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  // Register via execute() with a synthetic behavior node containing the imperative installer.
  // The runtime detects imperativeInstaller and stores it directly in the behaviorRegistry.
  const syntheticNode = {
    type: 'behavior',
    name: 'Draggable',
    parameters: ['dragHandle'],
    eventHandlers: [],
    imperativeInstaller: installDraggable,
  };
  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(syntheticNode, ctx);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerDraggable().catch(console.error);
}

export default {
  source: draggableSchema.source,
  metadata: draggableSchema,
  register: registerDraggable,
};
